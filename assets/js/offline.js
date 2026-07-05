(function () {
  var retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', function () { window.location.reload(); });
  }
})();
