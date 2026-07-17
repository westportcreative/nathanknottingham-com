/**
 * analytics.js — one tracking layer for nathanknottingham.com
 *
 * SETUP: paste your two IDs below, commit, done. This file is the only
 * place you ever configure tracking.
 *
 *   GA4_ID        from Google Analytics (looks like "G-ABC123XYZ")
 *   META_PIXEL_ID from Meta Events Manager (a long number string)
 *
 * Leave either blank and that platform is simply skipped, nothing breaks.
 *
 * WHAT GETS TRACKED AUTOMATICALLY
 *   - Page views on every page that loads this file
 *   - begin_application  : any click to your Edge application link
 *   - generate_lead      : successful lead form submit (fired by capture.js)
 *   - contact_click      : mailto and tel clicks (labeled email/phone)
 *   - social_click       : clicks out to YouTube, Instagram, Facebook, LinkedIn
 *   - outbound_click     : any other external link (vettedva.com, mloforce.com, etc.)
 */
(function () {
  'use strict';

  var GA4_ID = 'G-KC542GBY4Z';         // <-- paste your GA4 Measurement ID here
  var META_PIXEL_ID = '';  // <-- paste your Meta Pixel ID here

  // ---------- GA4 ----------
  if (GA4_ID) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA4_ID);
  }

  // ---------- Meta Pixel ----------
  if (META_PIXEL_ID) {
    !(function (f, b, e, v, n, t, sc) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      sc = b.getElementsByTagName(e)[0]; sc.parentNode.insertBefore(t, sc);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
  }

  function ga(event, params) {
    if (window.gtag) gtag('event', event, params || {});
  }
  function fb(event, custom) {
    if (window.fbq) {
      custom ? fbq('trackCustom', event) : fbq('track', event);
    }
  }

  // Called by capture.js when a lead form is successfully submitted.
  window.trackLead = function (interest, source) {
    ga('generate_lead', { interest: interest || '', source: source || '' });
    fb('Lead');
  };

  // ---------- Click tracking ----------
  var SOCIAL = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'linkedin.com'];

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    // Application start (the money click)
    if (href.indexOf('my1003app.com') !== -1) {
      ga('begin_application', { link_url: href });
      fb('SubmitApplication');
      return;
    }
    // Contact intents
    if (href.indexOf('mailto:') === 0) {
      ga('contact_click', { method: 'email' });
      fb('Contact');
      return;
    }
    if (href.indexOf('tel:') === 0) {
      ga('contact_click', { method: 'phone' });
      fb('Contact');
      return;
    }
    // Social + other outbound
    if (/^https?:\/\//.test(href) && href.indexOf(location.hostname) === -1) {
      var isSocial = SOCIAL.some(function (d) { return href.indexOf(d) !== -1; });
      if (isSocial) {
        var network = SOCIAL.filter(function (d) { return href.indexOf(d) !== -1; })[0];
        ga('social_click', { network: network, link_url: href });
      } else {
        ga('outbound_click', { link_url: href });
      }
    }
  }, true);
})();
