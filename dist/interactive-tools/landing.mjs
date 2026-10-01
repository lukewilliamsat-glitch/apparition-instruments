// Signal flow: finite, viewport-aware enhancement. Static linework stays visible.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const visuals = document.querySelectorAll('.it-motion');
let observer;
function configureMotion() {
 observer?.disconnect();
 visuals.forEach(visual => visual.classList.remove('is-in-view'));
 if (motion.matches || !('IntersectionObserver' in window)) return;
 observer = new IntersectionObserver(entries => {
  entries.forEach(({target, isIntersecting}) => target.classList.toggle('is-in-view', isIntersecting));
 }, {threshold: .15});
 visuals.forEach(visual => observer.observe(visual));
}
motion.addEventListener('change', configureMotion);
configureMotion();
