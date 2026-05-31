// Client-side only — do not import in API routes (uses browser APIs)
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
