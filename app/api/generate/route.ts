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

    let code: string
    if (inputType === 'url') {
      code = await fetchRepoContent(input)
    } else {
      code = input.trim()
    }

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
