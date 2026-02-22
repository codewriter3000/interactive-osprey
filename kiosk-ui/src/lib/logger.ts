type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 4000;

function getMinLogLevel(): LogLevel {
  const configured = localStorage.getItem("appLogLevel") as LogLevel | null;
  if (configured && configured in LOG_LEVEL_ORDER) return configured;
  return import.meta.env.DEV ? "debug" : "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getMinLogLevel()];
}

function safeSerialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > MAX_CONTEXT_LENGTH ? value.slice(0, MAX_CONTEXT_LENGTH) : value;
  if (typeof value === "number" || typeof value === "boolean") return value;

  try {
    const cache = new WeakSet<object>();
    const asString = JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === "object" && nestedValue !== null) {
        if (cache.has(nestedValue)) return "[Circular]";
        cache.add(nestedValue);
      }
      return nestedValue;
    });
    if (!asString) return String(value);
    return asString.length > MAX_CONTEXT_LENGTH ? `${asString.slice(0, MAX_CONTEXT_LENGTH)}...` : JSON.parse(asString);
  } catch {
    return String(value);
  }
}

function getBackendLogUrl(): string {
  const host = window.location.hostname || "127.0.0.1";
  return `http://${host}:8000/api/logs`;
}

async function sendLog(level: LogLevel, logger: string, message: string, context?: unknown): Promise<void> {
  const payload = {
    ts: new Date().toISOString(),
    level,
    logger,
    message: message.length > MAX_MESSAGE_LENGTH ? `${message.slice(0, MAX_MESSAGE_LENGTH)}...` : message,
    context: safeSerialize(context),
  };

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(getBackendLogUrl(), blob);
      return;
    }

    await fetch(getBackendLogUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      mode: "cors",
    });
  } catch {
    // intentionally swallow logger transport failures
  }
}

export type Logger = {
  debug: (message: string, context?: unknown) => void;
  info: (message: string, context?: unknown) => void;
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
};

export function createLogger(name: string): Logger {
  return {
    debug: (message, context) => {
      if (!shouldLog("debug")) return;
      void sendLog("debug", name, message, context);
    },
    info: (message, context) => {
      if (!shouldLog("info")) return;
      void sendLog("info", name, message, context);
    },
    warn: (message, context) => {
      if (!shouldLog("warn")) return;
      void sendLog("warn", name, message, context);
    },
    error: (message, context) => {
      if (!shouldLog("error")) return;
      void sendLog("error", name, message, context);
    },
  };
}
