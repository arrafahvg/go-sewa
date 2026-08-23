import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Storage provider interface.
 * This abstraction allows us to swap between local storage and cloud storage (e.g., Supabase, S3)
 * without changing the calling code.
 */
export interface StorageProvider {
  /**
   * Upload a file and return its public URL (or path) and storage-specific metadata.
   * @param fileBuffer - The file data as a Buffer
   * @param options - Upload options (filename, mime type, etc.)
   * @returns Promise resolving to an object containing the file's URL/path and any storage metadata
   */
  uploadFile(fileBuffer: Buffer, options: {
    originalName?: string;
    mimeType?: string;
    folder?: string;
  }): Promise<{
    url: string; // Publicly accessible URL or path
    path: string; // Storage-specific path/key
    metadata?: Record<string, any>;
  }>;

  /**
   * Get the public URL for a file given its storage path/key.
   * @param path - The storage path/key returned from uploadFile
   * @returns Promise resolving to the public URL
   */
  getFileUrl(path: string): Promise<string>;

  /**
   * Delete a file from storage.
   * @param path - The storage path/key returned from uploadFile
   * @returns Promise resolving when deletion is complete
   */
  deleteFile(path: string): Promise<void>;
}

/**
 * Local storage adapter.
 * Stores files in the public/uploads directory and serves them via Next.js static file serving.
 * 
 * MARK: Integration point for cloud storage
 * To switch to a cloud provider (e.g., Supabase Storage, AWS S3):
 * 1. Implement a new class that satisfies the StorageProvider interface
 * 2. Update the getStorageProvider function below to return an instance of that class
 * 3. Ensure the cloud provider's bucket is publicly accessible or returns signed URLs as needed
 */
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath: string = 'public/uploads', baseUrl: string = '/uploads') {
    this.basePath = basePath;
    this.baseUrl = baseUrl;
    // Ensure the upload directory exists
    this.init().catch(console.error);
  }

  private async init() {
    try {
      await mkdir(this.basePath, { recursive: true });
    } catch (err) {
      // Ignore if directory already exists
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }
  }

  /**
   * Generate a unique filename to avoid collisions.
   * Preserves the original file extension.
   */
  private generateFileName(originalName: string = 'upload'): string {
    const timestamp = Date.now();
    const randomId = randomUUID();
    const ext = originalName.includes('.') ? `.${originalName.split('.').pop()}` : '';
    return `${timestamp}-${randomId}${ext}`;
  }

  async uploadFile(fileBuffer: Buffer, options: {
    originalName?: string;
    mimeType?: string;
    folder?: string;
  }): Promise<{
    url: string;
    path: string;
    metadata?: Record<string, any>;
  }> {
    const fileName = this.generateFileName(options.originalName);
    const folderPath = options.folder ? `/${options.folder}` : '';
    const relativePath = join(folderPath, fileName);
    const absolutePath = join(this.basePath, relativePath);

    // Ensure the subdirectory exists
    const dir = absolutePath.replace(/[\\/][^\\/]+$/, '');
    await mkdir(dir, { recursive: true });

    // Write the file
    await writeFile(absolutePath, fileBuffer);

    // Construct the public URL
    const urlPath = `${this.baseUrl}${folderPath}/${fileName}`.replace(/\\/g, '/');

    return {
      url: urlPath,
      path: relativePath, // Store the relative path for deletion/retrieval
      metadata: {
        originalName: options.originalName,
        mimeType: options.mimeType,
        size: fileBuffer.length,
        uploadedAt: new Date().toISOString(),
      },
    };
  }

  async getFilePath(path: string): Promise<string> {
    // For local storage, the path is relative to basePath
    return join(this.basePath, path);
  }

  async getFileUrl(path: string): Promise<string> {
    // Convert the storage path to a public URL
    // Ensure forward slashes for URL
    const urlPath = `${this.baseUrl}/${path}`.replace(/\\/g, '/').replace(/^\/+\//, '/');
    return urlPath;
  }

  async deleteFile(path: string): Promise<void> {
    const absolutePath = join(this.basePath, path);
    try {
      await unlink(absolutePath);
    } catch (err) {
      // Ignore if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}


/**
 * Supabase Storage adapter (public bucket).
 *
 * Used automatically when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 * The bucket must exist and be PUBLIC so uploaded URLs are directly renderable;
 * create it once in the Supabase dashboard or via SQL:
 *   insert into storage.buckets (id, name, public) values ('product-assets', 'product-assets', true);
 * Configure via SUPABASE_PUBLIC_BUCKET (default: 'product-assets').
 *
 * Note: this is intentionally separate from the PRIVATE identity-document bucket
 * handled in lib/services/documents.ts - collateral photos must never be public.
 */
export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor(url: string, serviceKey: string, bucket: string = 'product-assets') {
    this.client = createClient(url, serviceKey, { auth: { persistSession: false } });
    this.bucket = bucket;
  }

  async uploadFile(fileBuffer: Buffer, options: {
    originalName?: string;
    mimeType?: string;
    folder?: string;
  }): Promise<{ url: string; path: string; metadata?: Record<string, any> }> {
    const ext = options.originalName && options.originalName.includes('.') ? '.' + options.originalName.split('.').pop() : '';
    const fileName = Date.now() + '-' + randomUUID() + ext;
    const path = options.folder ? options.folder + '/' + fileName : fileName;
    const { error } = await this.client.storage.from(this.bucket).upload(path, fileBuffer, {
      contentType: options.mimeType ?? 'application/octet-stream',
      upsert: false,
    });
    if (error) throw new Error('File upload failed: ' + error.message);
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return {
      url: data.publicUrl,
      path,
      metadata: {
        originalName: options.originalName,
        mimeType: options.mimeType,
        size: fileBuffer.length,
        uploadedAt: new Date().toISOString(),
        bucket: this.bucket,
      },
    };
  }

  async getFileUrl(path: string): Promise<string> {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) throw new Error('File deletion failed: ' + error.message);
  }
}
/**
 * Factory function to get the current storage provider.
 * In the future, this can be configured via environment variables or settings.
 * 
 * MARK: Configuration point for cloud storage
 * To use a cloud storage provider:
 * 1. Set an environment variable (e.g., STORAGE_PROVIDER=supabase)
 * 2. Modify this function to return the appropriate provider instance
 * 3. Ensure required configuration (bucket name, credentials, etc.) is available
 */
export function getStorageProvider(): StorageProvider {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    return new SupabaseStorageProvider(url, key, process.env.SUPABASE_PUBLIC_BUCKET ?? 'product-assets');
  }
  // Fallback for local development without cloud credentials.
  return new LocalStorageProvider();
}

// Export a default instance for convenience (can be replaced with DI pattern later)
export const storageProvider = getStorageProvider();