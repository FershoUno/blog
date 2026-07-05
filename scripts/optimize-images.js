#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');
const OUTPUT_IMAGES_DIR = path.join(ROOT, 'public', 'assets', 'images');

async function optimizeImages() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.ensureDirSync(IMAGES_DIR);
    return;
  }

  fs.ensureDirSync(OUTPUT_IMAGES_DIR);

  const images = fs.readdirSync(IMAGES_DIR).filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f));

  if (images.length === 0) return;

  console.log(`  🖼️  Optimizando ${images.length} imágenes...`);

  for (const img of images) {
    const src = path.join(IMAGES_DIR, img);
    const dst = path.join(OUTPUT_IMAGES_DIR, img);

    try {
      const ext = path.extname(img).toLowerCase();

      if (ext === '.svg') {
        fs.copySync(src, dst);
        console.log(`    ✅ ${img} (SVG copiado)`);
        continue;
      }

      if (ext === '.webp') {
        fs.copySync(src, dst);
        console.log(`    ✅ ${img} (WebP copiado)`);
        continue;
      }

      fs.copySync(src, dst);
      console.log(`    ✅ ${img} (copiado - instalar sharp/cwebp para optimización)`);
    } catch (e) {
      console.error(`    ❌ ${img}: ${e.message}`);
    }
  }
}

if (require.main === module) {
  optimizeImages().catch(console.error);
}

module.exports = { optimizeImages };
