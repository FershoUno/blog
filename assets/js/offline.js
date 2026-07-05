/* Offline fallback handler */
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      var retryBtn = document.getElementById('retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', function () {
          window.location.reload();
        });
      }
    });
  }
})();
