// retryFetch — small wrapper around fetch() with exponential backoff + jitter.
// Use for idempotent GETs only; do not use for POST/PUT/DELETE without an
// idempotency key. Honors an external AbortSignal so callers can cancel.

const DEFAULT_OPTS = {
    retries: 3,
    baseDelayMs: 250,
    maxDelayMs: 4000,
    timeoutMs: 15000,
    retryOnStatuses: new Set([408, 425, 429, 500, 502, 503, 504]),
};

function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        if (signal) {
            const onAbort = () => {
                clearTimeout(t);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            if (signal.aborted) onAbort();
            else signal.addEventListener('abort', onAbort, { once: true });
        }
    });
}

function jitter(ms) {
    return Math.floor(ms / 2 + Math.random() * (ms / 2));
}

export async function retryFetch(url, init = {}, opts = {}) {
    const config = { ...DEFAULT_OPTS, ...opts };
    const externalSignal = init.signal;
    let attempt = 0;
    let lastErr = null;

    while (attempt <= config.retries) {
        // Per-attempt timeout controller chained to caller's signal.
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), config.timeoutMs);
        const onExternalAbort = () => ac.abort();
        if (externalSignal) {
            if (externalSignal.aborted) ac.abort();
            else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }

        try {
            const res = await fetch(url, { ...init, signal: ac.signal });
            clearTimeout(timer);
            if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);

            if (res.ok) return res;
            if (!config.retryOnStatuses.has(res.status) || attempt === config.retries) {
                return res; // let caller decide what to do with non-retryable failure
            }
            lastErr = new Error(`HTTP ${res.status}`);
        } catch (err) {
            clearTimeout(timer);
            if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
            // Caller-initiated abort: propagate immediately.
            if (externalSignal && externalSignal.aborted) throw err;
            // Per-attempt timeout aborts continue retrying.
            lastErr = err;
            if (attempt === config.retries) throw err;
        }

        const delay = jitter(Math.min(config.baseDelayMs * 2 ** attempt, config.maxDelayMs));
        try {
            await sleep(delay, externalSignal);
        } catch (e) {
            throw e; // external abort during backoff
        }
        attempt += 1;
    }

    throw lastErr || new Error('retryFetch: exhausted');
}

// Convenience helper that JSON-parses the response or throws with the body text.
export async function retryFetchJson(url, init = {}, opts = {}) {
    const res = await retryFetch(url, init, opts);
    if (!res.ok) {
        let detail = '';
        try { detail = (await res.text()).slice(0, 500); } catch (_e) { /* noop */ }
        const err = new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}
