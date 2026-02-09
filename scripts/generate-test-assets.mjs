/**
 * Generate synthetic test splash images for golden-file tests.
 * Each image has colored squares on a white background at known positions.
 */
import { PNG } from 'pngjs'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'test-assets')
mkdirSync(outDir, { recursive: true })

function createImage(width, height, icons) {
  const png = new PNG({ width, height })

  // Fill with white background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      png.data[idx] = 255     // R
      png.data[idx + 1] = 255 // G
      png.data[idx + 2] = 255 // B
      png.data[idx + 3] = 255 // A
    }
  }

  // Draw icons as solid colored rectangles
  for (const icon of icons) {
    for (let y = icon.y; y < icon.y + icon.h && y < height; y++) {
      for (let x = icon.x; x < icon.x + icon.w && x < width; x++) {
        const idx = (y * width + x) * 4
        png.data[idx] = icon.r
        png.data[idx + 1] = icon.g
        png.data[idx + 2] = icon.b
        png.data[idx + 3] = 255
      }
    }
  }

  return PNG.sync.write(png)
}

// splash-01.png: 6 icons in a 3x2 grid on white background (400x300)
// Row 1: y=20, icons at x=20, x=150, x=280
// Row 2: y=160, icons at x=20, x=150, x=280
// Each icon is 100x100
const splash01Icons = [
  { x: 20, y: 20, w: 100, h: 100, r: 255, g: 0, b: 0 },     // red
  { x: 150, y: 20, w: 100, h: 100, r: 0, g: 128, b: 0 },    // green
  { x: 280, y: 20, w: 100, h: 100, r: 0, g: 0, b: 255 },    // blue
  { x: 20, y: 160, w: 100, h: 100, r: 255, g: 165, b: 0 },  // orange
  { x: 150, y: 160, w: 100, h: 100, r: 128, g: 0, b: 128 }, // purple
  { x: 280, y: 160, w: 100, h: 100, r: 0, g: 128, b: 128 }, // teal
]
writeFileSync(
  join(outDir, 'splash-01.png'),
  createImage(400, 300, splash01Icons)
)
console.log('Created splash-01.png (400x300, 6 icons in 3x2 grid)')

// splash-02.png: 4 icons, different sizes, light gray background (500x400)
function createImageGrayBg(width, height, bgGray, icons) {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      png.data[idx] = bgGray
      png.data[idx + 1] = bgGray
      png.data[idx + 2] = bgGray
      png.data[idx + 3] = 255
    }
  }
  for (const icon of icons) {
    for (let y = icon.y; y < icon.y + icon.h && y < height; y++) {
      for (let x = icon.x; x < icon.x + icon.w && x < width; x++) {
        const idx = (y * width + x) * 4
        png.data[idx] = icon.r
        png.data[idx + 1] = icon.g
        png.data[idx + 2] = icon.b
        png.data[idx + 3] = 255
      }
    }
  }
  return PNG.sync.write(png)
}

const splash02Icons = [
  { x: 30, y: 30, w: 80, h: 80, r: 50, g: 50, b: 50 },      // dark gray
  { x: 200, y: 30, w: 120, h: 120, r: 20, g: 80, b: 180 },   // steel blue
  { x: 30, y: 200, w: 150, h: 150, r: 180, g: 20, b: 60 },   // crimson
  { x: 300, y: 200, w: 100, h: 100, r: 40, g: 150, b: 40 },  // forest green
]
writeFileSync(
  join(outDir, 'splash-02.png'),
  createImageGrayBg(500, 400, 230, splash02Icons)
)
console.log('Created splash-02.png (500x400, 4 icons, light gray bg)')

// splash-03.png: 9 icons in 3x3 grid, tightly packed, white bg (300x300)
// Each icon 60x60 with 30px spacing
const splash03Icons = []
const colors03 = [
  [200, 0, 0], [0, 200, 0], [0, 0, 200],
  [200, 200, 0], [200, 0, 200], [0, 200, 200],
  [100, 50, 0], [0, 100, 50], [50, 0, 100],
]
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    const [r, g, b] = colors03[row * 3 + col]
    splash03Icons.push({
      x: 20 + col * 90,
      y: 20 + row * 90,
      w: 60,
      h: 60,
      r, g, b,
    })
  }
}
writeFileSync(
  join(outDir, 'splash-03.png'),
  createImage(300, 300, splash03Icons)
)
console.log('Created splash-03.png (300x300, 9 icons in 3x3 grid)')

// Also copy splash-01.png to e2e fixtures for E2E detection tests
const fixturesDir = join(__dirname, '..', 'e2e', 'fixtures')
mkdirSync(fixturesDir, { recursive: true })
writeFileSync(
  join(fixturesDir, 'splash-01.png'),
  createImage(400, 300, splash01Icons)
)
console.log('Copied splash-01.png to e2e/fixtures/')

console.log('\nDone. Test assets generated.')
