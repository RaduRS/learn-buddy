import "dotenv/config";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { STORY_THEMES } from "../lib/games/storyTime";

/**
 * One-off: generate a tile illustration for each Story Time theme via Replicate
 * flux-schnell and save it to public/story-themes/<id>.png. The PNGs are
 * committed and reused forever, so this only needs to run when themes change.
 *
 * Run: npx tsx scripts/generate-theme-images.ts        (skips existing files)
 *      npx tsx scripts/generate-theme-images.ts --force (regenerates all)
 */

const OUT_DIR = path.join(process.cwd(), "public", "story-themes");
const FORCE = process.argv.includes("--force");

const isTerminal = (s?: string) =>
  s === "succeeded" || s === "failed" || s === "canceled";

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function generateOne(
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const res = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: "1:1",
          num_outputs: 1,
          output_format: "png",
          output_quality: 90,
          num_inference_steps: 4,
        },
      }),
    },
  );

  if (!res.ok) {
    console.error("  Replicate error:", res.status, await res.text());
    return null;
  }

  // Prefer: wait may return before the prediction finishes — poll to completion.
  let data = await res.json();
  const pollUrl: string | undefined = data?.urls?.get;
  const deadline = Date.now() + 90_000;
  while (pollUrl && !isTerminal(data?.status)) {
    if (Date.now() > deadline) {
      console.error("  Timed out waiting for prediction");
      return null;
    }
    await new Promise((r) => setTimeout(r, 1200));
    const poll = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!poll.ok) break;
    data = await poll.json();
  }

  if (data?.status !== "succeeded") {
    console.error("  Prediction did not succeed:", data?.status, data?.error);
    return null;
  }

  const url: string | undefined = Array.isArray(data?.output)
    ? data.output[0]
    : data?.output;
  return url ?? null;
}

async function main() {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    console.error("REPLICATE_API_KEY not set (checked .env).");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const theme of STORY_THEMES) {
    const outPath = path.join(OUT_DIR, `${theme.id}.png`);
    if (!FORCE && (await fileExists(outPath))) {
      console.log(`• ${theme.id}: already exists, skipping`);
      continue;
    }

    const prompt = `${theme.imagePrompt}. Soft, warm children's book illustration, vibrant friendly colors, simple rounded shapes, centered composition on a plain background. Cheerful and completely kid-safe. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS anywhere in the image.`;

    console.log(`• ${theme.id}: generating…`);
    const url = await generateOne(apiKey, prompt);
    if (!url) {
      console.error(`  ✗ ${theme.id}: failed`);
      continue;
    }

    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      console.error(`  ✗ ${theme.id}: download failed (${imgRes.status})`);
      continue;
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await writeFile(outPath, buf);
    console.log(`  ✓ ${theme.id}: saved ${outPath} (${buf.length} bytes)`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Theme image generation failed:", err);
  process.exit(1);
});
