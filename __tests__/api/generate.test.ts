/**
 * @jest-environment node
 */
// __tests__/api/generate.test.ts
import { NextRequest } from 'next/server'

jest.mock('@/lib/github', () => ({
  isValidGitHubUrl: (url: string) => url.startsWith('https://github.com/'),
  fetchRepoContent: jest.fn().mockResolvedValue('mock repo content'),
}))

jest.mock('@/lib/claude', () => ({
  generateOutput: jest.fn().mockResolvedValue('mock generated output'),
}))

import { POST } from '@/app/api/generate/route'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/generate', () => {
  it('returns 400 when input is empty', async () => {
    const res = await POST(makeRequest({ inputType: 'paste', input: '', selectedOutputs: ['readme'] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 400 when selectedOutputs is empty', async () => {
    const res = await POST(makeRequest({ inputType: 'paste', input: 'some code', selectedOutputs: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when GitHub URL is invalid', async () => {
    const res = await POST(makeRequest({ inputType: 'url', input: 'https://notgithub.com/x/y', selectedOutputs: ['readme'] }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with outputs for paste input', async () => {
    const res = await POST(makeRequest({
      inputType: 'paste',
      input: 'const hello = () => console.log("hi")',
      selectedOutputs: ['readme', 'tweet'],
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.outputs).toHaveProperty('readme')
    expect(data.outputs).toHaveProperty('tweet')
  })

  it('returns 200 with outputs for valid GitHub URL', async () => {
    const res = await POST(makeRequest({
      inputType: 'url',
      input: 'https://github.com/vercel/next.js',
      selectedOutputs: ['landing'],
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.outputs).toHaveProperty('landing')
  })
})
