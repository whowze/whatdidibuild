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

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Save your outputs:</p>

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
          {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
          {sendStatus === 'sent' && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">&#10003; Sent! Check your inbox.</p>
          )}
          {sendStatus === 'error' && (
            <p className="text-sm text-red-500 mt-1">Couldn&apos;t send the email. Try downloading instead.</p>
          )}
        </div>
        <Button onClick={handleSend} disabled={sendStatus === 'sending' || sendStatus === 'sent'} className="shrink-0">
          {sendStatus === 'sending' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {sendStatus === 'sent' && <Check className="h-4 w-4 mr-2" />}
          {(sendStatus === 'idle' || sendStatus === 'error') && <Mail className="h-4 w-4 mr-2" />}
          Send All
        </Button>
      </div>

      <Button variant="outline" className="w-full" onClick={() => downloadOutputsAsZip(outputs)}>
        <Download className="h-4 w-4 mr-2" />
        Download All as .zip
      </Button>
    </div>
  )
}
