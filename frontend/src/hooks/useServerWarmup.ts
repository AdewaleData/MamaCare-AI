import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export type WarmupStatus = 'connecting' | 'ready' | 'slow' | 'offline';

const BACKEND_BASE = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/v1\/?$/, '');
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    return 'http://127.0.0.1:8001';
  }

  return 'https://mamacare-backend.onrender.com';
})();

/**
 * Pings the backend /health endpoint as soon as the auth page mounts.
 * This "warms up" the Render free-tier container so it is ready by the time
 * the user fills in their form and submits.
 *
 * Status transitions:
 *   connecting → ready      (responded within 10s)
 *   connecting → slow       (still waiting 10–90s — Render cold start)
 *   slow       → ready      (eventually responded)
 *   connecting | slow → offline  (failed after 90s)
 */
export function useServerWarmup() {
  const [status, setStatus] = useState<WarmupStatus>('connecting');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    // Tick elapsed seconds
    const interval = setInterval(() => {
      if (!doneRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);

    // After 10s without a response, switch to "slow" state
    const slowTimer = setTimeout(() => {
      if (!doneRef.current) setStatus('slow');
    }, 10_000);

    const controller = new AbortController();

    const ping = async () => {
      try {
        await axios.get(`${BACKEND_BASE}/health`, {
          timeout: 120_000,
          signal: controller.signal,
        });
        if (!doneRef.current) {
          doneRef.current = true;
          setStatus('ready');
        }
      } catch (err: any) {
        if (axios.isCancel(err)) return; // component unmounted
        if (!doneRef.current) {
          doneRef.current = true;
          setStatus('offline');
        }
      }
    };

    ping();

    return () => {
      controller.abort();
      clearInterval(interval);
      clearTimeout(slowTimer);
    };
  }, []);

  return { status, elapsed };
}
