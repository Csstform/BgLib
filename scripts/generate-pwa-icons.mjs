#!/usr/bin/env node
/** Generate PNG PWA icons from public/icon.svg */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icon.svg"));
const out = join(root, "public/icons");

const bg = { r: 26, g: 35, b: 50, alpha: 1 }; // #1a2332

await sharp(svg).resize(192, 192).png().toFile(join(out, "icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(join(out, "icon-512.png"));
await sharp(svg).resize(180, 180).png().toFile(join(out, "apple-touch-icon.png"));

// Maskable: icon at ~80% safe zone on 512 canvas
await sharp(svg)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: bg })
  .png()
  .toFile(join(out, "icon-maskable-512.png"));

console.log("Wrote public/icons/*.png");
