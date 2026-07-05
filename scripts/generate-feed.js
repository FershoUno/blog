#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_URL = 'https://fershouno.github.io/blog';
const SITE_NAME = 'Debian MicroNews';
const SITE_DESC = 'Noticias sobre Debian, GNU/Linux y Software Libre';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generate() {
  const postsPath = path.join(DATA_DIR, 'posts.json');
  if (!fs.existsSync(postsPath)) {
    console.warn('  ⚠️  posts.json no encontrado, omitiendo feed');
    return;
  }

  const posts = fs.readJsonSync(postsPath);
  if (!posts.length) {
    console.warn('  ⚠️  No hay posts, omitiendo feed');
    return;
  }

  const items = posts.map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/post/${p.id}/</link>
      <guid isPermaLink="true">${SITE_URL}/post/${p.id}/</guid>
      <pubDate>${new Date(p.date + 'T' + p.time).toUTCString()}</pubDate>
      <description>${escapeXml(p.summary || p.title)}</description>
      <category>${escapeXml(p.category)}</category>
      ${p.tags.map(t => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}/</link>
    <description>${SITE_DESC}</description>
    <language>es</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'rss.xml'), rss);
}

generate();
