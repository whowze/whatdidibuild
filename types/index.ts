// types/index.ts

export type OutputType = 'readme' | 'landing' | 'tweet' | 'producthunt'
export type InputType = 'url' | 'paste'

export interface GenerateRequest {
  inputType: InputType
  input: string
  selectedOutputs: OutputType[]
}

export interface GenerateResponse {
  outputs: Partial<Record<OutputType, string>>
  error?: string
}

export interface EmailRequest {
  email: string
  outputs: Partial<Record<OutputType, string>>
}

export interface EmailResponse {
  success?: boolean
  error?: string
}
