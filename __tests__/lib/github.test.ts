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

  it('strips .git suffix from repo name', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js.git')
    expect(result).toEqual({ owner: 'vercel', repo: 'next.js' })
  })

  it('strips query string from repo name', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js?tab=readme')
    expect(result).toEqual({ owner: 'vercel', repo: 'next.js' })
  })

  it('returns null for a spoofed host URL', () => {
    const result = parseGitHubUrl('https://evil.com/github.com/user/repo')
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

describe('fetchRepoContent', () => {
  it('throws when no files can be read', async () => {
    jest.resetModules()
    jest.mock('@octokit/rest', () => ({
      Octokit: jest.fn().mockImplementation(() => ({
        repos: {
          getReadme: jest.fn().mockRejectedValue(new Error('Not Found')),
          getContent: jest.fn().mockRejectedValue(new Error('Not Found')),
        },
      })),
    }))
    const { fetchRepoContent } = await import('@/lib/github')
    await expect(fetchRepoContent('https://github.com/user/repo')).rejects.toThrow(
      'Could not read any files from this repository.'
    )
  })
})
