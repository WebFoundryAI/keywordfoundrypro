export async function retryFetch(url: string, init: RequestInit = {}, opts: { tries?: number, base?: number } = {}) {
  const tries = opts.tries ?? 3;
  const base = opts.base ?? 400;
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500 && res.status !== 429) return res;
      lastErr = new Error(`status_${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (i < tries - 1) {
      const jitter = Math.floor(Math.random() * base);
      const delay = Math.pow(2, i) * base + jitter;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr || new Error('retry_exhausted');
}
