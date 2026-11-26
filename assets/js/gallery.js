/* Gallery page (gallary.html). Items are sourced the wiki way: a manifest
   enumerates markdown notes under gallery/en_US/ (data-source-root /
   data-entry-path / data-manifest-path on .gallery — the wiki's own
   contract), each note inputs its video as a RAW <video> block whose
   relative src resolves against the source root (resolveMediaSrcs, like
   wiki.js), and a <!-- gallery-layout: video-left|video-right|video-center -->
   comment picks the layout. gallery.js discovers, parses, renders the items,
   then wires the three behaviours onto the built DOM:

   - Scroll reveal: each item is one bound unit — fade in + shift up when
     scrolled into view; the per-part stagger delays live in gallery.css
     (horizontal: text then video +300 ms; vertical: video then text +300 ms).
   - Video parallax: the video scrolls a little faster than the text and the
     page — offset = clamp((itemCenter - viewportCenter) * PARALLAX_K,
     +-PARALLAX_MAX), applied to the video AND its fullscreen button.
   - Fullscreen: every video gets an icon button that toggles native browser
     fullscreen (webkit fallback); while fullscreen the parallax transforms
     are cleared and guarded against re-application, restored on exit. */
(function () {
  'use strict';
  var PARALLAX_K = 0.18;    // px of drift per px from viewport center
  var PARALLAX_MAX = 120;   // px cap, so the drift stays a small overtake

  var gallery = document.querySelector('.gallery');
  var root = new URL(gallery.dataset.sourceRoot, window.location.href);
  var entryPath = gallery.dataset.entryPath;
  var manifestPath = gallery.dataset.manifestPath;
  var gridPath = gallery.dataset.gridPath;
  var statusEl = gallery.querySelector('.gallery-status');

  // ---- Fullscreen helpers (shared by big-item buttons and grid cells) ------
  function isFullscreen(v) {
    return (document.fullscreenElement || document.webkitFullscreenElement) === v;
  }
  function requestFullscreen(v) {
    if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
  }
  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
  function fmtDur(d) {
    if (!isFinite(d)) return '00:00';
    var s = Math.round(d);
    var m = Math.floor(s / 60);
    s -= m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function parseEntry(md) {
    var lines = md.split(/\r?\n/);
    var layout = 'video-left';
    var videoHTML = null;
    var heading = null;
    var paras = [];
    var cur = [];
    var inVideo = false;
    function flush() {
      if (cur.length) { paras.push(cur.join(' ')); cur = []; }
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var lm = line.match(/^<!--\s*gallery-layout:\s*(video-left|video-right|video-center)\s*-->/);
      if (lm) { layout = lm[1]; continue; }
      if (/^\s*<video\b/.test(line)) {
        flush();
        inVideo = true;
        videoHTML = line;
        if (/<\/video>/.test(line)) inVideo = false;
        continue;
      }
      if (inVideo) {
        videoHTML += '\n' + line;
        if (/<\/video>/.test(line)) inVideo = false;
        continue;
      }
      var hm = line.match(/^#\s+(.+)\s*$/);
      if (hm) { if (!heading) heading = hm[1]; continue; }
      if (/^\s*$/.test(line)) { flush(); continue; }
      cur.push(line.trim());
    }
    flush();
    return { layout: layout, videoHTML: videoHTML, heading: heading, paras: paras };
  }

  function buildItem(md, index) {
    var parsed = parseEntry(md);
    var section = document.createElement('section');
    section.className = 'gallery-item item-' + parsed.layout;

    var media = document.createElement('div');
    media.className = 'gallery-media';
    var video = null;
    if (parsed.videoHTML) {
      var doc = new DOMParser().parseFromString(parsed.videoHTML, 'text/html');
      video = doc.querySelector('video');
    }
    if (!video) video = document.createElement('video');
    var src = video.getAttribute('src');
    if (src && !/^(https?:|data:|\/|#)/.test(src)) {
      video.setAttribute('src', new URL(src, root).href);
    }
    media.appendChild(video);

    var copy = document.createElement('div');
    copy.className = 'gallery-copy';
    var h2 = document.createElement('h2');
    h2.id = 'gallery-item-' + index + '-heading';
    h2.textContent = parsed.heading || 'Lorem ipsum dolor sit amet';
    copy.appendChild(h2);
    var body = parsed.paras.length ? parsed.paras : ['Lorem ipsum dolor sit amet.'];
    body.forEach(function (p) {
      var pe = document.createElement('p');
      pe.textContent = p;
      copy.appendChild(pe);
    });
    section.setAttribute('aria-labelledby', h2.id);

    if (parsed.layout === 'video-right') {
      section.appendChild(copy);
      section.appendChild(media);
    } else {
      section.appendChild(media);
      section.appendChild(copy);
    }
    return section;
  }

  // ---- Behaviours (wired after the items exist) ----------------------------
  function setup() {
    var items = document.querySelectorAll('.gallery-item');

    // Scroll reveal for the big items (threshold .15; the grid has its own,
    // stricter trigger — see renderGrid).
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-revealed');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      for (var j = 0; j < items.length; j++) io.observe(items[j]);
    }

    var videos = document.querySelectorAll('.gallery-item video');

    // Fullscreen.
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

    // Parallax.
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
  }

  // ---- Discover + render ---------------------------------------------------
  fetch(new URL(entryPath, root))
    .then(function (r) { return r.text(); })
    .then(function () {
      return fetch(new URL(manifestPath, root)).then(function (r) { return r.json(); });
    })
    .then(function (mf) {
      var loads = (mf.files || []).map(function (f) {
        return fetch(new URL(f, root)).then(function (r) {
          if (!r.ok) throw new Error(f + ': HTTP ' + r.status);
          return r.text();
        });
      });
      return Promise.all(loads);
    })
    .then(function (texts) {
      texts.forEach(function (text, i) {
        gallery.appendChild(buildItem(text, i));
      });
      if (statusEl) statusEl.remove();
      setup();
      renderGrid();
    })
    .catch(function () {
      if (statusEl) statusEl.textContent = 'Failed to load gallery entries.';
    });

  // ---- Grid (bilibili-style: 4 per row, hover plays, dblclick fullscreen) --
  function parseVideos(md) {
    var lines = md.split(/\r?\n/);
    var blocks = [];
    var cur = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*<video\b/.test(line)) {
        cur = line;
        if (/<\/video>/.test(line)) { blocks.push(cur); cur = null; }
      } else if (cur !== null) {
        cur += '\n' + line;
        if (/<\/video>/.test(line)) { blocks.push(cur); cur = null; }
      }
    }
    return blocks;
  }
  function resolveVideoSrc(v) {
    var src = v.getAttribute('src');
    if (src && !/^(https?:|data:|\/|#)/.test(src)) {
      v.setAttribute('src', new URL(src, root).href);
    }
    return v;
  }
  function renderGrid() {
    if (!gridPath) return;
    fetch(new URL(gridPath, root))
      .then(function (r) {
        if (!r.ok) throw new Error('grid: HTTP ' + r.status);
        return r.text();
      })
      .then(function (md) {
        var blocks = parseVideos(md);
        if (!blocks.length) return;
        var grid = document.createElement('section');
        grid.className = 'gallery-grid';
        grid.setAttribute('aria-label', 'Video grid');
        blocks.forEach(function (block) {
          var cell = document.createElement('div');
          cell.className = 'grid-cell';
          var doc = new DOMParser().parseFromString(block, 'text/html');
          var v = resolveVideoSrc(doc.querySelector('video') || document.createElement('video'));
          // The video plays muted from load (autoplay is allowed muted in
          // every browser, unlike play() from mouseenter which Safari
          // rejects); the cover hides it until the cell is hovered.
          v.muted = true;
          v.setAttribute('autoplay', '');
          v.setAttribute('loop', '');
          v.setAttribute('playsinline', '');
          cell.appendChild(v);
          var cover = document.createElement('div');
          cover.className = 'grid-cover';
          var poster = v.getAttribute('poster');
          if (poster) cover.style.backgroundImage = 'url(' + poster + ')';
          cell.appendChild(cover);
          var badge = document.createElement('span');
          badge.className = 'grid-duration';
          badge.textContent = '00:00';
          cell.appendChild(badge);
          v.addEventListener('loadedmetadata', function () {
            badge.textContent = fmtDur(v.duration);
          });
          cell.addEventListener('dblclick', function () {
            if (isFullscreen(v)) exitFullscreen();
            else requestFullscreen(v);
          });
          grid.appendChild(cell);
        });
        gallery.appendChild(grid);
        // The grid's fade+shift-up is independent: its own observer fires
        // only once the grid AREA is actually scrolled to (0.4 of it in
        // view, not the 0.15 sliver the big items use).
        if (!('IntersectionObserver' in window)) {
          grid.classList.add('is-revealed');
        } else {
          var gridIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                grid.classList.add('is-revealed');
                gridIO.unobserve(grid);
              }
            });
          }, { threshold: 0.4 });
          gridIO.observe(grid);
        }
      })
      .catch(function () {});
  }
})();
