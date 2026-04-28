/**
 * Render every PNG icon variant from the canonical app/icon.svg so the
 * favicon, browser tab icon, PWA install icons and Apple touch icon all
 * match Buddy.
 *
 * Run with:  npx tsx scripts/generate-icons.ts
 *
 * Outputs (all under /public):
 *   - icon-192.png             (192 × 192, plain)
 *   - icon-512.png             (512 × 512, plain)
 *   - icon-maskable-192.png    (192 × 192, full-bleed safe area)
 *   - icon-maskable-512.png    (512 × 512, full-bleed safe area)
 *   - apple-touch-icon.png     (180 × 180)
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(__dirname, "..");
const SVG_PATH = path.join(ROOT, "app", "icon.svg");
const OUT_DIR = path.join(ROOT, "public");

interface Variant {
  name: string;
  size: number;
  /** When true, render the SVG inset on a solid arcade background so the
   * platform's circular/rounded mask never crops Buddy's body. */
  maskable?: boolean;
}

const VARIANTS: Variant[] = [
  { name: "icon-192.png",          size: 192 },
  { name: "icon-512.png",          size: 512 },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png",  size: 180 },
];

const ARCADE_BG = "#291b4d"; // matches manifest.json background_color
// Maskable safe area: ~80% of the canvas. Reserve the outer 10% so icons
// look right when Android crops them to a circle / squircle.
const MASKABLE_INNER = 0.8;

async function render(svg: Buffer, variant: Variant): Promise<Buffer> {
  if (!variant.maskable) {
    return sharp(svg, { density: 384 })
      .resize(variant.size, variant.size, { fit: "contain" })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  const inner = Math.round(variant.size * MASKABLE_INNER);
  const innerSvg = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: "contain" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: variant.size,
      height: variant.size,
      channels: 4,
      background: ARCADE_BG,
    },
  })
    .composite([
      {
        input: innerSvg,
        gravity: "center",
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const svg = await fs.readFile(SVG_PATH);
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const variant of VARIANTS) {
    const out = await render(svg, variant);
    const outPath = path.join(OUT_DIR, variant.name);
    await fs.writeFile(outPath, out);
    console.log(
      `  ${variant.name.padEnd(28)} ${variant.size}×${variant.size}  ${out.length.toLocaleString()} bytes`,
    );
  }
}

main().catch((err) => {
  console.error("generate-icons failed:", err);
  process.exit(1);
});
