/**
 * @jest-environment node
 */
import { parseGitHubUrl, isValidGitHubUrl } from '@/lib/github'

describe('parseGitHubUrl', () => {
  it('extracts owner and repo from a standard GitHub URL', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js')
    expect(result).toEqual({ owner: 'vercel', repo: 'next.js' })
  })

  it('extracts owner and repo from a URL with trailing slash', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js/')
    expect(result).toEqual({ owner: 'vercel', repo: 'next.js' })
  })

  it('returns null for a non-GitHub URL', () => {
    const result = parseGitHubUrl('https://gitlab.com/user/repo')
    expect(result).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    const result = parseGitHubUrl('not-a-url')
    expect(result).toBeNull()
  })
})

describe('isValidGitHubUrl', () => {
  it('returns true for a valid GitHub URL', () => {
    expect(isValidGitHubUrl('https://github.com/vercel/next.js')).toBe(true)
  })

  it('returns false for a non-GitHub URL', () => {
    expect(isValidGitHubUrl('https://example.com')).toBe(false)
  })
})
