type LogEntry = Record<string, unknown>;

export interface Logger {
  info(entry: LogEntry): void;
  error(entry: LogEntry): void;
}

export function createLogger(silent = false): Logger {
  const write = (level: 'info' | 'error', entry: LogEntry) => {
    if (silent) return;
    console[level](JSON.stringify({ timestamp: new Date().toISOString(), level, ...entry }));
  };
  return {
    info: (entry) => write('info', entry),
    error: (entry) => write('error', entry),
  };
}
