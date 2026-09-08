/**
 * Escapes a user-supplied search term for use as a value inside a PostgREST
 * `or=(...)` filter string.
 *
 * `.or()` takes a *filter expression*, not a parameter — the term is spliced
 * straight into it, and `,` `.` `(` `)` are that expression's own syntax. An
 * unescaped term therefore doesn't just search badly, it rewrites the filter:
 * a search for `x,status.eq.active` turns one ilike into an extra OR branch on
 * a column the caller never chose. PostgREST accepts double-quoted values, and
 * inside them only `"` and `\` are special, so quoting is the fix.
 *
 * Returned already wrapped in quotes and `%`-padded — callers interpolate it
 * as the whole right-hand side of an `ilike`.
 */
export function ilikeFilterValue(term: string): string {
  const escaped = term.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"%${escaped}%"`
}

/** An `or=(...)` expression matching `term` against each of `columns`. */
export function ilikeAnyColumn(columns: string[], term: string): string {
  const value = ilikeFilterValue(term)
  return columns.map(column => `${column}.ilike.${value}`).join(',')
}
