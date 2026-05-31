/**
 * @jest-environment node
 */
// __tests__/api/email.test.ts
import { NextRequest } from 'next/server'

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    },
  })),
}))

import { POST } from '@/app/api/email/route'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/email', () => {
  it('returns 400 for an invalid email address', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email', outputs: { readme: 'content' } }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('valid email')
  })

  it('returns 400 when outputs is empty', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com', outputs: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 200 on successful send', async () => {
    const res = await POST(makeRequest({
      email: 'user@example.com',
      outputs: { readme: '# My Project\nA cool project.' },
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
