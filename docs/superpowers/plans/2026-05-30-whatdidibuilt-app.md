# WhatDidIBuild.app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js web app that accepts a GitHub repo URL or pasted code and generates a README, landing page copy, tweet thread, and Product Hunt pitch via Claude — with email delivery and zip download.

**Architecture:** Next.js 14 App Router with two API routes (`/api/generate` for Claude calls, `/api/email` for Resend delivery). Client-side React manages all UI state. Core business logic lives in focused `lib/` modules (github, claude, zip) that are independently testable. No database, no auth.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, @anthropic-ai/sdk, @octokit/rest, resend, jszip, next-themes, Jest, React Testing Library

---

## File Map

| File | Responsibility |
|---|---|
| `types/index.ts` | Shared TypeScript types used across lib, API routes, and components |
| `lib/github.ts` | Fetch key files from a public GitHub repo via Octokit |
| `lib/claude.ts` | Call Claude with a per-output-type prompt, return generated text |
| `lib/zip.ts` | Client-side zip generation and browser download trigger |
| `app/api/generate/route.ts` | POST handler — validates input, calls github/claude libs, returns outputs |
| `app/api/email/route.ts` | POST handler — validates email, sends outputs via Resend |
| `components/ThemeToggle.tsx` | Light/dark toggle button using next-themes |
| `components/InputSection.tsx` | Tabs for URL vs paste input with error display |
| `components/OutputSelector.tsx` | Four checkboxes for selecting output types |
| `components/ResultsSection.tsx` | Tabbed output cards with per-tab Copy button |
| `components/DeliverySection.tsx` | Email field + Send button + Download All zip button |
| `lib/validators.ts` | Shared validation helpers (email regex) used by API route and component |
| `app/layout.tsx` | Root layout — ThemeProvider, Inter font, metadata |
| `app/page.tsx` | Main page — wires all components, manages all UI state |
| `app/globals.css` | Tailwind base styles |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts` (via create-next-app)
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.local`

- [ ] **Step 1: Scaffold Next.js into the existing directory**

Run from `/Users/whowze/Desktop/WhatDidIBuild`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```
When prompted:
- Would you like to use Turbopack? → **No**
- All other prompts → accept defaults

Expected: project files created. `npm run dev` will work after this.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @anthropic-ai/sdk @octokit/rest resend jszip next-themes
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/jszip
```

Expected: `node_modules` updated, no errors.

- [ ] **Step 3: Install shadcn/ui and add components**

```bash
npx shadcn@latest init
```
When prompted: choose Default style, Slate base color, yes to CSS variables.

Then add components:
```bash
npx shadcn@latest add button input textarea tabs checkbox label
```

Expected: `components/ui/` directory with button.tsx, input.tsx, textarea.tsx, tabs.tsx, checkbox.tsx, label.tsx.

- [ ] **Step 4: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

- [ ] **Step 5: Create jest.setup.ts**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to package.json**

Open `package.json` and add to the `"scripts"` section:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 7: Create .env.local**

```bash
# .env.local — never commit this file
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GITHUB_TOKEN=your_github_token_here
RESEND_API_KEY=your_resend_api_key_here
```

Verify `.env.local` is in `.gitignore` (create-next-app adds it by default).

- [ ] **Step 8: Verify setup**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000 with the default Next.js homepage. Stop with Ctrl+C.

```bash
npm test
```

Expected: `No tests found` — that's fine for now.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with shadcn, jest, and dependencies"
```

---

## Task 2: Shared Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Create types/index.ts**

```typescript
// types/index.ts

export type OutputType = 'readme' | 'landing' | 'tweet' | 'producthunt'
export type InputType = 'url' | 'paste'

export interface GenerateRequest {
  inputType: InputType
  input: string
  selectedOutputs: OutputType[]
}

export interface GenerateResponse {
  outputs: Partial<Record<OutputType, string>>
  error?: string
}

export interface EmailRequest {
  email: string
  outputs: Partial<Record<OutputType, string>>
}

