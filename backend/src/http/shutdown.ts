import type { Server } from 'node:http';

interface Closable {
  end(): Promise<void>;
}

const GRACE_MS = 8_000;

export function shutdown(server: Server, pool: Closable, graceMs = GRACE_MS): Promise<void> {
  return new Promise((resolve) => {
    const force = setTimeout(() => {
      server.closeAllConnections();
    }, graceMs);
    server.close(() => {
      clearTimeout(force);
      pool.end().then(resolve, resolve);
    });
    server.closeIdleConnections();
  });
}

export function closeOnSignal(server: Server, pool: Closable, exit: (code: number) => void = process.exit): void {
  let closing = false;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      if (closing) return;
      closing = true;
      void shutdown(server, pool).then(() => exit(0));
    });
  }
}
