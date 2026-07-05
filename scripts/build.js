#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const hljs = require('highlight.js');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'posts');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ASSETS_DIR = path.join(ROOT, 'assets');
const SITE_URL = 'https://fershouno.github.io/blog';
const SITE_NAME = 'Debian MicroNews';
const SITE_DESC = 'Noticias sobre Debian, GNU/Linux y Software Libre';

const REQUIRED_FM = ['title', 'date', 'category'];

marked.setOptions({
  breaks: true,
  gfm: true
});

marked.use({
  renderer: {
    code(text, lang) {
      const langClass = lang ? ` class="language-${lang}"` : '';
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(text, { language: lang }).value;
          return `<pre><code${langClass}>${highlighted}</code></pre>`;
        } catch (e) {}
      }
      return `<pre><code${langClass}>${text}</code></pre>`;
    }
  }
});

function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  return files.map(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');

    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) {
      console.warn(`  ⚠️  ${file}: Sin frontmatter, omitido`);
      return null;
    }

    const fm = yaml.load(fmMatch[1]);
    const content = fmMatch[2];
    const id = file.replace('.md', '');

    for (const field of REQUIRED_FM) {
      if (!fm[field]) {
        console.warn(`  ⚠️  ${file}: Falta '${field}', omitido`);
        return null;
      }
    }

    if (fm.published === false) {
      console.log(`  🔴 ${file}: No publicado, omitido`);
      return null;
    }

    const tags = Array.isArray(fm.tags) ? fm.tags : [];
    const bodyHtml = marked.parse(content);
    const wordCount = content.replace(/[#*`\[\]]/g, '').split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    return {
      id,
      slug: fm.slug || id,
      title: fm.title,
      author: fm.author || 'Debian MicroNews',
      date: fm.date,
      time: fm.time || '12:00',
      category: fm.category,
      tags,
      summary: fm.summary || '',
      cover: fm.cover || '',
      readingTime,
      bodyHtml,
      wordCount,
      content
    };
  }).filter(Boolean)
  .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getTemplate(name) {
  const tplPath = path.join(ROOT, 'templates', `${name}.html`);
  return fs.existsSync(tplPath) ? fs.readFileSync(tplPath, 'utf-8') : '';
}

