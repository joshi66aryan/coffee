import { ChevronRight, MessageCircle } from 'lucide-react'
import { SUPPORT_WHATSAPP_LINK } from '@/lib/cafe/constants'

export function ContactSupportRow() {
  return (
    <a
      href={SUPPORT_WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3.5 rounded-xl border border-cream-300 bg-white px-4 py-4 transition-colors hover:border-brand-600 hover:bg-cream-100"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-olive-600 text-cream-100">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-base leading-none text-brand-900">Need help?</p>
        <p className="mt-2 text-xs text-gray-500">Contact support on WhatsApp</p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-cream-400" />
    </a>
  )
}
