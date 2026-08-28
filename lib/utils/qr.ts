import QRCode from 'qrcode'

/**
 * Render text as a QR code data URL (PNG). Pure JS — works in server components
 * with no canvas. Used for printable per-device asset labels (§40).
 */
export async function toQrDataUrl(text: string, size = 220): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    width: size,
    margin: 1,
  })
}
