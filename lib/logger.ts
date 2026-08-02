type Meta = Record<string, unknown>

function write(level: string, msg: string, meta?: Meta) {
  const line = JSON.stringify({ level, msg, ...meta, ts: new Date().toISOString() })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

const logger = {
  info:  (msg: string, meta?: Meta) => write('info',  msg, meta),
  warn:  (msg: string, meta?: Meta) => write('warn',  msg, meta),
  error: (msg: string, meta?: Meta) => write('error', msg, meta),
}

export default logger
