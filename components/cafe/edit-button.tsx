import { Pencil } from 'lucide-react'

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip shrink-0 gap-1.5"
    >
      Edit <Pencil className="h-3 w-3" />
    </button>
  )
}
