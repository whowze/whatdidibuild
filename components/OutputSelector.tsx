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
            <Label htmlFor={value} className="cursor-pointer">{label}</Label>
          </div>
        ))}
      </div>
    </div>
  )
}
