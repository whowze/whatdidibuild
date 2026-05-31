/**
 * @jest-environment jsdom
 */
// __tests__/components/OutputSelector.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OutputSelector } from '@/components/OutputSelector'

// Minimal mock for shadcn Checkbox — @base-ui/react uses PointerEvent which
// jsdom does not support, so we replace it with a plain <input type="checkbox">.
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, 'aria-label': ariaLabel }: {
    id?: string
    checked?: boolean
    onCheckedChange?: () => void
    'aria-label'?: string
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onCheckedChange}
      aria-label={ariaLabel}
      readOnly={!onCheckedChange}
    />
  ),
}))

describe('OutputSelector', () => {
  it('renders all four output options', () => {
    render(<OutputSelector selected={[]} onChange={() => {}} />)
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('Landing Page')).toBeInTheDocument()
    expect(screen.getByText('Tweet Thread')).toBeInTheDocument()
    expect(screen.getByText('Product Hunt Pitch')).toBeInTheDocument()
  })

  it('checks the boxes that are in the selected array', () => {
    render(<OutputSelector selected={['readme', 'tweet']} onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: /readme/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /tweet/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /landing/i })).not.toBeChecked()
  })

  it('calls onChange with updated selection when a checkbox is clicked', async () => {
    const onChange = jest.fn()
    render(<OutputSelector selected={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /readme/i }))
    expect(onChange).toHaveBeenCalledWith(['readme'])
  })

  it('calls onChange without the item when an already-selected checkbox is clicked', async () => {
    const onChange = jest.fn()
    render(<OutputSelector selected={['readme']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /readme/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
