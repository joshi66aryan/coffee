'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface Props {
  placeholder?: string
}

export function SearchInput({ placeholder = 'Search…' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }, 300)

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="field w-full pl-9! pr-8! text-sm! sm:w-64 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      )}
    </div>
  )
}
