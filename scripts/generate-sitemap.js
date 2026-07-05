#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_URL = 'https://fershouno.github.io/blog';

function generate() {
  const postsPath = path.join(DATA_DIR, 'posts.json');
  const posts = fs.existsSync(postsPath) ? fs.readJsonSync(postsPath) : [];
  const categories = [...new Set(posts.map(p => p.category))];

  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/search.html', priority: '0.6' },
    ...categories.map(c => ({ loc: `/category/${c.toLowerCase()}/`, priority: '0.7' })),
    ...posts.map(p => ({ loc: `/post/${p.id}/`, priority: '0.9' }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(u => `
  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`).join('')}
</urlset>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
}

generate();
