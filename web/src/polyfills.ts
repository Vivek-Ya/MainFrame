const g = globalThis as unknown as { global?: unknown; process?: { env?: Record<string, string> }; Buffer?: unknown }

if (typeof g.global === 'undefined') {
  g.global = g
}

if (!g.process) {
  g.process = { env: {} }
}

// SockJS may check for Buffer; leave undefined if not present
