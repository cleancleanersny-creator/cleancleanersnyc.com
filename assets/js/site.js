// Mobile menu toggle
(function () {
  var nav = document.querySelector('.nav');
  var btn = document.querySelector('.nav-toggle');
  if (!nav || !btn) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); });
  });
})();

// Mikey Clean chat assistant (skipped on internal/private pages)
(function () {
  if (/dispatch|partner-portal|\/portal|text\.html|creator-agreement/.test(location.pathname)) return;
  var s = document.currentScript || document.querySelector('script[src*="assets/js/site.js"]');
  var base = s && s.src ? s.src.replace(/site\.js.*$/, '') : '/assets/js/';
  var m = document.createElement('script'); m.src = base + 'mikey.js'; m.defer = true; document.body.appendChild(m);
})();
