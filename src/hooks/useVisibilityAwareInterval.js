import { useEffect, useRef } from 'react';

/**
 * Run `callback` every `delayMs` while `enabled` is true AND the document is visible.
 * Pauses automatically when the tab is backgrounded.
 *
 * On a `hidden -> visible` transition the callback fires once immediately so the user
 * sees fresh data right after refocus, then resumes the interval. On initial activation
 * we do NOT fire immediately — the consumer is expected to do its own initial fetch.
 */
export function useVisibilityAwareInterval(callback, delayMs, enabled = true) {
    const savedRef = useRef(callback);
    useEffect(() => { savedRef.current = callback; }, [callback]);

    useEffect(() => {
        if (!enabled || !delayMs) return undefined;

        let intervalId = null;

        const startInterval = () => {
            if (intervalId !== null) return;
            intervalId = setInterval(() => {
                try { savedRef.current && savedRef.current(); } catch (_e) { /* swallow */ }
            }, delayMs);
        };

        const stop = () => {
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleVisibility = () => {
            if (document.hidden) {
                stop();
            } else {
                // Tab regained focus: refresh once immediately, then resume interval.
                try { savedRef.current && savedRef.current(); } catch (_e) { /* swallow */ }
                startInterval();
            }
        };

        if (!document.hidden) startInterval();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            stop();
        };
    }, [delayMs, enabled]);
}
