/* Scroll reveal for the gallery: each item fades in and shifts up when it is
   scrolled into view. The item is one bound unit; the per-part stagger delays
   live in gallery.css (horizontal: text then video +300 ms; vertical: video
   then text +300 ms).

   Video parallax: the video scrolls a little faster than the text and the
   page. Its offset follows the item's distance from the viewport center,
   clamped to PARALLAX_MAX px, and the video is what gets the transform — the
   .gallery-media wrapper keeps its reveal transition untouched. */
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

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var videos = document.querySelectorAll('.gallery-item video');
  var ticking = false;
  function updateParallax() {
    ticking = false;
    var vc = window.innerHeight / 2;
    for (var k = 0; k < videos.length; k++) {
      var v = videos[k];
      var it = v.closest('.gallery-item');
      if (!it) continue;
      var rect = it.getBoundingClientRect();
      var center = rect.top + rect.height / 2;
      var offset = (center - vc) * PARALLAX_K;
      if (offset > PARALLAX_MAX) offset = PARALLAX_MAX;
      else if (offset < -PARALLAX_MAX) offset = -PARALLAX_MAX;
      v.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)';
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
