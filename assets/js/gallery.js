/* Scroll reveal for the gallery: each item fades in and shifts up when it is
   scrolled into view. The item is one bound unit; the per-part stagger delays
   live in gallery.css (horizontal: text then video +300 ms; vertical: video
   then text +300 ms).

   Video parallax: the video scrolls a little faster than the text and the
   page. Its offset follows the item's distance from the viewport center,
   clamped to PARALLAX_MAX px, and the video is what gets the transform — the
   .gallery-media wrapper keeps its reveal transition untouched.

   Fullscreen: every video gets an icon button (gallery.css) that toggles
   native browser fullscreen, with the webkit fallback for Safari. While a
   video is fullscreen its parallax transform is cleared (a translated video
   would sit off-center) and re-applied on exit. */
(function () {
  'use strict';
  var PARALLAX_K = 0.18;    // px of drift per px from viewport center
  var PARALLAX_MAX = 120;   // px cap, so the drift stays a small overtake

  var items = document.querySelectorAll('.gallery-item');
  if (!('IntersectionObserver' in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add('is-revealed');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  for (var j = 0; j < items.length; j++) io.observe(items[j]);

  var videos = document.querySelectorAll('.gallery-item video');

  // ---- Fullscreen ---------------------------------------------------------
  var EXPAND = '<svg class="fs-expand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  var CONTRACT = '<svg class="fs-contract" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
  var buttons = [];
  for (var b = 0; b < videos.length; b++) {
    (function (video) {
      var media = video.closest('.gallery-media');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery-fullscreen';
      btn.setAttribute('aria-label', 'Fullscreen');
      btn.title = 'Fullscreen';
      btn.innerHTML = EXPAND + CONTRACT;
      media.appendChild(btn);
      btn.addEventListener('click', function () {
        if (isFullscreen(video)) exitFullscreen();
        else requestFullscreen(video);
      });
      buttons.push({ video: video, btn: btn });
    })(videos[b]);
  }
  function isFullscreen(v) {
    return (document.fullscreenElement || document.webkitFullscreenElement) === v;
  }
  function btnOf(v) {
    for (var bi = 0; bi < buttons.length; bi++) {
      if (buttons[bi].video === v) return buttons[bi].btn;
    }
    return null;
  }
  function requestFullscreen(v) {
    if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
  }
  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
  function fsSync() {
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    for (var f = 0; f < buttons.length; f++) {
      var entry = buttons[f];
      var active = fs === entry.video;
      entry.btn.classList.toggle('is-fullscreen', active);
      entry.btn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Fullscreen');
      if (active) {
        entry.video.style.transform = 'none';
        entry.btn.style.transform = 'none';
      } else {
        updateParallax();
      }
    }
  }
  document.addEventListener('fullscreenchange', fsSync);
  document.addEventListener('webkitfullscreenchange', fsSync);

  // ---- Parallax -----------------------------------------------------------
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var ticking = false;
  function updateParallax() {
    ticking = false;
    var vc = window.innerHeight / 2;
    for (var k = 0; k < videos.length; k++) {
      var v = videos[k];
      if (isFullscreen(v)) continue;  // never re-apply while fullscreen
      var it = v.closest('.gallery-item');
      if (!it) continue;
      var rect = it.getBoundingClientRect();
      var center = rect.top + rect.height / 2;
      var offset = (center - vc) * PARALLAX_K;
      if (offset > PARALLAX_MAX) offset = PARALLAX_MAX;
      else if (offset < -PARALLAX_MAX) offset = -PARALLAX_MAX;
      v.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)';
      var vb = btnOf(v);
      if (vb) vb.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)';
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateParallax);
    }
  }, { passive: true });
  window.addEventListener('resize', updateParallax);
  updateParallax();
})();
