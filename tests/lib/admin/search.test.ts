import { describe, it, expect } from 'vitest'
import { ilikeFilterValue, ilikeAnyColumn } from '@/lib/admin/search'

describe('ilikeFilterValue', () => {
  it('wraps the term in quotes so PostgREST syntax cannot leak out of it', () => {
    expect(ilikeFilterValue('beans')).toBe('"%beans%"')
  })

  it('neutralises a comma, which would otherwise start a new OR branch', () => {
    // Unquoted, `x,status.eq.active` would add a filter on a column the caller
    // never chose. Quoted, it is just a search term containing a comma.
    expect(ilikeFilterValue('x,status.eq.active')).toBe('"%x,status.eq.active%"')
  })

  it('escapes double quotes so the term cannot close its own quoting', () => {
    expect(ilikeFilterValue('a"b')).toBe('"%a\\"b%"')
  })

  it('escapes backslashes before they can escape the closing quote', () => {
    expect(ilikeFilterValue('a\\')).toBe('"%a\\\\%"')
  })

  it('leaves parentheses inert inside the quoted value', () => {
    expect(ilikeFilterValue('a)b(c')).toBe('"%a)b(c%"')
  })
})

describe('ilikeAnyColumn', () => {
  it('builds one ilike branch per column', () => {
    expect(ilikeAnyColumn(['name', 'phone'], 'kath')).toBe(
      'name.ilike."%kath%",phone.ilike."%kath%"',
    )
  })

  it('keeps an injected branch inside the value rather than adding a filter', () => {
    const filter = ilikeAnyColumn(['name'], 'x",status.eq.active,name.ilike."')
    // Exactly one branch — the injected `status.eq.active` is part of the
    // quoted search value, not a filter of its own.
    expect(filter.startsWith('name.ilike."%')).toBe(true)
    expect(filter).toBe('name.ilike."%x\\",status.eq.active,name.ilike.\\"%"')
  })
})
