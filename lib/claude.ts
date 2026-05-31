// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'
import { OutputType } from '@/types'

// Update to latest model at console.anthropic.com/settings/models
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
