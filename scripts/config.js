#!/usr/bin/env node

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const config = {
  BASE_URL: process.env.BASE_URL !== undefined ? process.env.BASE_URL : '/blog',
  SITE_URL: process.env.SITE_URL !== undefined ? process.env.SITE_URL : 'https://fershouno.github.io/blog',
  SITE_NAME: process.env.SITE_NAME !== undefined ? process.env.SITE_NAME : 'Debian MicroNews',
  SITE_DESC: process.env.SITE_DESC !== undefined ? process.env.SITE_DESC : 'Noticias sobre Debian, GNU/Linux y Software Libre',

  ROOT,
  CONTENT_DIR: path.join(ROOT, 'content', 'posts'),
  DATA_DIR: path.join(ROOT, 'data'),
  PUBLIC_DIR: path.join(ROOT, 'public'),
  ASSETS_DIR: path.join(ROOT, 'assets'),
};

module.exports = config;
