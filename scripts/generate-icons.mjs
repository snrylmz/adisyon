import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const svg = readFileSync(resolve(root, 'public/icons/source.svg'), 'utf8')

const sizes = [192, 512]
const outDir = resolve(root, 'public/icons')
mkdirSync(outDir, { recursive: true })

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  })
  const pngData = resvg.render().asPng()
  const file = resolve(outDir, `icon-${size}.png`)
  writeFileSync(file, pngData)
  console.log(`✓ ${file} (${size}×${size})`)
}

// Apple touch icon (180×180 PNG, recommended)
{
  const size = 180
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  })
  const png = resvg.render().asPng()
  writeFileSync(resolve(outDir, 'apple-touch-icon.png'), png)
  console.log(`✓ apple-touch-icon.png (${size}×${size})`)
}

// Favicon (32×32 PNG)
{
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 32 },
    background: 'rgba(0,0,0,0)',
  })
  const png = resvg.render().asPng()
  writeFileSync(resolve(root, 'public/favicon.png'), png)
  console.log(`✓ favicon.png (32×32)`)
}
