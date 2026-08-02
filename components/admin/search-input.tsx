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
        className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      )}
    </div>
  )
}
