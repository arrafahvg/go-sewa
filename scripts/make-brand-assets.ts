import 'dotenv/config'
import sharp from 'sharp'
import path from 'path'

const SRC = 'C:\\Users\\user\\Downloads\\GoSewa_Premium_Logo.svg.png'
const PUB = 'C:\\Users\\user\\Desktop\\GO-SEWA\\public'

/** Turn near-black background pixels transparent (logo art is dark green/orange/white). */
function knockOutBlack(buf: Buffer): Promise<ReturnType<typeof sharp>> {
  return sharp(buf).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const { width, height, channels } = info
    for (let i = 0; i < width * height; i++) {
      const o = i * channels
      const [r, g, b] = [data[o], data[o + 1], data[o + 2]]
      if (r < 22 && g < 22 && b < 22) data[o + 3] = 0
      else if (r < 45 && g < 45 && b < 45) data[o + 3] = Math.round(255 * (1 - (45 - Math.max(r, g, b)) / 23))
    }
    return sharp(data, { raw: { width, height, channels: 4 } })
  })
}

async function main() {
  const meta = await sharp(SRC).metadata()
  console.log('source:', meta.width, 'x', meta.height)
  await sharp(SRC).png().toFile(path.join(PUB, 'logo.png'))

  // Emblem occupies roughly the upper-left 2/3 of the poster; crop, de-black, trim.
  const emblem = await knockOutBlack(
    await sharp(SRC)
      .extract({ left: Math.round((meta.width ?? 1600) * 0.18), top: Math.round((meta.height ?? 1600) * 0.1), width: Math.round((meta.width ?? 1600) * 0.5), height: Math.round((meta.height ?? 1600) * 0.525) })
      .png().toBuffer(),
  )
  const trimmed = await emblem.trim({ threshold: 10 }).png().toBuffer()

  await sharp(trimmed).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(PUB, 'logo-mark.png'))
  await sharp(trimmed).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(PUB, 'favicon.png'))
  await sharp(trimmed).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(PUB, 'apple-icon.png'))
  await sharp(trimmed).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(PUB, 'favicon-64.png'))
  await sharp(trimmed).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(PUB, 'favicon-32.png'))
  console.log('✅ assets generated')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
