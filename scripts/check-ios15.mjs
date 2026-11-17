// Fails if a built browser chunk uses syntax iOS Safari 15 cannot parse (owner, 2026-11-17: an
// email link opened on an iPhone must never meet a dead page). One such construct in a chunk stops
// that whole chunk: class static blocks (Safari 16.4) and regex lookbehind (Safari 16.4). Built-ins
// newer than iOS 15 are polyfilled inline instead (src/components/LoadFallback.tsx).
//
//   node scripts/check-ios15.mjs [assetsDir]   (default: the Vercel build, else the e2e build)
import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";

const candidates = [
  process.argv[2],
  ".vercel/output/static/assets",
  ".output/public/assets",
  ".e2e-tmp/output/public/assets",
].filter(Boolean);
const dir = candidates.find((d) => fs.existsSync(d));
if (!dir) {
  console.error("check-ios15: no built assets found — run a build first");
  process.exit(2);
}

const problems = [];
let files = 0;
const visit = (node, file) => {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "StaticBlock") problems.push(`${file}: class static block at ${node.start}`);
  if (node.type === "Literal" && node.regex && /\(\?<[=!]/.test(node.regex.pattern))
    problems.push(
      `${file}: regex lookbehind /${node.regex.pattern.slice(0, 40)}/ at ${node.start}`,
    );
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) visit(c, file);
    else if (v && typeof v === "object" && typeof v.type === "string") visit(v, file);
  }
};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  files++;
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: "module" });
  } catch (err) {
    problems.push(`${f}: not ES2022 (${err.message})`);
    continue;
  }
  visit(ast, f);
}
if (problems.length) {
  console.error(`check-ios15: ${problems.length} problem(s) in ${dir}\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-ios15: ${files} chunks in ${dir} parse on iOS Safari 15`);
