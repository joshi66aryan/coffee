import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListGroup } from '@/components/ui/list-group'

describe('ListGroup', () => {
  it('prints its rows inside one card', () => {
    const { container } = render(
      <ListGroup>
        <button>Order notifications</button>
        <button>Sign out</button>
      </ListGroup>,
    )

    expect(screen.getByRole('button', { name: 'Order notifications' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    // One frame around both rows, not one per row — that stack of near-identical
    // bordered boxes is what this component exists to collapse.
    expect(container.querySelectorAll('.rounded-xl')).toHaveLength(1)
  })

  it('labels the group when given a title', () => {
    render(
      <ListGroup title="Recent Order">
        <p>row</p>
      </ListGroup>,
    )
    expect(screen.getByRole('heading', { name: 'Recent Order' })).toBeInTheDocument()
  })

  it('renders no heading when untitled', () => {
    render(
      <ListGroup>
        <p>row</p>
      </ListGroup>,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
