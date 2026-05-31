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