async function build() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        Debian MicroNews - Builder        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  fs.ensureDirSync(DATA_DIR);
  fs.ensureDirSync(PUBLIC_DIR);
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'post'));
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'category'));

  const posts = readPosts();
  console.log(`\n📝 Posts encontrados: ${posts.length}`);

  // Generate posts.json
  const postsJson = posts.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    author: p.author,
    date: p.date,
    time: p.time,
    category: p.category,
    tags: p.tags,
    summary: p.summary,
    cover: p.cover,
    readingTime: p.readingTime
  }));
  fs.writeJsonSync(path.join(DATA_DIR, 'posts.json'), postsJson, { spaces: 2 });
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'data'));
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'data', 'posts.json'), postsJson, { spaces: 2 });
  console.log('  ✅ posts.json');

  // Generate index.json  
  const indexJson = {
    site: { name: SITE_NAME, description: SITE_DESC, url: SITE_URL },
    posts: postsJson,
    categories: [...new Set(posts.map(p => p.category))],
    tags: [...new Set(posts.flatMap(p => p.tags))],
    updated: new Date().toISOString()
  };
  fs.writeJsonSync(path.join(DATA_DIR, 'index.json'), indexJson, { spaces: 2 });
  console.log('  ✅ index.json');

  // Generate search.json (full text index)
  const searchJson = posts.map(p => ({
    id: p.id,
    title: p.title,
    summary: p.summary,
    author: p.author,
    date: p.date,
    time: p.time,
    category: p.category,
    tags: p.tags,
    content: p.content.replace(/[#*`\[\]<>]/g, '').substring(0, 500)
  }));
  fs.ensureDirSync(path.join(PUBLIC_DIR, 'data'));
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'data', 'search.json'), searchJson, { spaces: 2 });
  console.log('  ✅ search.json');

  // Copy assets
  if (fs.existsSync(ASSETS_DIR)) {
    fs.copySync(ASSETS_DIR, path.join(PUBLIC_DIR, 'assets'));
    console.log('  ✅ assets copiados');
  }

  // Copy PWA files to public root
  const swSrc = path.join(ASSETS_DIR, 'js', 'sw.js');
  if (fs.existsSync(swSrc)) {
    fs.copySync(swSrc, path.join(PUBLIC_DIR, 'sw.js'));
    console.log('  ✅ sw.js');
  }

  const manifestSrc = path.join(ROOT, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copySync(manifestSrc, path.join(PUBLIC_DIR, 'manifest.json'));
    console.log('  ✅ manifest.json');
  }

  const offlineSrc = path.join(ROOT, 'offline.html');
  if (fs.existsSync(offlineSrc)) {
    fs.copySync(offlineSrc, path.join(PUBLIC_DIR, 'offline.html'));
    console.log('  ✅ offline.html');
  }

  // Generate post HTML pages
  posts.forEach((post, i) => {
    const prev = posts[i + 1] || null;
    const next = posts[i - 1] || null;

    const tagsHtml = post.tags.map(t => `<span class="tag">${t}</span>`).join('');
    const timeEst = post.readingTime === 1 ? '1 min' : `${post.readingTime} min`;

    const related = posts
      .filter(p => p.id !== post.id && (p.category === post.category || p.tags.some(t => post.tags.includes(t))))
      .slice(0, 3);

    const relatedHtml = related.map(r => `
      <a href="/blog/post/${r.id}/" class="related-card">
        ${r.cover ? `<img src="/blog/${r.cover}" alt="${r.title}" loading="lazy">` : ''}
        <div>
          <span class="category-badge">${r.category}</span>
          <h4>${r.title}</h4>
        </div>
      </a>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)} - ${SITE_NAME}</title>
  <meta name="description" content="${escapeHtml(post.summary || post.title)}">
  <link rel="canonical" href="${SITE_URL}/post/${post.id}/">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(post.summary || post.title)}">
  <meta property="og:url" content="${SITE_URL}/post/${post.id}/">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="article:published_time" content="${post.date}T${post.time}:00">
  <meta property="article:author" content="${post.author}">
  <meta property="article:section" content="${post.category}">
  ${post.tags.map(t => `<meta property="article:tag" content="${t}">`).join('\n  ')}
  ${post.cover ? `<meta property="og:image" content="${SITE_URL}/${post.cover}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(post.summary || post.title)}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${escapeHtml(post.title)}",
    "author": { "@type": "Person", "name": "${post.author}" },
    "datePublished": "${post.date}T${post.time}:00",
    "description": "${escapeHtml(post.summary || post.title)}",
    "articleSection": "${post.category}"
  }
  </script>
  <link rel="stylesheet" href="/blog/assets/css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/blog/assets/icons/favicon.svg">
  <link rel="alternate" type="application/rss+xml" title="${SITE_NAME}" href="/blog/rss.xml">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="/blog/" class="logo">${SITE_NAME}</a>
      <nav class="nav-links" role="navigation" aria-label="Navegación principal">
        <a href="/blog/" data-nav="home">Inicio</a>
        <a href="/blog/search.html">Buscar</a>
        <a href="/blog/rss.xml" target="_blank" rel="noopener">RSS</a>
      </nav>
      <button class="menu-toggle" aria-label="Menú" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main class="container post-page">
    <article class="post-full">
      ${post.cover ? `<img src="/blog/${post.cover}" alt="${post.title}" class="post-cover" loading="eager">` : ''}
      <header class="post-header">
        <span class="category-badge">${post.category}</span>
        <h1>${post.title}</h1>
        <div class="post-meta">
          <span class="meta-author">Por ${post.author}</span>
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="meta-reading">${timeEst} lectura</span>
        </div>
        <div class="tags">${tagsHtml}</div>
      </header>
      <div class="post-content">
        ${post.bodyHtml}
      </div>
      <footer class="post-footer">
        <div class="post-share">
          <span>Compartir:</span>
          <button class="share-btn" data-share="twitter" aria-label="Compartir en Twitter">X</button>
          <button class="share-btn" data-share="linkedin" aria-label="Compartir en LinkedIn">in</button>
          <button class="share-btn copy-link" aria-label="Copiar enlace">🔗</button>
        </div>
        ${related.length ? `
        <section class="related-posts">
          <h3>Artículos relacionados</h3>
          <div class="related-grid">${relatedHtml}</div>
        </section>` : ''}
        <nav class="post-nav" aria-label="Navegación entre artículos">
          ${prev ? `<a href="/blog/post/${prev.id}/" class="prev">← ${prev.title}</a>` : '<span></span>'}
          ${next ? `<a href="/blog/post/${next.id}/" class="next">${next.title} →</a>` : ''}
        </nav>
      </footer>
    </article>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}.</p>
    </div>
  </footer>

  <script src="/blog/assets/js/app.js"></script>
</body>
</html>`;

    const postDir = path.join(PUBLIC_DIR, 'post', post.id);
    fs.ensureDirSync(postDir);
    fs.writeFileSync(path.join(postDir, 'index.html'), html);
    console.log(`  ✏️  /post/${post.id}/`);
  });

  // Generate index page
  const cardsHtml = posts.map(p => {
    const tagsHtml = p.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('');
    const timeEst = p.readingTime === 1 ? '1 min' : `${p.readingTime} min`;
    return `
    <article class="post-card">
      ${p.cover ? `<img src="/blog/${p.cover}" alt="${p.title}" class="card-cover" loading="lazy">` : ''}
      <div class="card-body">
        <span class="category-badge">${p.category}</span>
        <time datetime="${p.date}">${formatDate(p.date)} · ${p.time}</time>
        <h2><a href="/blog/post/${p.id}/">${p.title}</a></h2>
        <p class="card-summary">${p.summary || ''}</p>
        <div class="card-footer">
          <span class="card-author">${p.author}</span>
          <span class="card-reading">${timeEst}</span>
          <div class="tags">${tagsHtml}</div>
        </div>
        <a href="/blog/post/${p.id}/" class="read-more">Leer más →</a>
      </div>
    </article>`;
  }).join('\n');

  const categories = [...new Set(posts.map(p => p.category))];
  const categoriesHtml = categories.map(c => `<a href="/blog/category/${c.toLowerCase()}/" class="category-pill">${c}</a>`).join('');

  const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_NAME}</title>
  <meta name="description" content="${SITE_DESC}">
  <link rel="canonical" href="${SITE_URL}/">
  <meta property="og:title" content="${SITE_NAME}">
  <meta property="og:description" content="${SITE_DESC}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${SITE_NAME}">
  <meta name="twitter:description" content="${SITE_DESC}">
  <link rel="stylesheet" href="/blog/assets/css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/blog/assets/icons/favicon.svg">
  <link rel="alternate" type="application/rss+xml" title="${SITE_NAME}" href="/blog/rss.xml">
  <link rel="manifest" href="/blog/manifest.json">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="/blog/" class="logo">${SITE_NAME}</a>
      <nav class="nav-links" role="navigation" aria-label="Navegación principal">
        <a href="/blog/" data-nav="home">Inicio</a>
        <a href="/blog/search.html">Buscar</a>
        <a href="/blog/rss.xml" target="_blank" rel="noopener">RSS</a>
      </nav>
      <button class="menu-toggle" aria-label="Menú" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <h1>${SITE_NAME}</h1>
      <p class="subtitle">${SITE_DESC}</p>
      <div class="categories-bar">${categoriesHtml}</div>
    </section>

    <section class="post-list" aria-label="Lista de artículos">
      ${cardsHtml}
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}.</p>
    </div>
  </footer>

  <script src="/blog/assets/js/app.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), indexHtml);
  console.log('  ✅ index.html');

  // Generate category pages
  for (const cat of categories) {
    const catPosts = posts.filter(p => p.category === cat);
    const catCards = catPosts.map(p => {
      const timeEst = p.readingTime === 1 ? '1 min' : `${p.readingTime} min`;
      return `
      <article class="post-card">
        ${p.cover ? `<img src="/blog/${p.cover}" alt="${p.title}" class="card-cover" loading="lazy">` : ''}
        <div class="card-body">
          <span class="category-badge">${p.category}</span>
          <time datetime="${p.date}">${formatDate(p.date)} · ${p.time}</time>
          <h2><a href="/blog/post/${p.id}/">${p.title}</a></h2>
          <p class="card-summary">${p.summary || ''}</p>
          <a href="/blog/post/${p.id}/" class="read-more">Leer más →</a>
        </div>
      </article>`;
    }).join('\n');

    const catHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cat} - ${SITE_NAME}</title>
  <meta name="description" content="Artículos sobre ${cat}">
  <link rel="canonical" href="${SITE_URL}/category/${cat.toLowerCase()}/">
  <link rel="stylesheet" href="/blog/assets/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/blog/assets/icons/favicon.svg">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="/blog/" class="logo">${SITE_NAME}</a>
      <nav class="nav-links" role="navigation" aria-label="Navegación principal">
        <a href="/blog/" data-nav="home">Inicio</a>
        <a href="/blog/search.html">Buscar</a>
        <a href="/blog/rss.xml" target="_blank" rel="noopener">RSS</a>
      </nav>
      <button class="menu-toggle" aria-label="Menú" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main class="container">
    <section class="hero category-hero">
      <h1>${cat}</h1>
      <p class="subtitle">${catPosts.length} artículo${catPosts.length !== 1 ? 's' : ''}</p>
    </section>
    <section class="post-list">${catCards}</section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}.</p>
    </div>
  </footer>

  <script src="/blog/assets/js/app.js"></script>
</body>
</html>`;

    const catDir = path.join(PUBLIC_DIR, 'category', cat.toLowerCase());
    fs.ensureDirSync(catDir);
    fs.writeFileSync(path.join(catDir, 'index.html'), catHtml);
    console.log(`  ✅ /category/${cat.toLowerCase()}/`);
  }

  // Generate search page
  const searchHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buscar - ${SITE_NAME}</title>
  <meta name="description" content="Buscar artículos en ${SITE_NAME}">
  <link rel="canonical" href="${SITE_URL}/search.html">
  <link rel="stylesheet" href="/blog/assets/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/blog/assets/icons/favicon.svg">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="/blog/" class="logo">${SITE_NAME}</a>
      <nav class="nav-links" role="navigation" aria-label="Navegación principal">
        <a href="/blog/">Inicio</a>
        <a href="/blog/search.html">Buscar</a>
        <a href="/blog/rss.xml" target="_blank" rel="noopener">RSS</a>
      </nav>
      <button class="menu-toggle" aria-label="Menú" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main class="container search-page">
    <h1>Buscar artículos</h1>
    <div class="search-box">
      <input type="search" id="search-input" placeholder="Buscar por título, contenido, categoría..." aria-label="Buscar artículos">
      <span class="search-icon">⌕</span>
    </div>
    <div id="search-results" role="status">
      <p class="search-hint">Escribe para comenzar a buscar...</p>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}.</p>
    </div>
  </footer>

  <script src="/blog/assets/js/search.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'search.html'), searchHtml);
  console.log('  ✅ search.html');

  // Generate 404 page
  const notFoundHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - ${SITE_NAME}</title>
  <link rel="stylesheet" href="/blog/assets/css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/blog/assets/icons/favicon.svg">
