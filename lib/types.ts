export interface LLMModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'grok' | 'custom'
  apiKey: string
  endpoint?: string
  modelId: string
  createdAt: string
}

export interface ModeratorSettings {
  promptTemplate?: string
}

export interface ChallengeSetSelection {
  challengeSetId: string
  challengeSetName: string
  count: number // number of challenges to use from this set
  selectionMode?: 'sequential' | 'random' // how to select challenges (default: sequential)
}

export interface ChallengeSet {
  id: string
  name: string
  description?: string
  challenges: Challenge[]
  createdAt: string
}

export interface Challenge {
  input: string
  expectedOutput: string
}

export interface TestRun {
  id: string
  name: string
  challengeSetId: string // deprecated - for backward compatibility
  challengeSetName: string // deprecated - for backward compatibility
  challengeSetSelections?: ChallengeSetSelection[] // new: multiple challenge sets with counts
  modelIds: string[]
  systemPrompt?: string // system prompt for all models
  moderatorModelId?: string
  moderatorSettings?: ModeratorSettings
  passThreshold?: number // minimum score to pass (0-100, default: 70)
  delayBetweenCalls?: number // milliseconds to wait between API calls (default: 0)
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  results: TestResult[]
  createdAt: string
  completedAt?: string
}

export interface TestResult {
  modelId: string
  modelName: string
  challengeInput: string
  expectedOutput: string
  actualOutput: string
  isMatch: boolean
  responseTime: number
  moderatorScore?: number
  moderatorFeedback?: string
  error?: string
}

export interface ModelStats {
  modelId: string
  modelName: string
  totalTests: number
  passed: number
  failed: number
  errors: number
  accuracy: number
  avgResponseTime: number
}
