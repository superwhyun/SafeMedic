import { LLMModel, ChallengeSet, TestRun, Challenge } from './types'

const STORAGE_KEYS = {
  MODELS: 'llm-test-models',
  CHALLENGE_SETS: 'llm-test-challenge-sets',
  TEST_RUNS: 'llm-test-test-runs',
  INITIALIZED: 'llm-test-initialized',
}

// Models
export function getModels(): LLMModel[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.MODELS)
  return data ? JSON.parse(data) : []
}

export function saveModel(model: LLMModel): void {
  const models = getModels()
  const index = models.findIndex(m => m.id === model.id)
  if (index >= 0) {
    models[index] = model
  } else {
    models.push(model)
  }
  localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models))
}

export function deleteModel(id: string): void {
  const models = getModels().filter(m => m.id !== id)
  localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models))
}

// Challenge Sets
export function getChallengeSets(): ChallengeSet[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.CHALLENGE_SETS)
  return data ? JSON.parse(data) : []
}

export function saveChallengeSet(challengeSet: ChallengeSet): void {
  const sets = getChallengeSets()
  const index = sets.findIndex(s => s.id === challengeSet.id)
  if (index >= 0) {
    sets[index] = challengeSet
  } else {
    sets.push(challengeSet)
  }
  localStorage.setItem(STORAGE_KEYS.CHALLENGE_SETS, JSON.stringify(sets))
}

export function deleteChallengeSet(id: string): void {
  const sets = getChallengeSets().filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEYS.CHALLENGE_SETS, JSON.stringify(sets))
}

// Test Runs
export function getTestRuns(): TestRun[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.TEST_RUNS)
  return data ? JSON.parse(data) : []
}

export function saveTestRun(testRun: TestRun): void {
  const runs = getTestRuns()
  const index = runs.findIndex(r => r.id === testRun.id)
  if (index >= 0) {
    runs[index] = testRun
  } else {
    runs.push(testRun)
  }
  localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(runs))
}

export function deleteTestRun(id: string): void {
  const runs = getTestRuns().filter(r => r.id !== id)
  localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(runs))
}

// Export/Import all data
export interface ExportData {
  version: string
  exportedAt: string
  models: LLMModel[]
  challengeSets: ChallengeSet[]
  testRuns: TestRun[]
}

export function exportAllData(): ExportData {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    models: getModels(),
    challengeSets: getChallengeSets(),
    testRuns: getTestRuns(),
  }
}

export function importAllData(data: ExportData): void {
  if (!data.version || !data.models || !data.challengeSets || !data.testRuns) {
    throw new Error('Invalid data format')
  }
  
  // Clear existing data
  localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(data.models))
  localStorage.setItem(STORAGE_KEYS.CHALLENGE_SETS, JSON.stringify(data.challengeSets))
  localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(data.testRuns))
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true')
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.MODELS)
  localStorage.removeItem(STORAGE_KEYS.CHALLENGE_SETS)
  localStorage.removeItem(STORAGE_KEYS.TEST_RUNS)
  localStorage.removeItem(STORAGE_KEYS.INITIALIZED)
}

// Initialize with default challenge set
export async function initializeDefaultData(): Promise<void> {
  if (typeof window === 'undefined') return
  
  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED)
  if (initialized === 'true') return

  try {
    const response = await fetch('/data/challenge.csv')
    const csvText = await response.text()
    
    const challenges: Challenge[] = []
    const lines = csvText.split('\n').slice(1) // Skip header
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      // Simple CSV parsing (handles quoted fields)
      const match = line.match(/^"([^"]*)","([^"]*)"$/)
      if (match) {
        challenges.push({
          input: match[1],
          expectedOutput: match[2],
        })
      }
    }

    if (challenges.length > 0) {
      const defaultSet: ChallengeSet = {
        id: crypto.randomUUID(),
        name: 'Medical Emergency Scenarios',
        description: 'Default challenge set with 10 medical emergency scenarios',
        challenges,
        createdAt: new Date().toISOString(),
      }
      
      saveChallengeSet(defaultSet)
    }

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true')
  } catch (error) {
    console.error('Failed to load default challenge set:', error)
  }
}
