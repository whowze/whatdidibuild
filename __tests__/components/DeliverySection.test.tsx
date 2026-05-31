/**
 * @jest-environment jsdom
 */
// __tests__/components/DeliverySection.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeliverySection } from '@/components/DeliverySection'

jest.mock('@/lib/zip', () => ({
  downloadOutputsAsZip: jest.fn(),
}))

const mockOutputs = { readme: '# Hello' }

describe('DeliverySection', () => {
  it('renders email input, Send All button, and Download All button', () => {
    render(<DeliverySection outputs={mockOutputs} />)
    expect(screen.getByPlaceholderText(/your@email/i)).toBeInTheDocument()
    expect(screen.getByText(/send all/i)).toBeInTheDocument()
    expect(screen.getByText(/download all/i)).toBeInTheDocument()
  })

  it('shows an error when Send All is clicked with an invalid email', async () => {
    render(<DeliverySection outputs={mockOutputs} />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'not-an-email')
    await userEvent.click(screen.getByText(/send all/i))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })
})
