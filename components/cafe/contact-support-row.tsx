import { ChevronRight, MessageCircle } from 'lucide-react'
import { SUPPORT_WHATSAPP_LINK } from '@/lib/cafe/constants'

export function ContactSupportRow() {
  return (
    <a
      href={SUPPORT_WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
        <MessageCircle className="w-4 h-4 text-emerald-600" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Need help?</p>
        <p className="text-xs text-gray-400">Contact support on WhatsApp</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </a>
  )
}
