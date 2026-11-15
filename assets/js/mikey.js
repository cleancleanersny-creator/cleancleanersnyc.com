/* Mikey Clean: AI cleaning friend for cleancleanersnyc.com
   Phase 1: guided quote, booking, FAQ and human handoff (works with no backend).
   Phase 2: set MIKEY_API to the deployed Google Apps Script URL to turn on AI answers
   and send leads to the "Mikey Leads" Google Sheet. */
(function () {
  'use strict';
  if (window.__mikeyLoaded) return; window.__mikeyLoaded = true;

  // ===== CONFIG =====
  var MIKEY_API = window.MIKEY_API_OVERRIDE || ''; // Paste the Apps Script web app URL here to enable Phase 2 (AI + Google Sheet)
  var LEAD_FALLBACK = 'https://formsubmit.co/ajax/hello@cleancleanersnyc.com';
  var BOOK_URL = 'https://widget.zenbooker.com/book/cleancleanersnycllc';
  var PHONE = '+19297605230', PHONE_TXT = '(929) 760-5230';
  var MAX_AI_TURNS = 30;

  var me = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var BASE = (me && me.src) ? me.src.replace(/assets\/js\/mikey\.js.*$/, '') : '/';
  var AVATAR = BASE + 'assets/img/mikey-avatar.webp';
  var TALK = BASE + 'assets/video/mikey-talk.mp4';

  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function track(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {} }

  // NYC business hours: Mon-Fri 8-18, Sat 9-17, Sun 10-16
  function nyOpen() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
      var d = '', h = 0; p.forEach(function (x) { if (x.type === 'weekday') d = x.value; if (x.type === 'hour') h = parseInt(x.value, 10) % 24; });
      if (d === 'Sat') return h >= 9 && h < 17;
      if (d === 'Sun') return h >= 10 && h < 16;
      return h >= 8 && h < 18;
    } catch (e) { return true; }
  }

  // ===== STYLES =====
  var css = '' +
  '.mk-launch{position:fixed;right:20px;bottom:20px;z-index:9998;width:68px;height:68px;border-radius:50%;border:3px solid #fff;padding:0;cursor:pointer;background:#2A3461;box-shadow:0 10px 28px rgba(42,52,97,.35);transition:transform .2s}' +
  '.mk-launch:hover{transform:scale(1.06)}.mk-launch img,.mk-launch video{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}.mk-launch video{opacity:0;transition:opacity .3s}.mk-launch.peek video{opacity:1}.mk-launch.peek{animation:mkWig .6s ease 2}@keyframes mkWig{25%{transform:rotate(-8deg) scale(1.08)}75%{transform:rotate(8deg) scale(1.08)}}' +
  '.mk-launch:after{content:"";position:absolute;right:2px;bottom:2px;width:14px;height:14px;border-radius:50%;background:#2DA8DD;border:2px solid #fff;animation:mkPulse 2s infinite}' +
  '@keyframes mkPulse{0%{box-shadow:0 0 0 0 rgba(45,168,221,.6)}70%{box-shadow:0 0 0 10px rgba(45,168,221,0)}100%{box-shadow:0 0 0 0 rgba(45,168,221,0)}}' +
  '.mk-tease{position:fixed;right:98px;bottom:30px;z-index:9998;max-width:240px;background:#fff;color:#1B2140;border-radius:18px 18px 4px 18px;padding:12px 34px 12px 14px;font:600 14px/1.4 Manrope,system-ui,sans-serif;box-shadow:0 10px 28px rgba(42,52,97,.18);cursor:pointer;animation:mkIn .35s ease}' +
  '.mk-tease b{color:#2A3461;font-family:Montserrat,sans-serif}.mk-tease button{position:absolute;top:6px;right:8px;border:0;background:none;color:#4B5675;font-size:18px;cursor:pointer;line-height:1}' +
  '.mk-panel{position:fixed;right:20px;bottom:20px;z-index:9999;width:390px;max-width:calc(100vw - 24px);height:620px;max-height:calc(100vh - 40px);background:#F6F8FB;border-radius:22px;box-shadow:0 24px 60px rgba(27,34,80,.35);display:none;flex-direction:column;overflow:hidden;font-family:Manrope,system-ui,sans-serif;color:#1B2140;animation:mkIn .25s ease}' +
  '.mk-panel.open{display:flex}@keyframes mkIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
  '.mk-head{background:linear-gradient(135deg,#2A3461,#1B2250);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}' +
  '.mk-face{position:relative;width:52px;height:52px;border-radius:50%;overflow:hidden;border:2px solid #2DA8DD;flex-shrink:0;background:#C9D2EA}' +
  '.mk-face img,.mk-face video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.mk-face video{opacity:0;transition:opacity .2s}.mk-face.talk video{opacity:1}' +
  '.mk-name{font:800 17px/1.1 Montserrat,sans-serif}.mk-sub{font-size:12px;color:#C9D2EA;margin-top:3px;display:flex;align-items:center;gap:6px}' +
  '.mk-dot{width:8px;height:8px;border-radius:50%;background:#5CC4EE;display:inline-block}' +
  '.mk-x{margin-left:auto;background:rgba(255,255,255,.12);border:0;color:#fff;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer;line-height:1}.mk-x:hover{background:rgba(255,255,255,.25)}' +
  '.mk-body{flex:1;overflow-y:auto;padding:16px 14px 6px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}' +
  '.mk-row{display:flex;gap:8px;align-items:flex-end;max-width:100%}.mk-row.me{justify-content:flex-end}' +
  '.mk-row img.mk-mini{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0}' +
  '.mk-msg{max-width:80%;padding:10px 14px;border-radius:18px 18px 18px 4px;background:#fff;border:1px solid #E1E6EF;font-size:14.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}' +
  '.mk-row.me .mk-msg{background:#2A3461;color:#fff;border-color:#2A3461;border-radius:18px 18px 4px 18px}' +
  '.mk-msg a{color:#1E8FC2;font-weight:700}.mk-msg small{color:#4B5675;font-size:12px}' +
  '.mk-typing{display:inline-flex;gap:4px;padding:14px 16px}.mk-typing i{width:7px;height:7px;border-radius:50%;background:#2DA8DD;animation:mkB 1s infinite}.mk-typing i:nth-child(2){animation-delay:.15s}.mk-typing i:nth-child(3){animation-delay:.3s}' +
  '@keyframes mkB{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-5px);opacity:1}}' +
  '.mk-chips{display:flex;flex-wrap:wrap;gap:8px;padding:2px 0 4px 36px}' +
  '.mk-chip{border:1.5px solid #2A3461;background:#fff;color:#2A3461;border-radius:999px;padding:8px 13px;font:700 13.5px Manrope,sans-serif;cursor:pointer;text-decoration:none;transition:all .15s}' +
  '.mk-chip:hover{background:#2A3461;color:#fff}.mk-chip.pri{background:#2DA8DD;border-color:#2DA8DD;color:#1B2250}.mk-chip.pri:hover{background:#1E8FC2;color:#fff}' +
  '.mk-card{background:#fff;border:1px solid #E1E6EF;border-radius:16px;padding:14px;margin-left:36px;font-size:14px}' +
  '.mk-card .mk-price{font:800 26px Montserrat,sans-serif;color:#2A3461}.mk-card .mk-price span{font-size:14px;color:#4B5675;font-weight:700}' +
  '.mk-foot{border-top:1px solid #E1E6EF;background:#fff;padding:10px;display:flex;gap:8px;flex-shrink:0}' +
  '.mk-in{flex:1;border:1.5px solid #E1E6EF;border-radius:999px;padding:11px 16px;font:500 15px Manrope,sans-serif;outline:none;color:#1B2140;min-width:0}.mk-in:focus{border-color:#2DA8DD}' +
  '.mk-send{width:44px;height:44px;border-radius:50%;border:0;background:#2A3461;color:#fff;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}.mk-send:hover{background:#1E8FC2}' +
  '.mk-legal{font-size:10.5px;color:#4B5675;text-align:center;padding:0 10px 8px;background:#fff}.mk-legal a{color:#4B5675}' +
  '.mk-conf{position:fixed;inset:0;pointer-events:none;z-index:10000;overflow:hidden}.mk-conf i{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;animation:mkFall 1.8s ease-in forwards}' +
  '@keyframes mkFall{to{transform:translateY(105vh) rotate(720deg);opacity:.9}}' +
  '.mk-meet{position:relative;overflow:hidden;background:radial-gradient(1200px 500px at 15% 0%,#34407A 0%,#2A3461 45%,#1B2250 100%);color:#fff;padding:clamp(56px,7vw,88px) 0}' +
  '.mk-meet-in{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(28px,5vw,72px);align-items:center}' +
  '.mk-meet-vid{position:relative;justify-self:center;width:min(340px,78vw);aspect-ratio:1}' +
  '.mk-ring{position:absolute;inset:0;border-radius:50%;padding:6px;background:conic-gradient(from 0deg,#2DA8DD,#9FDCF5,#2DA8DD,#5CC4EE,#2DA8DD);animation:mkSpin 8s linear infinite;box-shadow:0 0 0 10px rgba(45,168,221,.12),0 30px 70px rgba(0,0,0,.35)}' +
  '.mk-ring>div{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#C9D2EA;animation:mkSpin 8s linear infinite reverse}.mk-ring video{width:100%;height:100%;object-fit:cover;display:block}' +
  '@keyframes mkSpin{to{transform:rotate(360deg)}}' +
  '.mk-live{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);background:#fff;color:#2A3461;border-radius:999px;padding:7px 14px;font:800 12px Montserrat,sans-serif;letter-spacing:.08em;display:flex;align-items:center;gap:7px;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.25)}' +
  '.mk-live i{width:9px;height:9px;border-radius:50%;background:#2DA8DD;animation:mkPulse 2s infinite}' +
  '.mk-say{position:absolute;right:-18px;top:6%;background:#fff;color:#1B2140;border-radius:18px 18px 18px 4px;padding:10px 14px;font:700 14px/1.35 Manrope,sans-serif;max-width:190px;box-shadow:0 12px 30px rgba(0,0,0,.25);animation:mkFloat 4s ease-in-out infinite}' +
  '@keyframes mkFloat{50%{transform:translateY(-8px)}}' +
  '.mk-meet h2{color:#fff;margin:10px 0 14px}.mk-meet h2 span{color:#5CC4EE}.mk-meet .lead{color:#C9D2EA;max-width:560px}' +
  '.mk-feats{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 26px}.mk-feats span{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:8px 14px;font-weight:700;font-size:14px}' +
  '.mk-try{font:800 12px Montserrat,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#9FDCF5;margin-bottom:10px}' +
  '.mk-asks{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:28px}.mk-asks button{background:#fff;color:#2A3461;border:0;border-radius:16px 16px 16px 4px;padding:11px 15px;font:700 14px Manrope,sans-serif;cursor:pointer;transition:transform .15s,background .15s}.mk-asks button:hover{transform:translateY(-2px);background:#DDF1FA}' +
  '.mk-bub{position:absolute;bottom:-60px;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.55),rgba(159,220,245,.12) 60%,rgba(45,168,221,.05));border:1px solid rgba(255,255,255,.25);animation:mkRise linear infinite;z-index:0}' +
  '@keyframes mkRise{to{transform:translateY(-130vh) translateX(30px)}}' +
  '@media (max-width:820px){.mk-meet-in{grid-template-columns:1fr;text-align:center}.mk-meet .lead{margin:0 auto}.mk-feats,.mk-asks{justify-content:center}.mk-say{right:-6px;top:-8px;font-size:13px;max-width:160px}}' +
  '@media (max-width:820px){.mk-bub{opacity:.45}}' +
  '@media (prefers-reduced-motion:reduce){.mk-ring,.mk-ring>div,.mk-say,.mk-bub,.mk-launch.peek{animation:none}}' +
  '@media (max-width:820px){.mk-launch{bottom:84px;right:14px;width:60px;height:60px}.mk-tease{bottom:92px;right:84px}}' +
  '@media (max-width:560px){.mk-panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100%;max-height:100%;border-radius:0}.mk-in{font-size:16px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ===== DOM =====
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var launch = el('button', 'mk-launch'); launch.setAttribute('aria-label', 'Chat with Mikey Clean');
  launch.innerHTML = '<img src="' + AVATAR + '" alt="Mikey Clean"><video muted playsinline preload="none" src="' + TALK + '"></video>';
  var panel = el('div', 'mk-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Chat with Mikey Clean');
  panel.innerHTML =
    '<div class="mk-head"><div class="mk-face"><img src="' + AVATAR + '" alt=""><video muted loop playsinline preload="none" src="' + TALK + '"></video></div>' +
    '<div><div class="mk-name">Mikey Clean</div><div class="mk-sub"><span class="mk-dot"></span>Your AI cleaning friend</div></div>' +
    '<button class="mk-x" aria-label="Close chat">&times;</button></div>' +
    '<div class="mk-body" aria-live="polite"></div>' +
    '<form class="mk-foot"><input class="mk-in" type="text" placeholder="Ask Mikey anything..." aria-label="Message" maxlength="500" autocomplete="off">' +
    '<button class="mk-send" type="submit" aria-label="Send"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg></button></form>' +
    '<div class="mk-legal">Mikey is an AI assistant and can make mistakes. <a href="' + BASE + 'privacy.html">Privacy</a></div>';
  document.body.appendChild(launch); document.body.appendChild(panel);

  var body = panel.querySelector('.mk-body'), face = panel.querySelector('.mk-face'), vid = face.querySelector('video');
  var form = panel.querySelector('.mk-foot'), input = panel.querySelector('.mk-in');
  var history = [], aiTurns = 0, flow = null, lead = {}, started = false, busy = false;

  function scroll() { body.scrollTop = body.scrollHeight; }
  function talk(on) { face.classList.toggle('talk', on); try { on ? vid.play().catch(function () {}) : vid.pause(); } catch (e) {} }
  function clearChips() { body.querySelectorAll('.mk-chips').forEach(function (c) { c.remove(); }); }

  function linkify(t) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\(929\) 760-5230/g, '<a href="tel:' + PHONE + '">' + PHONE_TXT + '</a>');
  }
  function userSay(t) {
    var r = el('div', 'mk-row me'); r.appendChild(el('div', 'mk-msg', esc(t))); body.appendChild(r);
    history.push({ role: 'user', content: t }); scroll();
  }
  function botNow(html, raw) {
    var r = el('div', 'mk-row'); r.innerHTML = '<img class="mk-mini" src="' + AVATAR + '" alt="">';
    r.appendChild(el('div', 'mk-msg', html)); body.appendChild(r);
    if (raw) history.push({ role: 'assistant', content: raw });
    scroll();
  }
  // Mikey "types" (his video face talks) then speaks
  function say(text, then, isHtml) {
    busy = true;
    var r = el('div', 'mk-row'); r.innerHTML = '<img class="mk-mini" src="' + AVATAR + '" alt=""><div class="mk-msg mk-typing"><i></i><i></i><i></i></div>';
    body.appendChild(r); scroll(); talk(true);
    var delay = Math.min(1400, 450 + text.length * 9);
    setTimeout(function () {
      r.remove(); botNow(isHtml ? text : linkify(text), isHtml ? text.replace(/<[^>]+>/g, '') : text);
      setTimeout(function () { talk(false); }, 900);
      busy = false; if (then) then();
    }, delay);
  }
  function chips(list) {
    clearChips();
    var c = el('div', 'mk-chips');
    list.forEach(function (it) {
      var b;
      if (it.href) { b = el('a', 'mk-chip' + (it.pri ? ' pri' : ''), esc(it.label)); b.href = it.href; if (/^http/.test(it.href)) { b.target = '_blank'; b.rel = 'noopener'; } b.addEventListener('click', function () { track('mikey_click', { item: it.label }); }); }
      else { b = el('button', 'mk-chip' + (it.pri ? ' pri' : ''), esc(it.label)); b.type = 'button'; b.addEventListener('click', function () { if (busy) return; clearChips(); userSay(it.label); it.go(); }); }
      c.appendChild(b);
    });
    body.appendChild(c); scroll();
  }
  function card(html) { var c = el('div', 'mk-card', html); body.appendChild(c); scroll(); }

  // ===== MENUS =====
  var MENU = [
    { label: '💰 Get a quote', pri: true, go: startQuote },
    { label: '📅 Book now', go: book },
    { label: '🧽 Services', go: services },
    { label: '📍 Areas we serve', go: areas },
    { label: '🏢 Commercial & buildings', go: commercial },
    { label: '🚚 Moving soon?', go: moving },
    { label: '🎁 Refer a Friend', go: refer },
    { label: '👋 Talk to a human', go: human }
  ];
  function menu(msg) { say(msg || 'What else can I help you with?', function () { chips(MENU); }); }
  function moreChips() { chips([{ label: '💰 Get a quote', pri: true, go: startQuote }, { label: '📅 Book now', go: book }, { label: '☰ Main menu', go: function () { menu(); } }]); }

  function greet() {
    started = true;
    var open = nyOpen();
    say('Hey there, I\'m Mikey Clean 👋 your AI cleaning friend from Clean Cleaners NYC!', function () {
      say(open ? 'I can get you a quote in about 60 seconds, help you book, or answer any question. What do you need today?'
               : 'Our team is offline right now, but I\'m here 24/7. Leave your details and we\'ll text you first thing in the morning. What do you need?', function () { chips(MENU); });
    });
    track('mikey_open');
  }

  function book() {
    track('mikey_book');
    say('Booking takes about a minute and you\'ll see your exact price right away. We bring all supplies, and baseboards are included in every clean.', function () {
      chips([{ label: 'Open booking page', pri: true, href: BOOK_URL }, { label: '💰 Quote first', go: startQuote }, { label: '☰ Main menu', go: function () { menu(); } }]);
    });
  }
  function services() {
    say('Here\'s what our insured team does across all 5 boroughs:\n\n🧼 **Deep Cleaning**: inside appliances, grout, baseboards, behind furniture\n📦 **Move In / Move Out**: deposit-ready, cabinets and appliance interiors included\n🏠 **Airbnb turnovers**: same-day, linens and restocking\n♨️ **Premium Steam Clean**: steam sanitizing for kitchens and baths\n🏗️ **Post Construction**: dust and debris cleanup after renovations\n🏢 **Office, Building & Condo**: after hours, wall washing, stairwells, landings\n\nHome cleaning starts at **$199 + tax** (based on a 1 bedroom, 1 bathroom apartment).', moreChips);
  }
  function areas() {
    say('We clean all 5 boroughs: **Manhattan, Brooklyn, Queens, the Bronx and Staten Island**. Walk-ups, elevator buildings, brownstones, we know NYC homes. 🗽\n\nDrop your zip code in a quote and I\'ll confirm we\'ve got you covered.', moreChips);
  }
  function commercial() {
    say('We love offices, condos and buildings! After-hours service, wall washing, stairwells, landings and baseboards, floor by floor, on a schedule your residents will notice. We carry General Liability and Workers\' Comp and can issue a COI for your building.', function () {
      chips([{ label: '📝 Request a commercial quote', pri: true, go: function () { startQuote('Office / Commercial'); } }, { label: 'See commercial page', href: BASE + 'building-cleaning/' }, { label: '☰ Main menu', go: function () { menu(); } }]);
    });
  }
  function moving() {
    say('Moving soon? 🚚 Make it a piece of cake! Our official partner **Piece of Cake Moving & Storage** gives our clients **10% off local moves** and **5% off long distance** with code **CLEAN20**.\n\nAnd we\'ll make the old place deposit-ready and the new place spotless. 😉', function () {
      chips([{ label: '📦 Move-out clean quote', pri: true, go: function () { startQuote('Move In / Move Out'); } }, { label: '📞 Call Piece of Cake', href: 'tel:+12126517273' }, { label: '☰ Main menu', go: function () { menu(); } }]);
    });
  }
  function refer() {
    say('Love your clean? Join our **Refer a Friend Club**! Your friends get a discount on their first cleaning and you earn rewards when they book. 🎁', function () {
      chips([{ label: 'Join the club', pri: true, href: BASE + 'refer-a-friend/' }, { label: '☰ Main menu', go: function () { menu(); } }]);
    });
  }
  function human() {
    track('mikey_human');
    say(nyOpen() ? 'You got it! Our team is around now. Text or call us and a real person will help you.' : 'Our team is offline right now (Mon to Fri 8am to 6pm, Sat 9am to 5pm, Sun 10am to 4pm). Text us and we\'ll reply first thing, or leave your details and we\'ll reach out.', function () {
      chips([{ label: '💬 Text us', pri: true, href: 'sms:' + PHONE }, { label: '📞 Call ' + PHONE_TXT, href: 'tel:' + PHONE }, { label: '📝 Leave my details', go: startQuote }]);
    });
  }

  // ===== QUOTE FLOW =====
  var SERVICES = ['Deep Cleaning', 'Regular Cleaning', 'Move In / Move Out', 'Airbnb Turnover', 'Steam Cleaning', 'Post Construction', 'Office / Commercial'];
  function startQuote(preset) {
    lead = { source: 'Mikey Clean chat', page: location.pathname };
    track('mikey_quote_start');
    if (typeof preset === 'string') { lead.service = preset; return preset === 'Office / Commercial' ? askCommercialSize() : askBeds(); }
    say('Awesome, let\'s get you a quote! ✨ What kind of cleaning do you need?', function () {
      chips(SERVICES.map(function (s) { return { label: s, go: function () { lead.service = s; s === 'Office / Commercial' ? askCommercialSize() : askBeds(); } }; }));
    });
  }
  function askCommercialSize() {
    say('What kind of space is it?', function () {
      chips(['Office', 'Building / Condo common areas', 'Retail / Store', 'Other'].map(function (s) { return { label: s, go: function () { lead.size = s; askZip(); } }; }));
    });
  }
  function askBeds() {
    say('How many bedrooms?', function () {
      chips(['Studio', '1 bedroom', '2 bedrooms', '3 bedrooms', '4+ bedrooms'].map(function (s) { return { label: s, go: function () { lead.bedrooms = s; askBaths(); } }; }));
    });
  }
  function askBaths() {
    say('And bathrooms?', function () {
      chips(['1 bathroom', '2 bathrooms', '3+ bathrooms'].map(function (s) { return { label: s, go: function () { lead.bathrooms = s; askZip(); } }; }));
    });
  }
  function askZip() { flow = 'zip'; say('What\'s the zip code? 📍'); input.placeholder = 'e.g. 11204'; input.inputMode = 'numeric'; input.focus(); }
  function askWhen() {
    say('When would you like us there?', function () {
      chips(['ASAP / tomorrow', 'This week', 'Next week', 'Just checking prices'].map(function (s) { return { label: s, go: function () { lead.when = s; askName(); } }; }));
    });
  }
  function askName() { flow = 'name'; input.inputMode = 'text'; input.placeholder = 'Your first name'; say('Almost done! What\'s your name?'); input.focus(); }
  function askPhone() { flow = 'phone'; input.inputMode = 'tel'; input.placeholder = '(555) 555-5555'; say('Nice to meet you, ' + lead.name + '! 🙌 What\'s the best phone number to text your quote to?'); input.focus(); }
  function askEmail() { flow = 'email'; input.inputMode = 'email'; input.placeholder = 'you@email.com (optional)'; say('And your email? (optional, type "skip" if you prefer)'); input.focus(); }

  function handleFlow(t) {
    if (flow === 'zip') {
      var z = (t.match(/\b\d{5}\b/) || [])[0];
      if (!z) { say('Hmm, I need a 5-digit zip code. Try again? 🙂'); return; }
      lead.zip = z; flow = null; input.inputMode = 'text'; input.placeholder = 'Ask Mikey anything...';
      var nyc = /^(10[0-4]\d\d|11[0-6]\d\d)$/.test(z);
      say(nyc ? 'Great, we cover that area! ✅' : 'That zip looks outside NYC, but send it over and our team will check. 👍', askWhen);
      return;
    }
    if (flow === 'name') { lead.name = t.slice(0, 60); flow = null; askPhone(); return; }
    if (flow === 'phone') {
      var d = t.replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1);
      if (d.length !== 10) { say('That doesn\'t look like a full phone number. Can you double check it? 📱'); return; }
      lead.phone = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6); flow = null; askEmail(); return;
    }
    if (flow === 'email') {
      if (!/^skip|no$/i.test(t)) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) { say('That email looks off. Try again, or type "skip". ✉️'); return; }
        lead.email = t;
      }
      flow = null; input.inputMode = 'text'; input.placeholder = 'Ask Mikey anything...'; finishQuote(); return;
    }
  }

  function sendLead(data) {
    data.time_ny = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    data.transcript = history.slice(-20).map(function (m) { return (m.role === 'user' ? 'Visitor: ' : 'Mikey: ') + m.content; }).join('\n');
    track('mikey_lead', { service: data.service || '' });
    if (MIKEY_API) {
      return fetch(MIKEY_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'lead', lead: data }) }).catch(function () { return fallback(data); });
    }
    return fallback(data);
  }
  function fallback(data) {
    var f = {}; Object.keys(data).forEach(function (k) { f[k] = data[k]; });
    f._subject = 'New Mikey Clean lead: ' + (data.name || '') + ' (' + (data.service || 'chat') + ')'; f._template = 'table'; f._captcha = 'false';
    return fetch(LEAD_FALLBACK, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(f) }).catch(function () {});
  }

  function confetti() {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    var c = el('div', 'mk-conf'), cols = ['#2DA8DD', '#2A3461', '#5CC4EE', '#9FDCF5', '#E8A317', '#ffffff'];
    for (var i = 0; i < 70; i++) { var b = el('i'); b.style.left = Math.random() * 100 + '%'; b.style.background = cols[i % cols.length]; b.style.animationDelay = Math.random() * .5 + 's'; b.style.animationDuration = 1.4 + Math.random() * 1.2 + 's'; c.appendChild(b); }
    document.body.appendChild(c); setTimeout(function () { c.remove(); }, 3500);
  }
  function finishQuote() {
    sendLead(lead); confetti();
    var isHome = lead.service !== 'Office / Commercial' && lead.service !== 'Post Construction';
    say('Thanks ' + lead.name + '! 🎉 Got everything. ' + (nyOpen() ? 'Our team will text you at ' + lead.phone + ' shortly.' : 'Our team will text you at ' + lead.phone + ' first thing in the morning.'), function () {
      if (isHome) {
        card('<div style="font-weight:700;color:#4B5675;font-size:13px">' + esc(lead.service) + ' · ' + esc(lead.bedrooms || '') + ' · ' + esc(lead.bathrooms || '') + '</div>' +
          '<div class="mk-price">Starting at $199 <span>+ tax</span></div>' +
          '<small>Starting price based on a 1 bedroom, 1 bathroom apartment. Your exact price shows on the booking page.</small>' +
          '<div style="margin-top:8px;font-size:13px">✅ We bring all supplies &nbsp; ✅ Baseboards included &nbsp; ✅ Free re-clean in 24 to 48 hrs</div>');
        chips([{ label: '📅 Book now & see exact price', pri: true, href: BOOK_URL }, { label: '☰ Main menu', go: function () { menu(); } }]);
      } else {
        say('Every ' + (lead.service === 'Post Construction' ? 'post construction job' : 'commercial space') + ' is different, so we\'ll put together a custom quote for you. 📋', function () {
          chips([{ label: '📞 Call ' + PHONE_TXT, pri: true, href: 'tel:' + PHONE }, { label: '☰ Main menu', go: function () { menu(); } }]);
        });
      }
    });
  }

  // ===== FREE TEXT: local brain (Phase 1) =====
  var BRAIN = [
    [/price|cost|how much|rate|quote|charge|\$/i, 'Home cleaning starts at **$199 + tax** (based on a 1 bedroom, 1 bathroom apartment). Your exact price depends on size and service, and you\'ll see it right away when you book. Want a quick quote?', 'quote'],
    [/deposit/i, 'Yes, a deposit is required to hold your booking. The rest is due after your cleaning.', 'more'],
    [/suppl|product|equipment|bring|vacuum|chemical/i, 'Yes! We bring all supplies and professional products to every job. You don\'t need to provide anything. 🧴', 'more'],
    [/insur|coi|licens|bond/i, 'We\'re fully insured with General Liability and Workers\' Compensation, BBB accredited, and we can issue a certificate of insurance (COI) for your building. ✅', 'more'],
    [/happy|re-?clean|guarantee|satisf|complain|refund/i, 'Not happy? Tell us within 24 hours and we\'ll come back for a **free re-clean within 24 to 48 hours**. 💙', 'more'],
    [/be home|at home|key|doorman|lockbox|be there|access/i, 'You don\'t need to be home! Many clients leave a key with the doorman or use a lockbox. We\'ll confirm access when you book.', 'more'],
    [/pay|card|venmo|zelle|cash|apple pay/i, 'We accept Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay, Stripe, Zelle and Venmo. We don\'t accept cash.', 'more'],
    [/month|subscri|recurr|weekly|biweekly|plan/i, 'Yes, we have monthly plans that include one deep clean a month. Text or call (929) 760-5230 to set one up!', 'more'],
    [/hour|open|close|time|when are you/i, 'Our team is available Mon to Fri 8am to 6pm, Sat 9am to 5pm and Sun 10am to 4pm. I\'m here 24/7 though! 😄', 'more'],
    [/move|moving|piece of cake/i, null, moving],
    [/office|commercial|building|condo|stair|landlord|property/i, null, commercial],
    [/refer|friend|discount|promo|coupon|\bcode\b|\bdeals?\b|\boff\b/i, null, refer],
    [/area|borough|serve|manhattan|brooklyn|queens|bronx|staten|zip|location/i, null, areas],
    [/service|offer|do you (do|clean)|airbnb|steam|deep|construction/i, null, services],
    [/book|schedule|appointment|availab|tomorrow|today/i, null, book],
    [/human|person|agent|call|talk|text|phone|number|someone/i, null, human],
    [/walls?|cabinet|window|laundry|oven|fridge|organiz/i, 'Great question! Deep cleans include inside appliances, but some items like walls, inside cabinets (outside of move-outs), laundry and organizing can be extras. Our team will confirm exactly what you need. Want a quote?', 'quote'],
    [/^(hi|hey|hello|hola|yo|good (morning|afternoon|evening))\b/i, 'Hey! 👋 What can I help you with today?', 'menu'],
    [/thank|thx|awesome|great|perfect|cool/i, 'Anytime! 💙 Anything else I can help with?', 'menu']
  ];
  function localAnswer(t) {
    for (var i = 0; i < BRAIN.length; i++) {
      if (BRAIN[i][0].test(t)) {
        var ans = BRAIN[i][1], nx = BRAIN[i][2];
        if (typeof nx === 'function') return nx();
        return say(ans, nx === 'quote' ? function () { chips([{ label: '💰 Get a quote', pri: true, go: startQuote }, { label: '📅 Book now', go: book }]); } : nx === 'menu' ? function () { chips(MENU); } : moreChips);
      }
    }
    say('Good question! I want to make sure you get the right answer, so let me connect you with our team. 🙌', function () {
      chips([{ label: '💬 Text our team', pri: true, href: 'sms:' + PHONE }, { label: '💰 Get a quote', go: startQuote }, { label: '☰ Main menu', go: function () { menu(); } }]);
    });
  }

  // ===== FREE TEXT: AI (Phase 2) =====
  var ACTIONS = { '[[QUOTE]]': { label: '💰 Get a quote', pri: true, go: startQuote }, '[[BOOK]]': { label: '📅 Book now', pri: true, href: BOOK_URL }, '[[HUMAN]]': { label: '👋 Talk to a human', go: human }, '[[MOVING]]': { label: '🚚 Moving discount', go: moving }, '[[REFER]]': { label: '🎁 Refer a Friend', go: refer } };
  function aiAnswer(t) {
    if (aiTurns >= MAX_AI_TURNS) return localAnswer(t);
    aiTurns++; busy = true;
    var r = el('div', 'mk-row'); r.innerHTML = '<img class="mk-mini" src="' + AVATAR + '" alt=""><div class="mk-msg mk-typing"><i></i><i></i><i></i></div>';
    body.appendChild(r); scroll(); talk(true);
    var sid = store('mk_sid') || (Math.random().toString(36).slice(2) + Date.now().toString(36)); store('mk_sid', sid);
    fetch(MIKEY_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'chat', sid: sid, page: location.pathname, open: nyOpen(), messages: history.slice(-12) }) })
      .then(function (res) { return res.json(); })
      .then(function (j) {
        r.remove(); busy = false;
        if (!j || !j.reply) throw new Error('empty');
        var reply = j.reply, acts = [];
        Object.keys(ACTIONS).forEach(function (k) { if (reply.indexOf(k) > -1) { acts.push(ACTIONS[k]); reply = reply.split(k).join(''); } });
        reply = reply.replace(/\s*[—–]\s*/g, ', ').trim();
        botNow(linkify(reply), reply); setTimeout(function () { talk(false); }, 900);
        if (acts.length) chips(acts.concat([{ label: '☰ Main menu', go: function () { menu(); } }]));
      })
      .catch(function () { r.remove(); busy = false; talk(false); localAnswer(t); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim(); if (!t || busy) return;
    input.value = ''; clearChips(); userSay(t);
    if (flow) return handleFlow(t);
    if (MIKEY_API) aiAnswer(t); else localAnswer(t);
  });

  // ===== OPEN / CLOSE =====
  var tease;
  function openChat() {
    panel.classList.add('open'); launch.style.display = 'none'; if (tease) { tease.remove(); tease = null; }
    if (!started) greet(); setTimeout(function () { if (window.innerWidth > 560) input.focus(); }, 300);
    store('mk_open', '1');
  }
  function closeChat() { panel.classList.remove('open'); launch.style.display = ''; talk(false); store('mk_open', '0'); }
  launch.addEventListener('click', openChat);
  panel.querySelector('.mk-x').addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) closeChat(); });
  function ask(q) {
    if (!started) { started = true; track('mikey_open'); }
    panel.classList.add('open'); launch.style.display = 'none'; if (tease) { tease.remove(); tease = null; }
    var go = function () { if (busy) return setTimeout(go, 300); clearChips(); flow = null; userSay(q); if (MIKEY_API) aiAnswer(q); else localAnswer(q); };
    if (!body.children.length) say('Hey there, I\'m Mikey Clean 👋 Great question!', go); else go();
    track('mikey_try_ask', { q: q });
  }
  window.MikeyClean = { open: openChat, close: closeChat, ask: ask };

  // Launcher "peek": Mikey waves at you with his video
  function peek() {
    var v = launch.querySelector('video'); launch.classList.add('peek');
    try { v.currentTime = 0; v.play().catch(function () {}); } catch (e) {}
    setTimeout(function () { launch.classList.remove('peek'); try { v.pause(); } catch (e) {} }, 3600);
  }

  // Homepage "Meet Mikey" section
  (function meet() {
    var services = document.getElementById('services');
    if (!services || !document.getElementById('moving-partner') || document.getElementById('meet-mikey')) return;
    var asks = ['How much for a 2 bedroom deep clean?', 'Do you bring your own supplies?', 'Can you clean my office?', 'Do you clean Airbnbs?'];
    var sec = el('section', 'mk-meet'); sec.id = 'meet-mikey'; sec.setAttribute('aria-label', 'Meet Mikey Clean, our AI assistant');
    var bubs = '';
    for (var i = 0; i < 12; i++) { var sz = 14 + Math.round(Math.random() * 46); bubs += '<span class="mk-bub" style="left:' + Math.round(Math.random() * 100) + '%;width:' + sz + 'px;height:' + sz + 'px;animation-duration:' + (9 + Math.random() * 10).toFixed(1) + 's;animation-delay:-' + (Math.random() * 12).toFixed(1) + 's"></span>'; }
    sec.innerHTML = bubs +
      '<div class="wrap mk-meet-in">' +
      '<div class="mk-meet-vid"><div class="mk-ring"><div><video autoplay muted loop playsinline preload="metadata" poster="' + AVATAR + '" src="' + TALK + '"></video></div></div>' +
      '<div class="mk-say">Hey! Want a price in 60 seconds? ✨</div><div class="mk-live"><i></i>ONLINE 24/7</div></div>' +
      '<div><div class="eyebrow" style="color:#9FDCF5">New · Your AI cleaning friend</div>' +
      '<h2>Meet <span>Mikey Clean</span>.<br>Ask him anything, anytime.</h2>' +
      '<p class="lead">Get a price, book a clean or get answers in seconds, day or night. And if you want a real person, our team is one tap away.</p>' +
      '<div class="mk-feats"><span>⚡ Quote in 60 seconds</span><span>🗽 All 5 boroughs</span><span>🌙 Open 24/7</span><span>👋 Real humans one tap away</span></div>' +
      '<div class="mk-try">Try asking Mikey</div><div class="mk-asks"></div>' +
      '<button class="btn btn-light mk-go" type="button">💬 Chat with Mikey</button></div></div>';
    var box = sec.querySelector('.mk-asks');
    asks.forEach(function (q) { var b = el('button', '', esc(q)); b.type = 'button'; b.addEventListener('click', function () { ask(q); }); box.appendChild(b); });
    sec.querySelector('.mk-go').addEventListener('click', openChat);
    services.parentNode.insertBefore(sec, services);
    var v = sec.querySelector('video'); try { v.play().catch(function () {}); } catch (e) {}
  })();

  // Teaser bubble once per visit
  if (!store('mk_teased')) {
    setTimeout(function () {
      if (panel.classList.contains('open')) return;
      store('mk_teased', '1');
      tease = el('div', 'mk-tease', '<b>Hi, I\'m Mikey Clean! 👋</b><br>Want a cleaning quote in 60 seconds?<button aria-label="Dismiss">&times;</button>');
      tease.addEventListener('click', function (e) { if (e.target.tagName === 'BUTTON') { tease.remove(); tease = null; return; } openChat(); });
      document.body.appendChild(tease); peek();
    }, 7000);
  }
  var peeks = 0, pk = setInterval(function () { if (panel.classList.contains('open') || ++peeks > 3) { if (peeks > 3) clearInterval(pk); return; } peek(); }, 25000);
})();
