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
