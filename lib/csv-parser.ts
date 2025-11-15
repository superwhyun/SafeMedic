import { Challenge } from './types'

export function parseCSV(csvText: string): Challenge[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const header = lines[0].toLowerCase()
  if (!header.includes('input') || !header.includes('expected')) {
    throw new Error('CSV must have "input" and "expected" columns')
  }

  const challenges: Challenge[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parsing (handles quotes)
    const values = parseCSVLine(line)
    if (values.length >= 2) {
      challenges.push({
        input: values[0],
        expectedOutput: values[1],
      })
    }
  }

  return challenges
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

export function generateSampleCSV(): string {
  return `input,expected
"What is 2+2?","4"
"What is the capital of France?","Paris"
"Translate 'hello' to Spanish","hola"`
}
