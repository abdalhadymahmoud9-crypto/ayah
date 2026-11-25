export type Chunk = { text?: string };
export type StartFn = (model: string, signal: AbortSignal) => Promise<AsyncIterable<Chunk>>;
export interface FailoverOpts {
  models: string[];
  start: StartFn;
  initCapMs: number;
  firstChunkCapMs: number;
  chunkCapMs: number;
  deadlineMs: number;
  shouldStop?: () => boolean;
  onAttempt?: (a: Attempt) => void;
}
export interface Attempt { model: string; outcome: string; ms: number; firstChunkMs?: number }

// Production caps. The whole answer is buffered before it is sent, so the client sees nothing until generation ends.
export const PROD = { initCapMs: 6000, firstChunkCapMs: 8000, chunkCapMs: 20000, deadlineMs: 120000 };

function withCap<T>(p: Promise<T>, ms: number, tag: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const cap = new Promise<never>((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error(tag), { status: 'CHUNK_TIMEOUT' })), Math.max(ms, 1)); });
  return Promise.race([p, cap]).finally(() => clearTimeout(t));
}

// Sequential failover. The whole answer is buffered, so a failed or hung model never leaks partial text.
export async function generateWithFailover(o: FailoverOpts): Promise<{ text: string | null; model?: string; attempts: Attempt[] }> {
  const t0 = Date.now();
  const attempts: Attempt[] = [];
  for (const model of o.models) {
    const left = () => o.deadlineMs - (Date.now() - t0);
    if (left() <= 0 || o.shouldStop?.()) break;
    const a0 = Date.now();
    const ac = new AbortController();
    let iter: AsyncIterator<Chunk> | null = null;
    try {
      const stream = await withCap(o.start(model, ac.signal), Math.min(o.initCapMs, left()), 'init');
      const it = stream[Symbol.asyncIterator]();
      iter = it;
      let buf = '';
      let first = true;
      let firstChunkMs: number | undefined;
      while (true) {
        const cap = Math.min(first ? o.firstChunkCapMs : o.chunkCapMs, left());
        const n = await withCap(it.next(), cap, 'chunk');
        if (n.done) break;
        if (first) firstChunkMs = Date.now() - a0;
        first = false;
        if (n.value?.text) buf += n.value.text;
      }
      if (buf.trim()) { attempts.push({ model, outcome: 'ok', ms: Date.now() - a0, firstChunkMs }); return { text: buf, model, attempts }; }
      attempts.push({ model, outcome: 'empty', ms: Date.now() - a0 });
    } catch (e: any) {
      attempts.push({ model, outcome: String(e?.status || e?.code || 'error'), ms: Date.now() - a0 });
      ac.abort(); // cancel the losing request so it stops running and spending quota
      try { void iter?.return?.(); } catch { /* ignore */ }
      o.onAttempt?.(attempts[attempts.length - 1]);
    }
  }
  return { text: null, attempts };
}