</head>
<body>
  <main class="container error-page">
    <h1>404</h1>
    <p>Página no encontrada</p>
    <a href="/blog/" class="btn-primary">Volver al inicio</a>
  </main>
</body>
</html>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, '404.html'), notFoundHtml);
  console.log('  ✅ 404.html');

  console.log('\n📦 Ejecutando scripts secundarios...\n');

  // Run sub-scripts
  const scripts = [
    { name: 'generate-feed.js', msg: 'Feed RSS' },
    { name: 'generate-sitemap.js', msg: 'Sitemap' }
  ];

  for (const script of scripts) {
    try {
      require(path.join(ROOT, 'scripts', script.name));
      console.log(`  ✅ ${script.msg}`);
    } catch (e) {
      console.error(`  ❌ ${script.msg}: ${e.message}`);
    }
  }

  // Generate version.json for PWA
  const versionJson = {
    version: Date.now().toString(36),
    updated: new Date().toISOString(),
    posts: posts.length
  };
  fs.writeJsonSync(path.join(PUBLIC_DIR, 'version.json'), versionJson);
  console.log('  ✅ version.json');

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt);
  console.log('  ✅ robots.txt');

  console.log('\n══════════════════════════════════════════');
  console.log(`  Build completo · ${posts.length} posts`);
  console.log('══════════════════════════════════════════\n');
}

build().catch(err => {
  console.error('\n❌ Error durante el build:', err);
  process.exit(1);
});
