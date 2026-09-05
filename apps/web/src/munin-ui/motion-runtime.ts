import { gsap } from 'gsap';
import Lenis from 'lenis';
import type { VisualPreferences } from './visual-preferences';

const animated = new WeakSet<Element>();

function animateSurface(element: Element, preferences: VisualPreferences) {
  if (animated.has(element) || preferences.reduceMotion || preferences.motion === 'minimal') return;
  animated.add(element);
  gsap.fromTo(
    element,
    { autoAlpha: 0, y: preferences.motion === 'cinematic' ? 18 : 10, scale: 0.995 },
    { autoAlpha: 1, y: 0, scale: 1, duration: preferences.motion === 'cinematic' ? 0.72 : 0.42, ease: 'power2.out', clearProps: 'transform' },
  );
}

export function startMotionRuntime(preferences: VisualPreferences) {
  if (preferences.reduceMotion || preferences.motion === 'minimal') return () => undefined;

  const root = document.querySelector('.shell');
  const context = gsap.context(() => {
    gsap.fromTo('.sidebar', { x: -12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo('main > header', { y: -8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out', delay: 0.06 });
    document.querySelectorAll('.panel,.metrics article,.executive-hero,.page-title').forEach(element => animateSurface(element, preferences));
  }, root ?? undefined);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('.panel,.metrics article,.executive-hero,.page-title,.toast,.palette,.editor-modal,.report-modal')) animateSurface(node, preferences);
        node.querySelectorAll?.('.panel,.metrics article,.executive-hero,.page-title,.toast,.palette,.editor-modal,.report-modal').forEach(element => animateSurface(element, preferences));
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let lenis: Lenis | undefined;
  let ticker: ((time: number) => void) | undefined;
  if (window.innerWidth > 760) {
    lenis = new Lenis({ duration: preferences.motion === 'cinematic' ? 1.05 : 0.72, smoothWheel: true, touchMultiplier: 1 });
    ticker = time => lenis?.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
  }

  return () => {
    observer.disconnect();
    if (ticker) gsap.ticker.remove(ticker);
    lenis?.destroy();
    context.revert();
  };
}

export function pulseElement(selector: string) {
  const target = document.querySelector(selector);
  if (!target) return;
  gsap.fromTo(target, { scale: 0.985 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .5)' });
}
