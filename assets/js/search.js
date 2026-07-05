(function () {
  'use strict';

  var searchInput = document.getElementById('search-input');
  var resultsContainer = document.getElementById('search-results');
  var posts = [];
  var searchTimeout = null;

  /* ==========================================
     Load search index
     ========================================== */
  function loadIndex() {
    return fetch('/blog/data/search.json?_=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar el índice');
        return r.json();
      })
      .then(function (data) {
        posts = data;
        resultsContainer.innerHTML = '<p class="search-hint">' + posts.length + ' artículos indexados. Escribe para buscar...</p>';
      })
      .catch(function () {
        // Fallback: load posts.json and build index on client
        return fetch('/blog/data/posts.json?_=' + Date.now())
          .then(function (r) { return r.json(); })
          .then(function (data) {
            posts = data;
            resultsContainer.innerHTML = '<p class="search-hint">' + posts.length + ' artículos indexados. Escribe para buscar...</p>';
          })
          .catch(function () {
            resultsContainer.innerHTML = '<p class="search-hint" style="color:var(--error)">Error al cargar el índice de búsqueda</p>';
          });
      });
  }

  /* ==========================================
     Search function
     ========================================== */
  function search(query) {
    if (!query || query.length < 2) {
      resultsContainer.innerHTML = '<p class="search-hint">Escribe al menos 2 caracteres para buscar...</p>';
      return;
    }

    var q = query.toLowerCase();
    var matched = [];

    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var searchText = (p.title + ' ' + (p.summary || '') + ' ' + (p.category || '') + ' ' + p.tags.join(' ') + ' ' + (p.author || '')).toLowerCase();

      if (searchText.indexOf(q) !== -1) {
        matched.push(p);
      }
    }

    if (matched.length === 0) {
      resultsContainer.innerHTML = '<p class="search-hint">No se encontraron resultados para "' + query + '"</p>';
      return;
    }

    var html = '<p class="search-hint" style="text-align:left;padding:0 0 16px">' + matched.length + ' resultado' + (matched.length !== 1 ? 's' : '') + ' para "' + query + '"</p>';

    for (var j = 0; j < matched.length; j++) {
      var post = matched[j];
      var timeDisplay = formatDate(post.date) + ' · ' + post.time;
      var excerpt = highlightMatch(post.summary || post.title, q);

      html +=
        '<div class="search-result fade-in">' +
          '<a href="/blog/post/' + post.id + '/">' + highlightMatch(post.title, q) + '</a>' +
          '<div class="result-meta">' +
            '<span class="category-badge">' + post.category + '</span> ' +
            timeDisplay + ' · ' + post.author +
          '</div>' +
          '<div class="result-excerpt">' + excerpt + '</div>' +
        '</div>';
    }

    resultsContainer.innerHTML = html;

    // Update URL with search query
    try {
      var url = new URL(window.location);
      if (query) {
        url.searchParams.set('q', query);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState({}, '', url);
    } catch (e) {}
  }

  function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return text.replace(re, '<mark>$1</mark>');
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  /* ==========================================
     Init
     ========================================== */
  function init() {
    if (!searchInput) return;

    loadIndex();

    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        search(searchInput.value.trim());
      }, 250);
    });

    // Read query from URL
    try {
      var params = new URL(window.location).searchParams;
      var q = params.get('q');
      if (q) {
        searchInput.value = q;
        search(q);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
