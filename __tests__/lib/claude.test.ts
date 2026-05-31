/**
 * @jest-environment node
 */
import { getPrompt } from '@/lib/claude'

describe('getPrompt', () => {
  it('returns a non-empty string for readme', () => {
    const prompt = getPrompt('readme')
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(20)
    expect(prompt.toLowerCase()).toContain('readme')
  })

  it('returns a non-empty string for landing', () => {
    const prompt = getPrompt('landing')
    expect(typeof prompt).toBe('string')
    expect(prompt.toLowerCase()).toContain('headline')
  })

  it('returns a non-empty string for tweet', () => {
    const prompt = getPrompt('tweet')
    expect(typeof prompt).toBe('string')
    expect(prompt.toLowerCase()).toContain('tweet')
  })

  it('returns a non-empty string for producthunt', () => {
    const prompt = getPrompt('producthunt')
    expect(typeof prompt).toBe('string')
    expect(prompt.toLowerCase()).toContain('tagline')
  })
})
