/**
 * @jest-environment jsdom
 */
// __tests__/components/ThemeToggle.test.tsx
import { render, screen } from '@testing-library/react'
import { ThemeToggle } from '@/components/ThemeToggle'

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}))

describe('ThemeToggle', () => {
  it('renders a button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has an accessible label', () => {
    render(<ThemeToggle />)
    expect(screen.getByLabelText(/toggle theme/i)).toBeInTheDocument()
  })
})
