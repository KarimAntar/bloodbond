const fs = require('fs').promises;
const path = require('path');

async function copyFonts() {
  try {
    const projectRoot = process.cwd();
    const srcDir = path.join(projectRoot, 'assets', 'fonts');
    const destDir = path.join(projectRoot, 'fonts');

    // ensure source exists
    await fs.access(srcDir);

    // create destination if missing
    await fs.mkdir(destDir, { recursive: true });

    const files = await fs.readdir(srcDir);
    if (files.length === 0) {
      console.log('No font files found in', srcDir);
      return;
    }

    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);

      // skip directories
      const stat = await fs.stat(srcPath);
      if (!stat.isFile()) continue;

      await fs.copyFile(srcPath, destPath);
      console.log(`Copied ${file} -> ${path.relative(projectRoot, destPath)}`);
    }

    console.log('Fonts copied successfully.');
  } catch (err) {
    console.error('Error copying fonts:', err.message || err);
    process.exitCode = 1;
  }
}

copyFonts();