export interface EmailResponse {
  success?: boolean
  error?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: GitHub Fetching Library

**Files:**
- Create: `lib/github.ts`
- Create: `__tests__/lib/github.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/lib/github.test.ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=github
```

Expected: FAIL — `Cannot find module '@/lib/github'`

- [ ] **Step 3: Create lib/github.ts**

```typescript
// lib/github.ts
import { Octokit } from '@octokit/rest'

const MAX_SOURCE_FILES = 5
const SOURCE_FILE_EXTENSIONS = /\.(ts|tsx|js|jsx|py|rs|go|rb|java|cs|cpp|c)$/
const KEY_MANIFEST_FILES = ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pyproject.toml']

export interface ParsedRepo {
  owner: string
  repo: string
}

export function parseGitHubUrl(url: string): ParsedRepo | null {
  const match = url.match(/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\/|$)/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

export function isValidGitHubUrl(url: string): boolean {
  return parseGitHubUrl(url) !== null
}

export async function fetchRepoContent(url: string): Promise<string> {
  const parsed = parseGitHubUrl(url)
  if (!parsed) throw new Error('Invalid GitHub URL')

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
  })

  const { owner, repo } = parsed
  const sections: string[] = []

  // Fetch README
  try {
    const { data } = await octokit.repos.getReadme({ owner, repo })
    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    sections.push(`=== README.md ===\n${content}`)
  } catch {
    // No README — continue
  }

  // Fetch first matching manifest file
  for (const filename of KEY_MANIFEST_FILES) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filename })
      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        sections.push(`=== ${filename} ===\n${content}`)
        break
      }
    } catch {
      // File not found — try next
    }
  }

  // Fetch up to MAX_SOURCE_FILES root-level source files
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: '' })
    if (Array.isArray(data)) {
      const sourceFiles = data
        .filter(f => f.type === 'file' && SOURCE_FILE_EXTENSIONS.test(f.name))
        .slice(0, MAX_SOURCE_FILES)

      for (const file of sourceFiles) {
        try {
          const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.path,
          })
          if ('content' in fileData) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
            sections.push(`=== ${file.path} ===\n${content}`)
          }
        } catch {
          // Skip unreadable file
        }
      }
    }
  } catch {
    // Root listing failed — continue with what we have
  }

  if (sections.length === 0) {
    throw new Error('Could not read any files from this repository.')
  }

  return sections.join('\n\n')
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=github
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/github.ts __tests__/lib/github.test.ts
git commit -m "feat: add GitHub repo fetching library"
```

---

## Task 4: Claude Generation Library

**Files:**
- Create: `lib/claude.ts`
- Create: `__tests__/lib/claude.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/lib/claude.test.ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=claude
```

Expected: FAIL — `Cannot find module '@/lib/claude'`

- [ ] **Step 3: Create lib/claude.ts**

```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'
import { OutputType } from '@/types'

// Update this to the latest available model at console.anthropic.com/settings/models
const MODEL = 'claude-opus-4-5'

const PROMPTS: Record<OutputType, string> = {
  readme: `You are a technical writer. Based on the following code and project files, write a clean README.md with these sections:
- A one-line description of what the project does (bold, at the top)
- ## What it does (2-3 sentences explaining the purpose and value)
- ## Installation (numbered steps to get it running)
- ## Usage (a minimal working example with a code block)

Use proper markdown formatting throughout.`,

  landing: `You are a SaaS copywriter. Based on the following code and project files, write landing page copy with exactly these labeled sections:

HEADLINE: (under 10 words, action-oriented verb, no punctuation at end)
SUBHEADLINE: (one sentence that expands on the headline, under 20 words)
FEATURE_1: (benefit-focused bullet, under 15 words)
FEATURE_2: (benefit-focused bullet, under 15 words)
FEATURE_3: (benefit-focused bullet, under 15 words)
CTA: (call-to-action button label, 2-4 words)

Output only the labeled sections — no extra commentary.`,

  tweet: `You are a developer advocate. Based on the following code and project files, write a 5-tweet launch thread. Format each tweet exactly as shown:

Tweet 1: (hook — name the pain point this solves, under 280 chars)
Tweet 2: (key capability or feature, under 280 chars)
Tweet 3: (another key feature or use case, under 280 chars)
Tweet 4: (how it works or a surprising detail, under 280 chars)
Tweet 5: (CTA — include the placeholder text [LINK], under 280 chars)

Output only the five labeled tweets — no extra commentary.`,

  producthunt: `You are a Product Hunt veteran. Based on the following code and project files, write a Product Hunt listing with exactly these labeled sections:

TAGLINE: (under 60 characters, punchy, no period at end)
DESCRIPTION: (under 260 characters — what it does and who it's for)
FIRST_COMMENT: (2-3 sentences: why you built this, what problem it solves, what makes it different from existing tools)

Output only the labeled sections — no extra commentary.`,
}

export function getPrompt(outputType: OutputType): string {
  return PROMPTS[outputType]
}

export async function generateOutput(code: string, outputType: OutputType): Promise<string> {
  const client = new Anthropic()

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${PROMPTS[outputType]}\n\n---\n\n${code}`,
      },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }
  return block.text
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=claude
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/claude.ts __tests__/lib/claude.test.ts
git commit -m "feat: add Claude generation library with per-output prompts"
```

---

## Task 5: Zip Download Library

**Files:**
- Create: `lib/zip.ts`
- Create: `__tests__/lib/zip.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/lib/zip.test.ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=zip
```

Expected: FAIL — `Cannot find module '@/lib/zip'`

- [ ] **Step 3: Create lib/zip.ts**

```typescript
// lib/zip.ts
// This module runs client-side only (browser). Do not import in API routes.
import JSZip from 'jszip'
import { OutputType } from '@/types'

