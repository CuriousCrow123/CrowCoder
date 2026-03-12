/**
 * Shared IntersectionObserver for scroll-triggered popups.
 * Single observer instance, one-shot (fires once per element, then unobserves).
 * 1-second grace period: waits before firing to avoid triggering during fast scrolling.
 */

const callbacks = new Map<Element, () => void>();
const graceTimers = new Map<Element, ReturnType<typeof setTimeout>>();
let observer: IntersectionObserver | null = null;

const GRACE_PERIOD_MS = 1000;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Start grace period — only fire if still visible after delay
            const el = entry.target;
            const existing = graceTimers.get(el);
            if (existing) clearTimeout(existing);

            graceTimers.set(
              el,
              setTimeout(() => {
                callbacks.get(el)?.();
                observer!.unobserve(el);
                callbacks.delete(el);
                graceTimers.delete(el);
              }, GRACE_PERIOD_MS),
            );
          } else {
            // Scrolled away before grace period elapsed — cancel
            const timer = graceTimers.get(entry.target);
            if (timer) {
              clearTimeout(timer);
              graceTimers.delete(entry.target);
            }
          }
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -50px 0px" },
    );
  }
  return observer;
}

/**
 * Observe an element and fire callback once when it enters the viewport.
 * Returns a cleanup function that cancels observation and any pending grace timer.
 */
export function observeOnce(
  el: Element,
  callback: () => void,
): () => void {
  callbacks.set(el, callback);
  getObserver().observe(el);

  return () => {
    const timer = graceTimers.get(el);
    if (timer) {
      clearTimeout(timer);
      graceTimers.delete(el);
    }
    callbacks.delete(el);
    getObserver().unobserve(el);
  };
}
