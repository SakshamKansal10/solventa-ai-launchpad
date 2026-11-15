// Pixel diff of two film-scenes.mjs captures (in a browser canvas, no extra dependencies).
// Writes <outDir>/<scene>-diff.png (differences in red over a dimmed frame) and prints, per
// scene, the share of differing pixels and the 4x4 grid cell holding most of them.
// usage: node scripts/film-scenes-diff.mjs <dirA> <dirB> <outDir>
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const [a, bdir, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
const rows = [];
for (const f of readdirSync(a).filter((x) => x.endsWith(".png")).sort()) {
  const A = "data:image/png;base64," + readFileSync(path.join(a, f)).toString("base64");
  const B = "data:image/png;base64," + readFileSync(path.join(bdir, f)).toString("base64");
  const r = await page.evaluate(
    async ([A, B]) => {
      const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(A), load(B)]);
      const w = ia.width, h = ia.height;
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d");
      x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, w, h).data;
      x.clearRect(0, 0, w, h); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, w, h);
      const out = x.createImageData(w, h);
      let diff = 0; const grid = new Array(16).fill(0);
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db.data[i]) + Math.abs(da[i + 1] - db.data[i + 1]) + Math.abs(da[i + 2] - db.data[i + 2]);
        const g = (da[i] + da[i + 1] + da[i + 2]) / 3;
        if (d > 90) {
          diff++;
          const px = (i / 4) % w, py = Math.floor(i / 4 / w);
          grid[Math.min(3, Math.floor((py / h) * 4)) * 4 + Math.min(3, Math.floor((px / w) * 4))]++;
          out.data.set([255, 40, 40, 255], i);
        } else out.data.set([g * 0.35, g * 0.35, g * 0.35, 255], i);
      }
      x.putImageData(out, 0, 0);
      const cell = grid.indexOf(Math.max(...grid));
      return { pct: (100 * diff) / (w * h), cell: `row ${Math.floor(cell / 4) + 1} col ${(cell % 4) + 1}`, png: c.toDataURL("image/png") };
    },
    [A, B],
  );
  writeFileSync(path.join(out, f.replace(".png", "-diff.png")), Buffer.from(r.png.split(",")[1], "base64"));
  rows.push(`${f.padEnd(22)} ${r.pct.toFixed(1).padStart(5)}% differ · most in ${r.cell}`);
}
console.log(rows.join("\n"));
await browser.close();
