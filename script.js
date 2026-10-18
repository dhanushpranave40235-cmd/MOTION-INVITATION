/* Scroll-driven invitation. Plain image frames drawn on a canvas.
   Works without video decoding, so it behaves the same on iPhone, Android and desktop.
   If anything fails, the poster <img> underneath stays visible (never a black screen). */
(function () {
  'use strict';
  var root = document.documentElement;
  root.className += ' js';

  var TOTAL = 60;
  var section = document.getElementById('scrollSection');
  var canvas = document.getElementById('canvas');
  var poster = document.getElementById('poster');
  var hint = document.getElementById('scrollHint');
  var bar = document.getElementById('bar');
  var ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }

  var frames = new Array(TOTAL);   // loaded Image objects
  var drawn = -1, target = 0, ticking = false, canvasReady = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function name(i) { return 'frames/f' + ('00' + (i + 1)).slice(-3) + '.jpg'; }

  function draw(i) {
    if (!ctx || i === drawn) return;
    // nearest loaded frame at or before i, else nearest after
    var k = i, n;
    while (k >= 0 && !frames[k]) k--;
    if (k < 0) { k = i; while (k < TOTAL && !frames[k]) k++; }
    if (k >= TOTAL || !frames[k]) return;
    try {
      ctx.drawImage(frames[k], 0, 0, canvas.width, canvas.height);
      drawn = i;
      if (!canvasReady) { canvasReady = true; canvas.style.visibility = 'visible'; }
    } catch (e) { /* leave poster visible */ }
  }

  function progress() {
    var rect = section.getBoundingClientRect();
    var max = rect.height - window.innerHeight;
    var p = max > 0 ? -rect.top / max : 0;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function update() {
    ticking = false;
    var p = progress();
    target = Math.round(p * (TOTAL - 1));
    draw(target);
    if (bar) bar.style.transform = 'scaleX(' + p + ')';
    if (hint) hint.className = 'scroll-hint' + (p > 0.03 ? ' gone' : '');
  }
  function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }

  // hide canvas until its first frame is really drawn; poster covers meanwhile
  canvas.style.visibility = 'hidden';

  // load frames: first few immediately, the rest in small batches (no waiting for all 60)
  var next = 0, active = 0, MAX = 4;
  function pump() {
    while (active < MAX && next < TOTAL) { load(next++); }
  }
  function load(i) {
    active++;
    var img = new Image();
    img.onload = function () { frames[i] = img; active--; if (i <= target + 1 || !canvasReady) { drawn = -1; draw(target); } pump(); };
    img.onerror = function () { active--; pump(); };
    img.src = name(i);
  }

  if (reduce) {
    // no scrubbing: show final artwork
    var end = new Image();
    end.onload = function () { poster.src = 'frames/end.jpg'; };
    end.src = 'frames/end.jpg';
    if (hint) hint.style.display = 'none';
    section.style.height = 'auto';
    section.getElementsByClassName('stage')[0].style.position = 'relative';
  } else if (ctx) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('orientationchange', onScroll);
    pump();
    update();
  }

  // gentle reveal for text sections, visible by default if IntersectionObserver is missing
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      for (var j = 0; j < es.length; j++) {
        if (es[j].isIntersecting) { es[j].target.className += ' in'; io.unobserve(es[j].target); }
      }
    }, { threshold: 0.15 });
    for (var m = 0; m < items.length; m++) io.observe(items[m]);
  } else {
    for (var q = 0; q < items.length; q++) items[q].className += ' in';
  }
})();
