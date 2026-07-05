const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SITE_URL = 'https://blog.fershouno.me';

function deriveBaseUrl(siteUrl) {
  try {
    const u = new URL(siteUrl);
    return u.pathname.replace(/\/$/, '') || '';
  } catch {
    return '';
  }
}

const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
const BASE_URL = deriveBaseUrl(SITE_URL);

function url(p) {
  const clean = p.startsWith('/') ? p : '/' + p;
  return BASE_URL + clean;
}

function fullUrl(p) {
  const clean = p.startsWith('/') ? p : '/' + p;
  return SITE_URL + clean;
}

module.exports = {
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
