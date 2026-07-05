(function () {
  'use strict';

  /* ==========================================
     Mobile menu toggle
     ========================================== */
  function initMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav-links');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      nav.classList.toggle('nav-open');
    });

    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('nav-open');
      }
    });
  }

  /* ==========================================
     Share buttons
     ========================================== */
  function initShareButtons() {
    document.querySelectorAll('.share-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = window.location.href;
        var text = document.title;

        switch (btn.dataset.share) {
          case 'twitter':
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'width=600,height=400');
            break;
          case 'linkedin':
            window.open('https://linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank', 'width=600,height=400');
            break;
        }
      });
    });

    var copyBtn = document.querySelector('.copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(window.location.href).then(function () {
          var orig = copyBtn.textContent;
          copyBtn.textContent = '✅';
          setTimeout(function () { copyBtn.textContent = orig; }, 2000);
        });
      });
    }
  }

  /* ==========================================
     Active nav link
     ========================================== */
  function initActiveNav() {
    var path = window.location.pathname;
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      if (path === '/blog/' || path === '/blog') {
        el.classList.toggle('active', el.dataset.nav === 'home');
      }
    });
  }

  /* ==========================================
     PWA: Service Worker Registration
     ========================================== */
  function initSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/blog/sw.js').then(function (reg) {
        console.log('[PWA] SW registrado');

        reg.addEventListener('updatefound', function () {
          var installing = reg.installing;
          if (!installing) return;

          installing.addEventListener('statechange', function () {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(reg);
            }
          });
        });
      }).catch(function (err) {
        console.warn('[PWA] Error registrando SW:', err);
      });

      navigator.serviceWorker.addEventListener('controllerchange', function () {
        console.log('[PWA] Nuevo SW activo');
      });
    }
  }

  /* ==========================================
     PWA: Update banner
     ========================================== */
  function showUpdateBanner(reg) {
    var banner = document.createElement('div');
    banner.className = 'update-banner fade-in';
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      '<p>Hay nuevas noticias disponibles</p>' +
      '<button class="update-btn">Actualizar</button>' +
      '<button class="update-close" aria-label="Cerrar">&times;</button>';

    document.body.appendChild(banner);

    banner.querySelector('.update-btn').addEventListener('click', function () {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      banner.remove();
    });

    banner.querySelector('.update-close').addEventListener('click', function () {
      banner.remove();
    });
  }

  /* ==========================================
     PWA: Periodic version check (Mode 1)
     ========================================== */
  var CHECK_INTERVAL = 60000;

  function initVersionCheck() {
    var currentVersion = null;

    fetch('/blog/version.json?_=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) { currentVersion = data.version; })
      .catch(function () {});

    setInterval(function () {
      fetch('/blog/version.json?_=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (currentVersion && data.version !== currentVersion) {
            showContentUpdate();
            currentVersion = data.version;
          } else if (!currentVersion) {
            currentVersion = data.version;
          }
        })
        .catch(function () {});
    }, CHECK_INTERVAL);
  }

  function showContentUpdate() {
    var existing = document.querySelector('.update-banner');
    if (existing) return;

    var banner = document.createElement('div');
    banner.className = 'update-banner fade-in';
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      '<p>Hay nuevas noticias disponibles</p>' +
      '<button class="update-btn" onclick="location.reload()">Actualizar</button>' +
      '<button class="update-close" aria-label="Cerrar">&times;</button>';

    document.body.appendChild(banner);

    banner.querySelector('.update-close').addEventListener('click', function () {
      banner.remove();
    });
  }

  /* ==========================================
     Lazy loading images
     ========================================== */
  function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
        img.src = img.dataset.src || img.src;
      });
    }
  }

  /* ==========================================
     Keyboard navigation
     ========================================== */
  function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var nav = document.querySelector('.nav-links');
        var toggle = document.querySelector('.menu-toggle');
        if (nav && nav.classList.contains('nav-open')) {
          nav.classList.remove('nav-open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  /* ==========================================
     Init
     ========================================== */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initMenu();
        initShareButtons();
        initActiveNav();
        initKeyboardNav();
        initLazyLoading();
        initSW();
        initVersionCheck();
      });
    } else {
      initMenu();
      initShareButtons();
      initActiveNav();
      initKeyboardNav();
      initLazyLoading();
      initSW();
      initVersionCheck();
    }
  }

  init();
})();
