import { getFileName } from '@/lib/zip'

describe('getFileName', () => {
  it('returns README.md for readme', () => {
    expect(getFileName('readme')).toBe('README.md')
  })

  it('returns landing-page.txt for landing', () => {
    expect(getFileName('landing')).toBe('landing-page.txt')
  })

  it('returns tweet-thread.txt for tweet', () => {
    expect(getFileName('tweet')).toBe('tweet-thread.txt')
  })

  it('returns product-hunt.txt for producthunt', () => {
    expect(getFileName('producthunt')).toBe('product-hunt.txt')
  })
})
