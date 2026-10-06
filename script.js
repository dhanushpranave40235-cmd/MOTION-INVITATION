const video = document.getElementById("invitationVideo");
const section = document.querySelector(".scroll-video-section");
const hint = document.getElementById("scrollHint");
const reveals = document.querySelectorAll(".reveal");

let duration = 0;
let targetTime = 0;
let currentTime = 0;
let rafId = 0;
let scrollRaf = 0;
let readyToScrub = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateTargetFromScroll() {
  const rect = section.getBoundingClientRect();
  const scrollableDistance = Math.max(section.offsetHeight - window.innerHeight, 1);
  const distanceScrolled = clamp(-rect.top, 0, scrollableDistance);
  const progress = distanceScrolled / scrollableDistance;

  targetTime = progress * duration;
  hint.style.opacity = progress > 0.03 ? "0" : "1";
}

function onScroll() {
  if (!scrollRaf) {
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      updateTargetFromScroll();
    });
  }
}

function renderVideo() {
  const difference = targetTime - currentTime;

  // Smooth interpolation prevents mobile browsers from being flooded
  // with seek requests during a fast swipe.
  currentTime += difference * 0.22;

  if (Math.abs(difference) < 0.015) {
    currentTime = targetTime;
  }

  if (readyToScrub && video.readyState >= 2) {
    const safeTime = clamp(currentTime, 0, Math.max(duration - 0.02, 0));
    if (Math.abs(video.currentTime - safeTime) > 0.025) {
      video.currentTime = safeTime;
    }
  }

  rafId = requestAnimationFrame(renderVideo);
}

function warmUpVideo() {
  /*
    Mobile Safari/Chrome can refuse to render frequent currentTime
    seeks until the video decoder has started. Because the video is
    muted and inline, this warm-up is allowed without user interaction.
  */
  const promise = video.play();

  if (promise && typeof promise.then === "function") {
    promise.then(() => {
      setTimeout(() => {
        video.pause();
        video.currentTime = 0;
        readyToScrub = true;
        updateTargetFromScroll();
      }, 180);
    }).catch(() => {
      // If autoplay is blocked, loadeddata/canplay still provide
      // a usable fallback for browsers that allow seeking.
      readyToScrub = true;
      updateTargetFromScroll();
    });
  } else {
    readyToScrub = true;
    updateTargetFromScroll();
  }
}

video.addEventListener("loadedmetadata", () => {
  duration = video.duration || 0;
  currentTime = 0;
  targetTime = 0;
});

video.addEventListener("loadeddata", () => {
  warmUpVideo();
});

video.addEventListener("canplay", () => {
  if (!readyToScrub) warmUpVideo();
});

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateTargetFromScroll, { passive: true });

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.18 });

reveals.forEach((element) => revealObserver.observe(element));

updateTargetFromScroll();
cancelAnimationFrame(rafId);
rafId = requestAnimationFrame(renderVideo);
