import { BottomNav } from '@/components/cafe/bottom-nav'

export default function CafeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
