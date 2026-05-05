import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

fs.mkdirSync(path.join(__dirname, '../icons'), { recursive: true })

async function icon(size) {
  const r = Math.round(size * 0.15)
  const fs2 = Math.round(size * 0.4)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#2563eb" rx="${r}"/>
    <text x="50%" y="55%" font-family="system-ui,sans-serif" font-size="${fs2}" font-weight="bold"
      fill="white" text-anchor="middle" dominant-baseline="middle">PJ</text>
  </svg>`
  await sharp(Buffer.from(svg)).resize(size).png()
    .toFile(path.join(__dirname, `../icons/icon-${size}.png`))
}

Promise.all([icon(192), icon(512)]).then(() => console.log('Icons generated in icons/'))
