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
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-slate-900 dark:text-slate-100">WhatDidIBuild</span>
        <ThemeToggle />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Paste your repo. Get your pitch.</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Turn your code into a README, landing page, tweet thread, and Product Hunt pitch — in seconds.
          </p>
        </div>

        <InputSection inputType={inputType} input={input} error={inputError} onChange={handleInputChange} />

        <OutputSelector selected={selectedOutputs} onChange={setSelectedOutputs} />

        {globalError && (
          <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm">
            {globalError}
          </div>
        )}

        <Button size="lg" onClick={handleGenerate} disabled={!canGenerate || isGenerating} className="w-full">
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />Generate</>
          )}
        </Button>

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
