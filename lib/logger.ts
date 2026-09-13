type Meta = Record<string, unknown>

// Nearly every call site in this app reports an underlying failure as
// `{ msg: error.message }` — which collided with this function's own `msg`
// parameter when the metadata was spread over it, so the label was replaced by
// the cause and every error line in production read as a bare Supabase string
// with nothing saying which operation produced it. Searching the logs for
// "Failed to place order" returned nothing, ever.
//
// Both halves are worth keeping, so the cause is moved to `cause` rather than
// either one being dropped. Doing it here keeps all 70-odd call sites as they
// are, and means a new one cannot reintroduce the collision.
function write(level: string, msg: string, meta?: Meta) {
  const { msg: cause, ...rest } = meta ?? {}

  const line = JSON.stringify({
    level,
    msg,
    ...(cause === undefined ? {} : { cause }),
    ...rest,
    ts: new Date().toISOString(),
  })

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
