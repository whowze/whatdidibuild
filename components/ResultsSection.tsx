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
          <TabsTrigger key={key} value={key}>{OUTPUT_LABELS[key]}</TabsTrigger>
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
