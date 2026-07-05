#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'posts');

function getNextId() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    return '000001';
  }

  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => /^\d{6}\.md$/.test(f))
    .sort();

  if (files.length === 0) return '000001';

  const lastId = parseInt(files.pop().replace('.md', ''), 10);
  const nextId = lastId + 1;

  return String(nextId).padStart(6, '0');
}

if (require.main === module) {
  const id = getNextId();
  console.log(id);
  process.stdout.write(id);
}

module.exports = { getNextId };
