#!/usr/bin/env node
// Shoots the still the demo homepage's hero shows wherever its live three.js scene does not run
// (reduced motion, save-data, no WebGL2, or a scene that failed): the assembled Kestrel C on the
// stage. The picture is taken from the scene itself, so the still can never disagree with it.
//
//   npm run hero:poster
//
// Writes two files, one per framing the hero has:
//   public/media/hero-poster.webp       2400 x 1080, the side-by-side layout (from `lg` up)
//   public/media/hero-poster-960.webp   960 x 720, the stacked 4:3 block (below `lg`)
//
// How: loads /demo with the scene forced on (`?fx=force`), started assembled with the clock
// frozen (`?scene=assembled&scene-t=1`, the switches `HomeHero.tsx` reads), waits for the
// preloader to leave, hides everything marked `data-hero-chrome` (the copy, the shade, the drag
// hint) and screenshots the stage element. The shade is not baked in: the page lays it over the
// still exactly as it lays it over the canvas.
//
// Starts its own Vite dev server on a free port and stops it again, success or failure. Needs a
// GPU-backed Chromium (the flags below ask for one; on a machine with none it falls back to
// software rendering and takes minutes) and ffmpeg on PATH for PNG to WebP. Not part of the
// test suite. Re-run it after changing the scene, a model it shows, or the hero's layout: the
// stills are files, they do not update themselves.
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT_DIR = path.join(ROOT, 'public', 'media')

// The Navbar is 57px tall (56 plus its hairline), and from `lg` up the hero is one screen less
// 56px, so a 1136px viewport gives a 1080px stage. Below `lg` the stage is 4:3 of the width,
// capped at 64dvh: 1200 leaves room for the full 720.
//
// The wide shot is wider than 16:9 on purpose. The live scene answers a wider window by showing
// more wall either side; a picture can only be cropped (`object-cover`). Shot at 2400 x 1080, an
// ultra-wide window still gets the whole floor and the kit on it, and a 16:9 one crops wall off
// the sides, where there is nothing to lose. `HomeHero.tsx` centres the crop (`object-[50%_60%]`),
// which leaves the stage where the live scene has it at 16:9.
const SHOTS = [
  { file: 'hero-poster.webp', viewport: { width: 2400, height: 1136 } },
  { file: 'hero-poster-960.webp', viewport: { width: 960, height: 1200 } },
]
const URL_SWITCHES = '/demo?fx=force&scene=assembled&scene-t=1'

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function shoot(browser, baseURL, shot, tmp) {
  const page = await browser.newPage({ baseURL, viewport: shot.viewport, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', message => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(URL_SWITCHES, { waitUntil: 'load' })
    // `data-hero="still"` here means the scene did not start (no WebGL2 in this browser), and a
    // screenshot of it would be a poster of the poster.
    await page.locator('[data-hero="live"]').waitFor({ timeout: 30_000 })
    await page.locator('[data-loader]').first().waitFor({ state: 'attached', timeout: 30_000 })
    await page.locator('[data-loader]').waitFor({ state: 'detached', timeout: 180_000 })
    if (errors.length > 0) throw new Error(`the page logged errors:\n  ${errors.join('\n  ')}`)
    await page.addStyleTag({ content: '[data-hero-chrome] { visibility: hidden !important; }' })
    await page.waitForTimeout(500)
    const png = path.join(tmp, shot.file.replace(/\.webp$/, '.png'))
    await page.locator('[data-hero-stage]').screenshot({ path: png })
    const out = path.join(OUT_DIR, shot.file)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '80', out])
    console.log(`${path.relative(ROOT, out)}  ${Math.round(statSync(out).size / 1024)} kB`)
  } finally {
    await page.close()
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'hero-poster-'))
  const port = await getFreePort()
  const server = await createServer({
    root: ROOT,
    logLevel: 'error',
    server: { port, strictPort: true, host: '127.0.0.1', hmr: false },
  })
  await server.listen()
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  })
  try {
    for (const shot of SHOTS) await shoot(browser, `http://127.0.0.1:${port}`, shot, tmp)
  } finally {
    await browser.close()
    await server.close()
    rmSync(tmp, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
