const fs = require('fs').promises;
const path = require('path');

const repoRoot = process.cwd();

const ELEVATION_MAP = {
  1: "0px 1px 2px rgba(0,0,0,0.05)",
  2: "0px 1px 4px rgba(0,0,0,0.08)",
  3: "0px 2px 8px rgba(0,0,0,0.1)",
  4: "0px 2px 10px rgba(0,0,0,0.11)",
  5: "0px 4px 12px rgba(0,0,0,0.12)",
  6: "0px 6px 18px rgba(0,0,0,0.14)",
  8: "0px 8px 24px rgba(0,0,0,0.16)",
  10: "0px 12px 30px rgba(0,0,0,0.18)",
};

function mapElevationToBoxShadow(e) {
  if (!e && e !== 0) return "0px 1px 2px rgba(0,0,0,0.05)";
  const key = Math.round(Number(e));
  if (ELEVATION_MAP[key]) return ELEVATION_MAP[key];
  if (key <= 1) return ELEVATION_MAP[1];
  if (key <= 2) return ELEVATION_MAP[2];
  if (key <= 3) return ELEVATION_MAP[3];
  if (key <= 5) return ELEVATION_MAP[5];
  if (key <= 8) return ELEVATION_MAP[8];
  return "0px 12px 30px rgba(0,0,0,0.18)";
}

async function walk(dir, filelist = []) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      if (file === "node_modules" || file === ".git") continue;
      await walk(full, filelist);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      filelist.push(full);
    }
  }
  return filelist;
}

async function processFile(file) {
  let src = await fs.readFile(file, 'utf8');
  let original = src;

  // 1) Replace common block (shadowColor/.../elevation) with boxShadow using elevation if present
  // This handles blocks where lines are contiguous inside a style object
  src = src.replace(/shadowColor\s*:\s*[^,\n]+,\s*\n\s*shadowOffset\s*:\s*\{[^}]*\},\s*\n\s*shadowOpacity\s*:\s*[^,\n]+,\s*\n\s*shadowRadius\s*:\s*[^,\n]+,\s*\n\s*elevation\s*:\s*([0-9.]+)\s*,?/g, (m, elev) => {
    const bs = mapElevationToBoxShadow(elev);
    return `boxShadow: '${bs}',\n`;
  });

  // 2) Replace elevation only occurrences (most common) with mapped boxShadow
  src = src.replace(/(^\s*)elevation\s*:\s*([0-9.]+)\s*,?/gm, (m, indent, elev) => {
    const bs = mapElevationToBoxShadow(elev);
    return `${indent}boxShadow: '${bs}',`;
  });

  // 3) Remove any remaining shadow* props (shadowColor, shadowOffset, shadowOpacity, shadowRadius)
  src = src.replace(/^\s*(shadowColor|shadowOffset|shadowOpacity|shadowRadius)\s*:\s*[^,;\n]+,?\s*$/gm, '');

  // 4) If shadowOffset exists without elevation, try to convert to small boxShadow
  // Match shadowOffset: { width: X, height: Y } and optional shadowRadius and shadowOpacity nearby
  src = src.replace(/shadowOffset\s*:\s*\{\s*width\s*:\s*([0-9.-]+)\s*,\s*height\s*:\s*([0-9.-]+)\s*\}\s*,?\s*(?:\n\s*shadowRadius\s*:\s*([0-9.-]+)\s*,?)?\s*(?:\n\s*shadowOpacity\s*:\s*([0-9.-]+)\s*,?)?/g,
    (m, w, h, r, o) => {
      const radius = r || Math.max(1, Math.abs(Number(h || 1)));
      const opacity = (o !== undefined) ? o : 0.08;
      const bs = `${w}px ${h}px ${radius}px rgba(0,0,0,${opacity})`;
      return `boxShadow: '${bs}',`;
    });

  if (src !== original) {
    await fs.writeFile(file, src, 'utf8');
    console.log('Updated:', path.relative(repoRoot, file));
  }
}

async function run() {
  console.log('Scanning repo for ts/js files...');
  const files = await walk(repoRoot, []);
  for (const f of files) {
    await processFile(f);
  }
  console.log('Done. Please run your TypeScript check or start the dev server to validate.');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
