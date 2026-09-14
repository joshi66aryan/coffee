/**
 * A group of related rows printed as one card.
 *
 * The café surfaces had drifted into one bordered card per control — a page of
 * near-identical white boxes with nothing to say which belonged together. Rows
 * that share a purpose share a card instead, separated by hairlines, so the
 * page reads as a short list rather than a stack of cards.
 *
 * Children are expected to be flush rows (their own padding, no border or
 * background of their own); the group owns the frame.
 */
export function ListGroup({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section>
      {title && <h2 className="eyebrow mb-2.5">{title}</h2>}
      <div className="divide-y divide-cream-200 overflow-hidden rounded-xl border border-cream-300 bg-white">
        {children}
      </div>
    </section>
  )
}
