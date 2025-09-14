const fs = require('fs').promises;
const path = require('path');

async function copyServiceWorker() {
  try {
    const projectRoot = process.cwd();
    const srcPath = path.join(projectRoot, 'public', 'firebase-messaging-sw.js');
    const destPath = path.join(projectRoot, 'firebase-messaging-sw.js');

    // Check if source exists
    try {
      await fs.access(srcPath);
    } catch (err) {
      console.log('Service worker source not found at', srcPath);
      return;
    }

    // Copy the service worker to root
    await fs.copyFile(srcPath, destPath);
    console.log(`Copied firebase-messaging-sw.js -> ${path.relative(projectRoot, destPath)}`);

    console.log('Service worker copied successfully.');
  } catch (err) {
    console.error('Error copying service worker:', err.message || err);
    process.exitCode = 1;
  }
}

copyServiceWorker();
