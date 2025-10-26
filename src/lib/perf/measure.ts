// Simple performance measurement utilities for dev

export function measureTTFB(): number | null {
  if (typeof window === 'undefined') return null;

  const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navTiming) return null;

  return navTiming.responseStart - navTiming.requestStart;
}

export function measureFCP(): number | null {
  if (typeof window === 'undefined') return null;

  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');

  return fcpEntry?.startTime || null;
}

export function measureINP(): void {
  if (typeof window === 'undefined') return;

  // Track interactions
  let maxDuration = 0;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const duration = (entry as any).duration;
      if (duration > maxDuration) {
        maxDuration = duration;
        if (process.env.NODE_ENV === 'development') {
          console.log('[Perf] INP:', duration, 'ms');
        }
      }
    }
  });

  try {
    observer.observe({ type: 'event', buffered: true });
  } catch {
    // Not supported
  }
}

export function logPerfMetrics(): void {
  if (process.env.NODE_ENV !== 'development') return;

  setTimeout(() => {
    const ttfb = measureTTFB();
    const fcp = measureFCP();

    console.log('[Perf] TTFB:', ttfb ? `${ttfb.toFixed(2)}ms` : 'N/A');
    console.log('[Perf] FCP:', fcp ? `${fcp.toFixed(2)}ms` : 'N/A');
  }, 0);

  measureINP();
}
