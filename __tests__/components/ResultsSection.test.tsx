/**
 * @jest-environment jsdom
 */
// __tests__/components/ResultsSection.test.tsx
import { render, screen } from '@testing-library/react'
import { ResultsSection } from '@/components/ResultsSection'

const mockOutputs = {
  readme: '# My Project\nA cool project.',
  tweet: 'Tweet 1: Introducing MyProject...',
}

describe('ResultsSection', () => {
  it('renders nothing when outputs is empty', () => {
    const { container } = render(<ResultsSection outputs={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a tab for each output', () => {
    render(<ResultsSection outputs={mockOutputs} />)
    expect(screen.getByText('README')).toBeInTheDocument()
    expect(screen.getByText('Tweet Thread')).toBeInTheDocument()
  })

  it('renders a Copy button', () => {
    render(<ResultsSection outputs={mockOutputs} />)
    expect(screen.getAllByLabelText(/copy/i).length).toBeGreaterThan(0)
  })
})
