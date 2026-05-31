// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

// Wrap the nextJest config to override transformIgnorePatterns so that
// @octokit (pure-ESM packages) get transpiled by Jest's Babel transform.
const createConfig = createJestConfig(config)

export default async (): Promise<Config> => {
  const nextConfig = await createConfig()
  return {
    ...nextConfig,
    // Extend this list if other pure-ESM packages are added
    transformIgnorePatterns: [
      '/node_modules/(?!@octokit)/',
    ],
  }
}
