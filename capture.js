/**
 * capture.js — drop-in lead capture modal for nathanknottingham.com
 *
 * HOW TO USE
 *   1. Set your endpoint once, before this script loads, on any page:
 *        <script>
 *          window.LEAD_ENDPOINT = 'https://script.google.com/macros/s/XXXX/exec';
 *        </script>
 *        <script src="/capture.js" defer></script>
 *
 *   2. Any button/link that should open the form gets these attributes:
 *        <a href="#"
 *           data-lead-open
 *           data-download="/homebuyer-guide.pdf"
 *           data-interest="Homebuyer Guide"
 *           data-source="homebuyer">Download the free guide</a>
 *
 *   data-download = the file that downloads after they submit
 *   data-interest = what they wanted (shows in your Sheet + email)
 *   data-source   = which page it came from
 */
(function () {
  'use strict';

  var ENDPOINT = window.LEAD_ENDPOINT || '';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Styles ----
  var css =
    '.lc-overlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;' +
      'background:rgba(10,18,32,.72);backdrop-filter:blur(4px);padding:24px;}' +
    '.lc-overlay.lc-on{display:flex;}' +
    '.lc-box{background:#F2F0EA;color:#101B2D;max-width:440px;width:100%;padding:32px 28px;border-top:4px solid #C9963B;' +
      'box-shadow:0 20px 60px rgba(0,0,0,.4);position:relative;' + (reduce ? '' : 'animation:lcIn .2s ease;') + '}' +
    '@keyframes lcIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}' +
    '.lc-box h3{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:1.5rem;line-height:1.1;margin:0 0 8px;}' +
    '.lc-box p{font-family:"Source Serif 4",Georgia,serif;color:#4A5261;font-size:.98rem;line-height:1.55;margin:0 0 20px;}' +
    '.lc-box label{display:block;font-family:"IBM Plex Mono",monospace;font-size:.68rem;letter-spacing:.1em;' +
      'text-transform:uppercase;color:#B41824;margin:0 0 6px;}' +
    '.lc-box input{width:100%;font-family:"Source Serif 4",Georgia,serif;font-size:1rem;padding:11px 12px;' +
      'border:1px solid rgba(16,27,45,.25);background:#fff;color:#101B2D;margin:0 0 16px;box-sizing:border-box;}' +
    '.lc-box input:focus{outline:2px solid #C9963B;outline-offset:1px;border-color:#C9963B;}' +
    '.lc-btn{width:100%;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:1rem;cursor:pointer;' +
      'padding:14px;border:0;background:#B41824;color:#fff;transition:opacity .15s ease;}' +
    '.lc-btn:hover{opacity:.92;}.lc-btn:disabled{opacity:.6;cursor:default;}' +
    '.lc-close{position:absolute;top:12px;right:14px;background:none;border:0;font-size:1.6rem;line-height:1;' +
      'color:#8B94A3;cursor:pointer;font-family:sans-serif;}' +
    '.lc-close:hover{color:#101B2D;}' +
    '.lc-fine{font-family:"IBM Plex Mono",monospace;font-size:.62rem;letter-spacing:.03em;color:#8B94A3;margin:14px 0 0;line-height:1.5;}' +
    '.lc-msg{font-family:"Source Serif 4",Georgia,serif;font-size:.95rem;margin:0 0 12px;min-height:1px;}' +
    '.lc-msg.err{color:#B41824;}.lc-msg.ok{color:#1c7c3b;}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---- Modal markup ----
  var overlay = document.createElement('div');
  overlay.className = 'lc-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'lc-title');
  overlay.innerHTML =
    '<div class="lc-box">' +
      '<button class="lc-close" aria-label="Close">&times;</button>' +
      '<h3 id="lc-title">Get the free guide</h3>' +
      '<p id="lc-sub">Tell me where to send it and it downloads right away. No spam, just the guide and the occasional useful thing.</p>' +
      '<div class="lc-msg" aria-live="polite"></div>' +
      '<label for="lc-name">Your name</label>' +
      '<input id="lc-name" type="text" autocomplete="name" placeholder="First and last">' +
      '<label for="lc-email">Email</label>' +
      '<input id="lc-email" type="email" autocomplete="email" placeholder="you@email.com">' +
      '<label for="lc-phone">Phone (optional)</label>' +
      '<input id="lc-phone" type="tel" autocomplete="tel" placeholder="So I can follow up if you want">' +
      '<button class="lc-btn" type="button">Send it to me</button>' +
      '<p class="lc-fine">By submitting, you agree to be contacted about your inquiry. ' +
        'Nathan Knottingham, NMLS #270165. EDGE Home Finance, LLC, NMLS #891464. Equal Housing Opportunity.</p>' +
    '</div>';
  document.body.appendChild(overlay);

  var box     = overlay.querySelector('.lc-box');
  var titleEl = overlay.querySelector('#lc-title');
  var subEl   = overlay.querySelector('#lc-sub');
  var msgEl   = overlay.querySelector('.lc-msg');
  var nameEl  = overlay.querySelector('#lc-name');
  var emailEl = overlay.querySelector('#lc-email');
  var phoneEl = overlay.querySelector('#lc-phone');
  var submit  = overlay.querySelector('.lc-btn');
  var closeEl = overlay.querySelector('.lc-close');

  var current = { download: '', interest: '', source: '' };
  var lastFocus = null;

  function open(cfg) {
    current = cfg;
    if (cfg.title) titleEl.textContent = cfg.title;
    if (cfg.sub) subEl.textContent = cfg.sub;
    msgEl.textContent = '';
    msgEl.className = 'lc-msg';
    lastFocus = document.activeElement;
    overlay.classList.add('lc-on');
    setTimeout(function () { nameEl.focus(); }, 30);
  }

  function close() {
    overlay.classList.remove('lc-on');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function triggerDownload(url) {
    if (!url) return;
    var a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function valid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function send() {
    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    if (!name) { fail('Please add your name.'); nameEl.focus(); return; }
    if (!valid(email)) { fail('Please enter a valid email.'); emailEl.focus(); return; }

    submit.disabled = true;
    submit.textContent = 'Sending...';
    msgEl.textContent = '';
    msgEl.className = 'lc-msg';

    var payload = {
      name: name,
      email: email,
      phone: phoneEl.value.trim(),
      interest: current.interest || 'Guide download',
      source: current.source || 'website'
    };

    function done() {
      if (window.trackLead) window.trackLead(payload.interest, payload.source);
      msgEl.textContent = 'Got it. Your download is starting now.';
      msgEl.className = 'lc-msg ok';
      triggerDownload(current.download);
      setTimeout(close, 1400);
      submit.disabled = false;
      submit.textContent = 'Send it to me';
      nameEl.value = ''; emailEl.value = ''; phoneEl.value = '';
    }

    if (!ENDPOINT) {
      // No endpoint configured yet: still let the user get the file.
      done();
      return;
    }

    // text/plain avoids a CORS preflight against Apps Script.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(done).catch(function () {
      // Even if the browser blocks reading the response, the row is written.
      done();
    });
  }

  function fail(text) {
    msgEl.textContent = text;
    msgEl.className = 'lc-msg err';
  }

  // ---- Wire up triggers ----
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-lead-open]');
    if (t) {
      ev.preventDefault();
      open({
        download: t.getAttribute('data-download') || '',
        interest: t.getAttribute('data-interest') || '',
        source: t.getAttribute('data-source') || '',
        title: t.getAttribute('data-title') || '',
        sub: t.getAttribute('data-sub') || ''
      });
    }
  });

  closeEl.addEventListener('click', close);
  overlay.addEventListener('click', function (ev) { if (ev.target === overlay) close(); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && overlay.classList.contains('lc-on')) close();
  });
  submit.addEventListener('click', send);
  [nameEl, emailEl, phoneEl].forEach(function (el) {
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') send(); });
  });
})();
