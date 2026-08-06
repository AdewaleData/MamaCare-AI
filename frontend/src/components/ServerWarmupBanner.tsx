import { Loader2, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import type { WarmupStatus } from '../hooks/useServerWarmup';

interface Props {
  status: WarmupStatus;
  elapsed: number;
}

/**
 * Shown on Login / Register pages while the Render free-tier backend wakes up.
 * Renders nothing when status is 'ready'.
 */
export default function ServerWarmupBanner({ status, elapsed }: Props) {
  if (status === 'ready') return null;

  const messages: Record<WarmupStatus, string> = {
    connecting: 'Connecting to server…',
    slow: `Server is waking up — this takes up to 60 s on first visit (${elapsed}s)`,
    offline: 'Unable to reach server. Please check your connection and refresh.',
    ready: '',
  };

  const colours: Record<WarmupStatus, string> = {
    connecting: 'bg-primary-50 border-primary-200 text-primary-800',
    slow:       'bg-amber-50   border-amber-200   text-amber-800',
    offline:    'bg-red-50     border-red-200     text-red-800',
    ready:      '',
  };

  const icons: Record<WarmupStatus, React.ReactNode> = {
    connecting: <Loader2 className="h-4 w-4 animate-spin shrink-0" />,
    slow:       <Loader2 className="h-4 w-4 animate-spin shrink-0" />,
    offline:    <WifiOff className="h-4 w-4 shrink-0" />,
    ready:      <CheckCircle2 className="h-4 w-4 shrink-0" />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-300 ${colours[status]}`}
    >
      {icons[status]}
      <span>{messages[status]}</span>
    </div>
  );
}
