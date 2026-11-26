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

// Blog link in the main nav and the footer Company column, on any page missing it
(function () {
  function hasLink(scope, label) {
    var links = scope.getElementsByTagName('a');
    for (var i = 0; i < links.length; i++) {
      if ((links[i].textContent || '').trim() === label) return true;
    }
    return false;
  }
  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName('script');
    for (var i = 0; i < all.length; i++) {
      if (/assets\/js\/site\.js/.test(all[i].src)) { script = all[i]; break; }
    }
  }
  var href = script && script.src ? script.src.replace(/assets\/js\/site\.js.*$/, 'blog/') : '/blog/';

  var navLinks = document.querySelector('.nav-links');
  if (navLinks && !hasLink(navLinks, 'Blog')) {
    var navBlog = document.createElement('a');
    navBlog.href = href;
    navBlog.textContent = 'Blog';
    var services = null, navAs = navLinks.getElementsByTagName('a');
    for (var j = 0; j < navAs.length; j++) {
      if ((navAs[j].textContent || '').trim() === 'Services') { services = navAs[j]; break; }
    }
    if (services) { services.parentNode.insertBefore(navBlog, services.nextSibling); }
    else { navLinks.insertBefore(navBlog, navLinks.firstChild); }
  }

  var footer = document.querySelector('footer');
  if (footer && !hasLink(footer, 'Blog')) {
    var footBlog = document.createElement('a');
    footBlog.href = href;
    footBlog.textContent = 'Blog';
    var heading = null, marks = footer.querySelectorAll('b, h4, strong');
    for (var k = 0; k < marks.length; k++) {
      if ((marks[k].textContent || '').trim() === 'Company') { heading = marks[k]; break; }
    }
    if (heading) {
      var col = heading.parentNode, list = col.querySelector('ul');
      if (list) {
        var li = document.createElement('li');
        li.appendChild(footBlog);
        list.insertBefore(li, list.firstChild);
      } else {
        var bookNow = null, colAs = col.getElementsByTagName('a');
        for (var n = 0; n < colAs.length; n++) {
          if ((colAs[n].textContent || '').trim() === 'Book Now') { bookNow = colAs[n]; break; }
        }
        if (bookNow) { bookNow.parentNode.insertBefore(footBlog, bookNow.nextSibling); }
        else { col.appendChild(footBlog); }
      }
    } else {
      footer.appendChild(footBlog);
    }
  }
})();
