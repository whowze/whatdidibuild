/**
 * @jest-environment jsdom
 */
// __tests__/components/InputSection.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputSection } from '@/components/InputSection'

const noop = () => {}

describe('InputSection', () => {
  it('renders GitHub URL and Paste Code tabs', () => {
    render(<InputSection inputType="url" input="" onChange={noop} />)
    expect(screen.getByText('GitHub URL')).toBeInTheDocument()
    expect(screen.getByText('Paste Code')).toBeInTheDocument()
  })

  it('shows the URL input when inputType is url', () => {
    render(<InputSection inputType="url" input="" onChange={noop} />)
    expect(screen.getByPlaceholderText(/github\.com/i)).toBeInTheDocument()
  })

  it('displays an error message when error prop is provided', () => {
    render(<InputSection inputType="url" input="" error="Invalid URL" onChange={noop} />)
    expect(screen.getByText('Invalid URL')).toBeInTheDocument()
  })

  it('calls onChange when the URL input changes', async () => {
    const onChange = jest.fn()
    render(<InputSection inputType="url" input="" onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText(/github\.com/i), 'h')
    expect(onChange).toHaveBeenCalledWith('url', 'h')
  })
})
