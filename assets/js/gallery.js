/* Scroll reveal for the gallery: each item fades in and shifts up when it is
   scrolled into view. The item is one bound unit; the per-part stagger delays
   live in gallery.css (horizontal: text then video +300 ms; vertical: video
   then text +300 ms). */
(function () {
  'use strict';
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
})();