const FILE_NAMES: Record<OutputType, string> = {
  readme: 'README.md',
  landing: 'landing-page.txt',
  tweet: 'tweet-thread.txt',
  producthunt: 'product-hunt.txt',
}

export function getFileName(outputType: OutputType): string {
  return FILE_NAMES[outputType]
}

export async function downloadOutputsAsZip(
  outputs: Partial<Record<OutputType, string>>
): Promise<void> {
  const zip = new JSZip()

  for (const [type, content] of Object.entries(outputs) as [OutputType, string][]) {
    zip.file(FILE_NAMES[type], content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'whatdidibuild-outputs.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=zip
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/zip.ts __tests__/lib/zip.test.ts
git commit -m "feat: add client-side zip download library"
```

---

## Task 6: Generate API Route

**Files:**
- Create: `app/api/generate/route.ts`
- Create: `__tests__/api/generate.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/api/generate.test.ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// Mock the lib modules so we don't hit real APIs in tests
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=generate
```

Expected: FAIL — `Cannot find module '@/app/api/generate/route'`

- [ ] **Step 3: Create app/api/generate/route.ts**

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchRepoContent, isValidGitHubUrl } from '@/lib/github'
import { generateOutput } from '@/lib/claude'
import { GenerateRequest, GenerateResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { inputType, input, selectedOutputs } = body

    if (!input?.trim()) {
      return NextResponse.json({ error: 'Input is required.' }, { status: 400 })
    }

    if (!selectedOutputs?.length) {
      return NextResponse.json({ error: 'Select at least one output.' }, { status: 400 })
    }

    if (inputType === 'url' && !isValidGitHubUrl(input)) {
      return NextResponse.json(
        { error: "Couldn't find that repo — is it a valid public GitHub URL?" },
        { status: 400 }
      )
    }

    // Resolve code context
    let code: string
    if (inputType === 'url') {
      code = await fetchRepoContent(input)
    } else {
      code = input.trim()
    }

    // Fire all Claude calls concurrently
    const results = await Promise.all(
      selectedOutputs.map(async outputType => ({
        type: outputType,
        content: await generateOutput(code, outputType),
      }))
    )

    const outputs = Object.fromEntries(results.map(r => [r.type, r.content]))
    const response: GenerateResponse = { outputs }
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''

    if (message.includes('private') || message.includes('404') || message.includes('Not Found')) {
      return NextResponse.json(
        { error: 'This repo is private — paste the code directly instead.' },
        { status: 403 }
      )
    }

    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=generate
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/api/generate/ __tests__/api/generate.test.ts
git commit -m "feat: add generate API route with validation and error handling"
```

---

## Task 7: Validators Library + Email API Route

**Files:**
- Create: `lib/validators.ts`
- Create: `app/api/email/route.ts`
- Create: `__tests__/api/email.test.ts`

- [ ] **Step 0: Create lib/validators.ts**

```typescript
// lib/validators.ts
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}
```

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/api/email.test.ts
/**
 * @jest-environment node
 */
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=email
```

Expected: FAIL — `Cannot find module '@/app/api/email/route'`

- [ ] **Step 3: Create app/api/email/route.ts**

```typescript
// app/api/email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EmailRequest, EmailResponse, OutputType } from '@/types'
import { isValidEmail } from '@/lib/validators'

const OUTPUT_LABELS: Record<OutputType, string> = {
  readme: 'README.md',
  landing: 'Landing Page Copy',
  tweet: 'Tweet Thread',
  producthunt: 'Product Hunt Pitch',
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()
    const { email, outputs } = body

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    if (!outputs || Object.keys(outputs).length === 0) {
      return NextResponse.json({ error: 'No outputs to send.' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const sections = (Object.entries(outputs) as [OutputType, string][])
      .map(
        ([type, content]) => `
        <h2 style="color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-top:32px;">
          ${OUTPUT_LABELS[type]}
        </h2>
        <pre style="background:#f8fafc;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.6;font-family:monospace;">${content}</pre>
      `
      )
      .join('')

    await resend.emails.send({
      from: 'WhatDidIBuild <hello@whatdidibuild.app>',
      to: email,
      subject: 'Your WhatDidIBuild outputs',
      html: `
        <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px;">
          <h1 style="color:#1e293b;">Your generated outputs</h1>
          <p style="color:#64748b;">Generated by <a href="https://whatdidibuild.app">whatdidibuild.app</a></p>
          ${sections}
          <p style="color:#94a3b8;font-size:12px;margin-top:40px;">
            Sent from <a href="https://whatdidibuild.app">whatdidibuild.app</a>
          </p>
        </div>
      `,
    })

    const response: EmailResponse = { success: true }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json(
      { error: "Couldn't send the email. Try downloading instead." },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=email
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/api/email/ __tests__/api/email.test.ts
git commit -m "feat: add email delivery API route via Resend"
```

---

## Task 8: ThemeToggle Component

**Files:**
- Create: `components/ThemeToggle.tsx`
- Create: `__tests__/components/ThemeToggle.test.tsx`

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/components/ThemeToggle.test.tsx
import { render, screen } from '@testing-library/react'
import { ThemeToggle } from '@/components/ThemeToggle'

// next-themes reads from the DOM; mock it for tests
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=ThemeToggle
```

Expected: FAIL — `Cannot find module '@/components/ThemeToggle'`

- [ ] **Step 3: Create components/ThemeToggle.tsx**

```typescript
// components/ThemeToggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=ThemeToggle
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/ThemeToggle.tsx __tests__/components/ThemeToggle.test.tsx
git commit -m "feat: add ThemeToggle component"
```

---

## Task 9: InputSection Component

**Files:**
- Create: `components/InputSection.tsx`
- Create: `__tests__/components/InputSection.test.tsx`

- [ ] **Step 1: Create the test file**

```typescript
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=InputSection
```

Expected: FAIL — `Cannot find module '@/components/InputSection'`

- [ ] **Step 3: Create components/InputSection.tsx**

```typescript
// components/InputSection.tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { InputType } from '@/types'

interface InputSectionProps {
  inputType: InputType
  input: string
  error?: string
  onChange: (inputType: InputType, value: string) => void
}

export function InputSection({ inputType, input, error, onChange }: InputSectionProps) {
  return (
    <Tabs value={inputType} onValueChange={v => onChange(v as InputType, '')}>
      <TabsList className="w-full">
        <TabsTrigger value="url" className="flex-1">GitHub URL</TabsTrigger>
        <TabsTrigger value="paste" className="flex-1">Paste Code</TabsTrigger>
      </TabsList>

      <TabsContent value="url" className="mt-2">
        <Input
          placeholder="https://github.com/username/repo"
          value={inputType === 'url' ? input : ''}
          onChange={e => onChange('url', e.target.value)}
          className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </TabsContent>

      <TabsContent value="paste" className="mt-2">
        <Textarea
          placeholder="Paste your code here..."
          value={inputType === 'paste' ? input : ''}
          onChange={e => onChange('paste', e.target.value)}
          rows={10}
          className="font-mono text-sm"
        />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=InputSection
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/InputSection.tsx __tests__/components/InputSection.test.tsx
git commit -m "feat: add InputSection component with URL/paste tabs"
```

---

## Task 10: OutputSelector Component

**Files:**
- Create: `components/OutputSelector.tsx`
- Create: `__tests__/components/OutputSelector.test.tsx`

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/components/OutputSelector.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OutputSelector } from '@/components/OutputSelector'

describe('OutputSelector', () => {
  it('renders all four output options', () => {
    render(<OutputSelector selected={[]} onChange={() => {}} />)
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('Landing Page')).toBeInTheDocument()
    expect(screen.getByText('Tweet Thread')).toBeInTheDocument()
    expect(screen.getByText('Product Hunt Pitch')).toBeInTheDocument()
  })

  it('checks the boxes that are in the selected array', () => {
    render(<OutputSelector selected={['readme', 'tweet']} onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: /readme/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /tweet/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /landing/i })).not.toBeChecked()
  })

  it('calls onChange with updated selection when a checkbox is clicked', async () => {
    const onChange = jest.fn()
    render(<OutputSelector selected={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /readme/i }))
    expect(onChange).toHaveBeenCalledWith(['readme'])
  })

  it('calls onChange without the item when an already-selected checkbox is clicked', async () => {
    const onChange = jest.fn()
    render(<OutputSelector selected={['readme']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /readme/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=OutputSelector
```

Expected: FAIL — `Cannot find module '@/components/OutputSelector'`

- [ ] **Step 3: Create components/OutputSelector.tsx**

```typescript
// components/OutputSelector.tsx
'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { OutputType } from '@/types'

const OUTPUT_OPTIONS: { value: OutputType; label: string }[] = [
  { value: 'readme', label: 'README.md' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'tweet', label: 'Tweet Thread' },
  { value: 'producthunt', label: 'Product Hunt Pitch' },
]

interface OutputSelectorProps {
  selected: OutputType[]
  onChange: (selected: OutputType[]) => void
}

export function OutputSelector({ selected, onChange }: OutputSelectorProps) {
  const toggle = (value: OutputType) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Generate:</p>
      <div className="grid grid-cols-2 gap-3">
        {OUTPUT_OPTIONS.map(({ value, label }) => (
          <div key={value} className="flex items-center space-x-2">
            <Checkbox
              id={value}
              checked={selected.includes(value)}
              onCheckedChange={() => toggle(value)}
              aria-label={label}
            />
            <Label htmlFor={value} className="cursor-pointer">
              {label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=OutputSelector
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/OutputSelector.tsx __tests__/components/OutputSelector.test.tsx
git commit -m "feat: add OutputSelector component with four output checkboxes"
```

---

## Task 11: ResultsSection Component

**Files:**
- Create: `components/ResultsSection.tsx`
- Create: `__tests__/components/ResultsSection.test.tsx`

- [ ] **Step 1: Create the test file**

```typescript
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=ResultsSection
```

Expected: FAIL — `Cannot find module '@/components/ResultsSection'`

- [ ] **Step 3: Create components/ResultsSection.tsx**

```typescript
// components/ResultsSection.tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { OutputType } from '@/types'

const OUTPUT_LABELS: Record<OutputType, string> = {
  readme: 'README',
  landing: 'Landing Page',
  tweet: 'Tweet Thread',
  producthunt: 'Product Hunt',
}

interface ResultsSectionProps {
  outputs: Partial<Record<OutputType, string>>
}

export function ResultsSection({ outputs }: ResultsSectionProps) {
  const [copied, setCopied] = useState<OutputType | null>(null)
  const keys = Object.keys(outputs) as OutputType[]

  if (keys.length === 0) return null

  const handleCopy = async (type: OutputType, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Tabs defaultValue={keys[0]}>
      <TabsList>
        {keys.map(key => (
          <TabsTrigger key={key} value={key}>
            {OUTPUT_LABELS[key]}
          </TabsTrigger>
        ))}
      </TabsList>

      {keys.map(key => (
        <TabsContent key={key} value={key}>
          <div className="relative">
            <pre className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
              {outputs[key]}
            </pre>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleCopy(key, outputs[key]!)}
              aria-label="Copy to clipboard"
            >
              {copied === key ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=ResultsSection
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/ResultsSection.tsx __tests__/components/ResultsSection.test.tsx
git commit -m "feat: add ResultsSection component with tabs and copy buttons"
```

---

## Task 12: DeliverySection Component

**Files:**
- Create: `components/DeliverySection.tsx`
- Create: `__tests__/components/DeliverySection.test.tsx`

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/components/DeliverySection.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeliverySection } from '@/components/DeliverySection'

// Mock the zip lib (it uses browser APIs not available in jsdom)
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=DeliverySection
```

Expected: FAIL — `Cannot find module '@/components/DeliverySection'`

- [ ] **Step 3: Create components/DeliverySection.tsx**

```typescript
// components/DeliverySection.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Download, Check, Loader2 } from 'lucide-react'
import { OutputType, EmailResponse } from '@/types'
import { downloadOutputsAsZip } from '@/lib/zip'
import { isValidEmail } from '@/lib/validators'

type SendStatus = 'idle' | 'sending' | 'sent' | 'error'

interface DeliverySectionProps {
  outputs: Partial<Record<OutputType, string>>
}

export function DeliverySection({ outputs }: DeliverySectionProps) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')

  const handleSend = async () => {
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setSendStatus('sending')

    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, outputs }),
      })
      const data: EmailResponse = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSendStatus('sent')
    } catch {
      setSendStatus('error')
    }
  }

  const handleDownload = () => {
    downloadOutputsAsZip(outputs)
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Save your outputs:
      </p>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              setEmailError('')
              if (sendStatus === 'error') setSendStatus('idle')
            }}
            className={emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            disabled={sendStatus === 'sending' || sendStatus === 'sent'}
          />
          {emailError && (
            <p className="text-sm text-red-500 mt-1">{emailError}</p>
          )}
          {sendStatus === 'sent' && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              ✓ Sent! Check your inbox.
            </p>
          )}
          {sendStatus === 'error' && (
            <p className="text-sm text-red-500 mt-1">
              Couldn&apos;t send the email. Try downloading instead.
            </p>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={sendStatus === 'sending' || sendStatus === 'sent'}
          className="shrink-0"
        >
          {sendStatus === 'sending' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {sendStatus === 'sent' && <Check className="h-4 w-4 mr-2" />}
          {(sendStatus === 'idle' || sendStatus === 'error') && (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Send All
        </Button>
      </div>

      <Button variant="outline" className="w-full" onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        Download All as .zip
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=DeliverySection
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/DeliverySection.tsx __tests__/components/DeliverySection.test.tsx
git commit -m "feat: add DeliverySection component with email and zip download"
```

---

## Task 13: App Layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace app/layout.tsx**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WhatDidIBuild — Turn your code into a pitch',
  description:
    'Paste your GitHub repo URL and get a README, landing page, tweet thread, and Product Hunt pitch in seconds.',
  openGraph: {
    title: 'WhatDidIBuild',
    description: 'Turn your code into a pitch in seconds.',
    url: 'https://whatdidibuild.app',
    siteName: 'WhatDidIBuild',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify globals.css has Tailwind directives**

Open `app/globals.css`. It should already contain:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

If those lines are missing, add them at the top. Otherwise leave the file as-is.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: configure root layout with ThemeProvider and metadata"
```

---

## Task 14: Main Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx with the full implementation**

```typescript
// app/page.tsx
'use client'

import { useState } from 'react'
import { InputSection } from '@/components/InputSection'
import { OutputSelector } from '@/components/OutputSelector'
import { ResultsSection } from '@/components/ResultsSection'
import { DeliverySection } from '@/components/DeliverySection'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { InputType, OutputType, GenerateResponse } from '@/types'

export default function Home() {
  const [inputType, setInputType] = useState<InputType>('url')
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [selectedOutputs, setSelectedOutputs] = useState<OutputType[]>([
    'readme',
    'landing',
    'tweet',
    'producthunt',
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [outputs, setOutputs] = useState<Partial<Record<OutputType, string>>>({})
  const [globalError, setGlobalError] = useState('')

  const canGenerate = input.trim().length > 0 && selectedOutputs.length > 0

  const handleInputChange = (type: InputType, value: string) => {
    setInputType(type)
    setInput(value)
    setInputError('')
    setGlobalError('')
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setOutputs({})
    setGlobalError('')
    setInputError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputType, input, selectedOutputs }),
      })

      const data: GenerateResponse = await res.json()

      if (!res.ok) {
        if (res.status === 400 || res.status === 403) {
          setInputError(data.error || 'Invalid input.')
        } else {
          setGlobalError(data.error || 'Something went wrong. Try again.')
        }
        return
      }

      setOutputs(data.outputs)
    } catch {
      setGlobalError('Something went wrong. Try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const hasOutputs = Object.keys(outputs).length > 0

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          WhatDidIBuild
        </span>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Paste your repo. Get your pitch.
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Turn your code into a README, landing page, tweet thread, and Product
            Hunt pitch — in seconds.
          </p>
        </div>

        {/* Input */}
        <InputSection
          inputType={inputType}
          input={input}
          error={inputError}
          onChange={handleInputChange}
        />

        {/* Output selector */}
        <OutputSelector selected={selectedOutputs} onChange={setSelectedOutputs} />

        {/* Global error */}
        {globalError && (
          <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm">
            {globalError}
          </div>
        )}

        {/* Generate button */}
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </>
          )}
        </Button>

        {/* Results */}
        {hasOutputs && (
          <>
            <ResultsSection outputs={outputs} />
            <DeliverySection outputs={outputs} />
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Run the full test suite to verify nothing is broken**

```bash
npm test
```

Expected: All tests pass. No failures.

- [ ] **Step 3: Run the dev server and manually verify the UI**

```bash
npm run dev
```

Open http://localhost:3000. Check:
- Header renders with "WhatDidIBuild" and a theme toggle
- Hero text is visible
- GitHub URL / Paste Code tabs work
- All 4 checkboxes are checked by default
- Generate button is disabled when input is empty
- Generate button becomes active when you type a URL
- Dark mode toggle works

Stop the server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add main page — wires all components and manages UI state"
```

---

## Task 15: Deploy to Vercel + Connect Domain

- [ ] **Step 1: Push the repo to GitHub**

On GitHub, create a new repository named `whatdidibuild` (private or public — your choice). Then:

```bash
git remote add origin https://github.com/<your-username>/whatdidibuild.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Import the project on Vercel**

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the `whatdidibuild` GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy** — first deploy will fail because env vars aren't set yet. That's expected.

- [ ] **Step 3: Add environment variables in Vercel**

In your Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |
| `GITHUB_TOKEN` | Your GitHub Personal Access Token (Settings → Developer Settings → Tokens) |
| `RESEND_API_KEY` | Your Resend API key from [resend.com](https://resend.com) |

- [ ] **Step 4: Set up Resend domain verification**

1. Go to [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Enter `whatdidibuild.app`
3. Resend will give you DNS records (TXT and MX). Add these to Porkbun:
   - Porkbun dashboard → your domain → **DNS**
   - Add each record Resend provides
4. Click **Verify** in Resend. DNS can take up to 24 hours but is usually under 30 minutes.

- [ ] **Step 5: Redeploy on Vercel**

After adding env vars, go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**.

Expected: deployment succeeds and the app is live at `<project>.vercel.app`.

- [ ] **Step 6: Connect the custom domain on Vercel**

1. Vercel project → **Settings → Domains**
2. Add `whatdidibuild.app`
3. Vercel shows you two DNS records to add in Porkbun:
   - An **A record** pointing to `76.76.21.21`
   - A **CNAME record** for `www` pointing to `cname.vercel-dns.com`
4. In Porkbun → your domain → **DNS**, add both records
5. Back in Vercel, click **Refresh** — it may take a few minutes for DNS to propagate

- [ ] **Step 7: Verify the live site**

Open https://whatdidibuild.app in your browser. Check:
- Site loads with correct styles
- Light/dark mode toggle works
- Paste a public GitHub URL (e.g. `https://github.com/vercel/next.js`) and click Generate
- All four outputs generate and display in tabs
- Copy button works
- Email delivery works (enter your own email and click Send All)
- Download All produces a valid .zip with the right files

- [ ] **Step 8: Final commit with any polish fixes**

```bash
git add -A
git commit -m "feat: production-ready — deploy complete, domain connected"
git push
```

---

## Full Test Suite Reference

Run all tests:
```bash
npm test
```

Run a single file:
```bash
npm test -- --testPathPattern=<filename>
```

Run in watch mode during development:
```bash
npm run test:watch
```
