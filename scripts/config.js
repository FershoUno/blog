#!/usr/bin/env node

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Derive BASE_URL from SITE_URL when not explicitly set ──
function deriveBaseUrl(siteUrl) {
  try {
    const u = new URL(siteUrl);
    return u.pathname.replace(/\/$/, '') || '';
  } catch {
    return '/blog';
  }
}

const RAW_BASE_URL = process.env.BASE_URL;
const RAW_SITE_URL = process.env.SITE_URL;

let BASE_URL;
let SITE_URL;

const DEFAULT_SITE_URL = 'https://blog.fershouno.me';

if (RAW_BASE_URL !== undefined) {
  BASE_URL = RAW_BASE_URL;
} else if (RAW_SITE_URL) {
  BASE_URL = deriveBaseUrl(RAW_SITE_URL);
} else {
  BASE_URL = deriveBaseUrl(DEFAULT_SITE_URL);
}

SITE_URL = RAW_SITE_URL || DEFAULT_SITE_URL;

// Normalize: ensure BASE_URL has no trailing slash
if (BASE_URL.length > 1 && BASE_URL.endsWith('/')) BASE_URL = BASE_URL.slice(0, -1);

// ── URL Helpers ────────────────────────────────────────────

// Build a root-relative URL using BASE_URL.
//   url('/assets/css/style.css')  →  '/blog/assets/css/style.css'  or  '/assets/css/style.css'
function url(p) {
  p = String(p).replace(/^\//, '');
  if (!BASE_URL) return '/' + p;
  return BASE_URL + '/' + p;
}

// Build an absolute URL using SITE_URL.
//   fullUrl('/post/000001/')  →  'https://fershunoo.github.io/blog/post/000001/'
function fullUrl(p) {
  const site = SITE_URL.replace(/\/+$/, '');
  return site + '/' + String(p).replace(/^\//, '');
}

const config = {
  BASE_URL,
  SITE_URL,
  SITE_NAME: process.env.SITE_NAME || 'Debian MicroNews',
  SITE_DESC: process.env.SITE_DESC || 'Noticias sobre Debian, GNU/Linux y Software Libre',

  ROOT,
  CONTENT_DIR: path.join(ROOT, 'content', 'posts'),
  DATA_DIR: path.join(ROOT, 'data'),
  PUBLIC_DIR: path.join(ROOT, 'public'),
  ASSETS_DIR: path.join(ROOT, 'assets'),

  url,
  fullUrl,
};

module.exports = config;
