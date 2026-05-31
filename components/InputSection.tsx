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
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
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
