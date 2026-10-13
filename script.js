const section = document.querySelector(".scroll-video-section");
const frame = document.getElementById("invitationFrame");
const hint = document.getElementById("scrollHint");
const reveals = document.querySelectorAll(".reveal");
const FRAME_COUNT = 75;
const frames = [];
let currentFrame = 1;
let scrollRaf = 0;

function framePath(n) {
  return `video-frames/frame-${String(n).padStart(3, "0")}.jpg`;
}

// Preload frames progressively so the first frame appears immediately.
for (let i = 1; i <= FRAME_COUNT; i++) {
  const img = new Image();
  img.src = framePath(i);
  frames.push(img);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateFromScroll() {
  const rect = section.getBoundingClientRect();
  const distance = Math.max(section.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / distance, 0, 1);
  const nextFrame = Math.min(FRAME_COUNT, Math.floor(progress * (FRAME_COUNT - 1)) + 1);
  if (nextFrame !== currentFrame && frames[nextFrame - 1]?.complete) {
    frame.src = framePath(nextFrame);
    currentFrame = nextFrame;
  } else if (nextFrame !== currentFrame) {
    // Set the requested frame even if it is still loading; browser displays it when ready.
    frame.src = framePath(nextFrame);
    currentFrame = nextFrame;
  }
  hint.style.opacity = progress > 0.03 ? "0" : "1";
}
function onScroll() {
  if (!scrollRaf) scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    updateFromScroll();
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateFromScroll, { passive: true });

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.18 });
  reveals.forEach((el) => revealObserver.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("visible"));
}
updateFromScroll();
