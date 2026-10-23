/* Scroll-scrubbed invitation animation
   Phones in portrait use the tall frames, everything else uses the wide frames.

   If you ever change the frames, only edit the SETS block below:
   - count  = how many frame files are in the folder
   - prefix = the start of the file name (frame_001.webp -> "frame_") */
(function () {
  'use strict';

  var SETS = {
    desktop: { dir: 'frames-desktop/', prefix: 'frame_',   count: 243 },
    mobile:  { dir: 'frames-mobile/',  prefix: 'm_frame_', count: 156 }
  };
  var EXT = '.webp';

  var WINDOW       = 28;   // frames kept ready on each side of the current one
  var SPARSE       = 8;    // plus every 8th frame, so a fast scroll never shows a gap
  var MAX_INFLIGHT = 6;    // frames downloading at the same time
  var HOLD_END     = 0.06; // last 6% of the scroll rests on the final frame
  var EASE         = 0.14; // smoothing: lower = floatier, higher = snappier

  var hero   = document.getElementById('hero');
  var stage  = document.getElementById('stage');
  var canvas = document.getElementById('canvas');
  var cue    = document.getElementById('scrollCue');
  if (!hero || !stage || !canvas || !canvas.getContext) { return; }

  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var portraitQuery = window.matchMedia('(orientation: portrait)');

  var setName, set;
  var cache = {};       // frame number -> { img, ready, loading }
  var inflight = 0;
  var generation = 0;   // changes when the phone is rotated, so old downloads are ignored
  var target = 0;       // frame the scroll position asks for
  var current = 0;      // frame being shown (eases towards target)
  var raf = 0;
  var updateQueued = false;
  var lastDrawn = null;
  var lastW = 0, lastH = 0;

  /* ---------- helpers ---------- */
  function pad(n) { return String(n).padStart(3, '0'); }

  function pathFor(i) { return set.dir + set.prefix + pad(i + 1) + EXT; }

  function keep(i, center) {
    return Math.abs(i - center) <= WINDOW || i % SPARSE === 0 || i === set.count - 1;
  }

  /* ---------- loading ---------- */
  function load(i) {
    var gen = generation;
    var entry = { img: new Image(), ready: false, loading: true };
    cache[i] = entry;
    inflight++;

    function finish(ok) {
      if (gen !== generation) { return; }
      entry.loading = false;
      entry.ready = ok;
      entry.failed = !ok;
      if (!ok) { entry.failedAt = Date.now(); }
      inflight--;
      if (ok) { requestTick(); }
      pump();
    }

    entry.img.decoding = 'async';
    entry.img.onload = function () {
      if (entry.img.decode) {
        entry.img.decode().then(function () { finish(true); }, function () { finish(true); });
      } else {
        finish(true);
      }
    };
    entry.img.onerror = function () { finish(false); };
    entry.img.src = pathFor(i);
  }

  // Free frames that are far from where the visitor is (keeps iPhones from running out of memory)
  function evict(center) {
    Object.keys(cache).forEach(function (key) {
      var i = +key, e = cache[key];
      if (!keep(i, center) && !e.loading) {
        e.img.onload = e.img.onerror = null;
        delete cache[key];
      }
    });
  }

  function pump() {
    var center = Math.round(target);
    evict(center);

    var order = [], d, i;
    for (d = 0; d <= WINDOW; d++) {
      if (center + d < set.count) { order.push(center + d); }
      if (d && center - d >= 0)   { order.push(center - d); }
    }
    for (i = 0; i < set.count; i += SPARSE) { order.push(i); }
    order.push(set.count - 1);

    for (var k = 0; k < order.length && inflight < MAX_INFLIGHT; k++) {
      var n = order[k], e = cache[n];
      if (!e) {
        load(n);
      } else if (e.failed && Date.now() - e.failedAt > 3000) {
        // a frame that failed is retried after a short pause, not in a tight loop
        delete cache[n];
        load(n);
      }
    }
  }

  /* ---------- drawing ---------- */
  function nearestReady(index) {
    for (var d = 0; d < set.count; d++) {
      var a = cache[index - d], b = cache[index + d];
      if (a && a.ready) { return a.img; }
      if (b && b.ready) { return b.img; }
    }
    return null;
  }

  function draw() {
    var img = nearestReady(Math.round(current));
    if (!img || img === lastDrawn) { return; }
    lastDrawn = img;

    var cw = canvas.width, ch = canvas.height;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) { return; }
    var scale = Math.max(cw / iw, ch / ih);          // fill the screen, like background-size: cover
    var w = iw * scale, h = ih * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function tick() {
    raf = 0;
    var diff = target - current;
    if (reduceMotion || Math.abs(diff) < 0.02) { current = target; }
    else { current += diff * EASE; }
    draw();
    if (current !== target) { raf = requestAnimationFrame(tick); }
  }

  function requestTick() { if (!raf) { raf = requestAnimationFrame(tick); } }

  /* ---------- scroll ---------- */
  function update() {
    updateQueued = false;
    var rect = hero.getBoundingClientRect();
    var range = hero.offsetHeight - stage.clientHeight;
    var p = range > 0 ? -rect.top / range : 0;
    p = Math.min(Math.max(p, 0), 1);
    p = Math.min(p / (1 - HOLD_END), 1);

    target = p * (set.count - 1);
    if (cue) { cue.classList.toggle('is-hidden', p > 0.015); }
    pump();
    requestTick();
  }

  function onScroll() {
    if (!updateQueued) { updateQueued = true; requestAnimationFrame(update); }
  }

  /* ---------- size and orientation ---------- */
  function resizeCanvas(force) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    // The iPhone address bar changes the height a little while scrolling; ignore that
    if (!force && w === lastW && Math.abs(h - lastH) < 120) { return; }
    lastW = w; lastH = h;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    lastDrawn = null;
    draw();
  }

  function chooseSet() { return portraitQuery.matches ? 'mobile' : 'desktop'; }

  function useSet(name) {
    setName = name;
    set = SETS[name];
    generation++;
    cache = {};
    inflight = 0;
    lastDrawn = null;
    update();
  }

  function onResize() {
    var wanted = chooseSet();
    if (wanted !== setName) { useSet(wanted); resizeCanvas(true); }
    else { resizeCanvas(false); }
  }

  /* ---------- go ---------- */
  useSet(chooseSet());
  resizeCanvas(true);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 250); });
})();
