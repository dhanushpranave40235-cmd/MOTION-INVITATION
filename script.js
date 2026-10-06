const video = document.getElementById("invitationVideo");
const section = document.querySelector(".scroll-video-section");
const hint = document.getElementById("scrollHint");
const reveals = document.querySelectorAll(".reveal");

let duration = 0;
let targetTime = 0;
let currentTime = 0;
let animationFrame = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateFromScroll() {
  if (!duration || !video.duration) return;

  const rect = section.getBoundingClientRect();
  const scrollableDistance = section.offsetHeight - window.innerHeight;
  const distanceScrolled = clamp(-rect.top, 0, scrollableDistance);

  const progress = scrollableDistance > 0
    ? distanceScrolled / scrollableDistance
    : 0;

  targetTime = progress * duration;
  hint.style.opacity = progress > 0.03 ? "0" : "1";
}

function animateVideo() {
  currentTime += (targetTime - currentTime) * 0.18;

  if (Math.abs(targetTime - currentTime) < 0.01) {
    currentTime = targetTime;
  }

  if (video.readyState >= 2) {
    video.currentTime = currentTime;
  }

  animationFrame = requestAnimationFrame(animateVideo);
}

video.addEventListener("loadedmetadata", () => {
  duration = video.duration;
  currentTime = 0;
  targetTime = 0;
  video.currentTime = 0;

  updateFromScroll();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animateVideo);
});

window.addEventListener("scroll", updateFromScroll, { passive: true });
window.addEventListener("resize", updateFromScroll);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.18 });

reveals.forEach((element) => revealObserver.observe(element));

video.pause();
