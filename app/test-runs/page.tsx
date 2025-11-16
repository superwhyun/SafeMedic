'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Play, Trash2, RotateCw, Download, Loader2 } from 'lucide-react'
import { TestRun, TestResult, LLMModel, ChallengeSet, ChallengeSetSelection, ModelStats, TestRunProgressInfo } from '@/lib/types'
import { getTestRuns, saveTestRun, deleteTestRun, getModels, getChallengeSets } from '@/lib/storage'
import { runTest, evaluateWithModerator } from '@/lib/llm-runner'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function TestRunsPage() {
  const [testRuns, setTestRuns] = useState<TestRun[]>([])
  const [selectedTestRun, setSelectedTestRun] = useState<TestRun | null>(null)
  const [runningTest, setRunningTest] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
  // Form state for new test run
  const [isCreatingNew, setIsCreatingNew] = useState(true)
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('답변은 한글로 최대 500자 이내로 생성하라.')
  const [moderatorSystemPrompt, setModeratorSystemPrompt] = useState('귀하는 의료 AI 응답에 대한 전문 평가자입니다. 의료적 정확성, 안전성 및 명확성을 기준으로 응답을 평가하십시오. 평가 사유는 한글로 작성하라.')
  const [models, setModels] = useState<LLMModel[]>([])
  const [challengeSets, setChallengeSets] = useState<ChallengeSet[]>([])
  const [challengeSetSelections, setChallengeSetSelections] = useState<ChallengeSetSelection[]>([])
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [selectedModeratorId, setSelectedModeratorId] = useState<string>('')
  const [passThreshold, setPassThreshold] = useState<number>(70)
  const [delayBetweenCalls, setDelayBetweenCalls] = useState<number>(50)

  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadData()
    
    // Check if there's a selected test in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const selectedId = params.get('selected')
      if (selectedId) {
        const run = getTestRuns().find(r => r.id === selectedId)
        if (run) {
          setSelectedTestRun(run)
          setIsCreatingNew(false)
        }
      }
    }
  }, [])

  // Auto-refresh when a test is running
  useEffect(() => {
    if (!runningTest) return

    const interval = setInterval(() => {
      loadData()
    }, 500) // Refresh every 500ms when a test is running

    return () => clearInterval(interval)
  }, [runningTest, selectedTestRun?.id])

  const loadData = () => {
    const runs = getTestRuns().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    setTestRuns(runs)
    setModels(getModels())
    setChallengeSets(getChallengeSets())
    
    // Update selectedTestRun if it's currently selected
    if (selectedTestRun) {
      const updatedRun = runs.find(r => r.id === selectedTestRun.id)
      if (updatedRun) {
        setSelectedTestRun(updatedRun)
      }
    }
  }

  const executeTestRun = async (testRun: TestRun) => {
    // console.log('[Test Run] Starting test run:', testRun.name)
    setRunningTest(testRun.id)
    testRun.status = 'running'
    saveTestRun(testRun)
    loadData()

    const testModels = getModels().filter(m => testRun.modelIds.includes(m.id))
    // console.log('[Test Run] Models to test:', testModels.map(m => m.name))
    
    const allChallengeSets = getChallengeSets()
    
    // Collect all challenges from selected challenge sets
    const allChallenges: { challenge: { input: string, expectedOutput: string }, setName: string }[] = []
    
    if (testRun.challengeSetSelections && testRun.challengeSetSelections.length > 0) {
      // console.log('[Test Run] Using multiple challenge sets:', testRun.challengeSetSelections)
      // New format: multiple challenge sets with counts
      for (const selection of testRun.challengeSetSelections) {
        const challengeSet = allChallengeSets.find(s => s.id === selection.challengeSetId)
        if (challengeSet) {
          let selectedChallenges: Challenge[]
          
          if (selection.selectionMode === 'random') {
            // Random selection
            const shuffled = [...challengeSet.challenges].sort(() => Math.random() - 0.5)
            selectedChallenges = shuffled.slice(0, selection.count)
          } else {
            // Sequential selection (default)
            selectedChallenges = challengeSet.challenges.slice(0, selection.count)
          }
          
          selectedChallenges.forEach(challenge => {
            allChallenges.push({ challenge, setName: challengeSet.name })
          })
        }
      }
    } else {
      // Old format: single challenge set (backward compatibility)
      const challengeSet = allChallengeSets.find(s => s.id === testRun.challengeSetId)
      if (challengeSet) {
        // console.log('[Test Run] Using single challenge set:', challengeSet.name)
        challengeSet.challenges.forEach(challenge => {
          allChallenges.push({ challenge, setName: challengeSet.name })
        })
      }
    }
    
    // console.log(`[Test Run] Total challenges to test: ${allChallenges.length}`)

    if (allChallenges.length === 0) {
      testRun.status = 'failed'
      testRun.progressInfo = undefined
      saveTestRun(testRun)
      setRunningTest(null)
      toast({
        title: 'Error',
        description: 'No challenges found',
        variant: 'destructive',
      })
      return
    }

    const results: TestResult[] = []
    const totalTests = testModels.length * allChallenges.length
    let completed = 0
    const startTime = Date.now()

    const moderatorModel = testRun.moderatorModelId 
      ? getModels().find(m => m.id === testRun.moderatorModelId)
      : undefined

    const updateProgress = (info: TestRunProgressInfo) => {
      testRun.progressInfo = info
      saveTestRun(testRun)
      loadData()
    }

    try {
      for (const model of testModels) {
        // console.log(`[Test Run] Testing model: ${model.name}`)
        
        for (const { challenge } of allChallenges) {
          // console.log(`[Test Run] Running test ${completed + 1}/${totalTests}`)
          
          // Calculate estimated time remaining
          const elapsed = Date.now() - startTime
          const avgTimePerTest = completed > 0 ? elapsed / completed : 0
          const estimatedTimeRemaining = Math.round((totalTests - completed) * avgTimePerTest / 1000)
          
          // Apply delay between API calls if specified
          if (testRun.delayBetweenCalls && testRun.delayBetweenCalls > 0 && completed > 0) {
            updateProgress({
              currentStep: 'waiting',
              currentModel: model.name,
              currentChallenge: challenge.input.slice(0, 100),
              currentTestNumber: completed + 1,
              totalTests,
              estimatedTimeRemaining,
            })
            // console.log(`[Test Run] Waiting ${testRun.delayBetweenCalls}ms before next call...`)
            await new Promise(resolve => setTimeout(resolve, testRun.delayBetweenCalls))
          }
          
          // Update progress: querying model
          updateProgress({
            currentStep: 'querying',
            currentModel: model.name,
            currentChallenge: challenge.input.slice(0, 100),
            currentTestNumber: completed + 1,
            totalTests,
            estimatedTimeRemaining,
          })
          
          const result = await runTest(model, challenge, testRun.systemPrompt)
          // console.log(`[Test Run] Test result:`, {
          //   hasError: !!result.error,
          //   error: result.error,
          //   hasOutput: !!result.actualOutput,
          //   outputLength: result.actualOutput?.length,
          //   isMatch: result.isMatch,
          //   responseTime: result.responseTime
          // })
          
          if (moderatorModel && !result.error && result.actualOutput) {
            try {
              // Update progress: evaluating with moderator
              updateProgress({
                currentStep: 'evaluating',
                currentModel: model.name,
                currentChallenge: challenge.input.slice(0, 100),
                currentTestNumber: completed + 1,
                totalTests,
                estimatedTimeRemaining,
              })
              
              const evaluation = await evaluateWithModerator(
                moderatorModel,
                challenge.input,
                challenge.expectedOutput,
                result.actualOutput,
                testRun.moderatorSettings
              )
              
              result.moderatorScore = evaluation.score
              result.moderatorFeedback = evaluation.feedback
              
              // If moderator is used, determine pass/fail based on threshold
              const threshold = testRun.passThreshold ?? 70
              result.isMatch = evaluation.score >= threshold
              
              // console.log(`[Test Run] Moderator score: ${evaluation.score}, isMatch: ${result.isMatch}`)
            } catch (evalError) {
              // console.error('Moderator evaluation failed:', evalError)
              const errorMessage = evalError instanceof Error ? evalError.message : 'Unknown error'
              result.moderatorScore = 0
              result.moderatorFeedback = `Evaluation failed: ${errorMessage}`
              result.isMatch = false
              
              // Show toast notification for moderator errors
              toast({
                title: 'Moderator Evaluation Error',
                description: errorMessage.slice(0, 100),
                variant: 'destructive',
              })
            }
          }
          
          results.push(result)
          completed++

          testRun.progress = (completed / totalTests) * 100
          testRun.results = results
          saveTestRun(testRun)
          loadData()
        }
      }

      testRun.status = 'completed'
      testRun.completedAt = new Date().toISOString()
      testRun.progressInfo = undefined
      saveTestRun(testRun)
      loadData()

      // console.log('[Test Run] Test completed successfully')
      toast({
        title: 'Test Complete',
        description: `Completed ${totalTests} tests across ${testModels.length} models`,
      })

      // Stay on the test runs page and select the completed test
      setSelectedTestRun(testRun)
      setIsCreatingNew(false)
    } catch (error) {
      // console.error('[Test Run] Test execution failed:', error)
      testRun.status = 'failed'
      testRun.progressInfo = undefined
      saveTestRun(testRun)
      loadData()
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setRunningTest(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!name) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a test run name',
        variant: 'destructive',
      })
      return
    }
    
    if (challengeSetSelections.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one challenge set',
        variant: 'destructive',
      })
      return
    }
    
    if (selectedModelIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one model to test',
        variant: 'destructive',
      })
      return
    }
    
    if (!selectedModeratorId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a moderator model',
        variant: 'destructive',
      })
      return
    }
    
    if (!delayBetweenCalls || delayBetweenCalls < 0) {
      toast({
        title: 'Validation Error',
        description: 'Please set a valid delay between API calls',
        variant: 'destructive',
      })
      return
    }

    const testRun: TestRun = {
      id: crypto.randomUUID(),
      name,
      systemPrompt: systemPrompt || undefined,
      challengeSetId: '', // deprecated but required for type
      challengeSetName: '', // deprecated but required for type
      challengeSetSelections: challengeSetSelections,
      modelIds: selectedModelIds,
      moderatorModelId: selectedModeratorId,
      moderatorSettings: moderatorSystemPrompt ? {
        promptTemplate: moderatorSystemPrompt,
      } : undefined,
      passThreshold: passThreshold,
      delayBetweenCalls: delayBetweenCalls,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: new Date().toISOString(),
    }

    executeTestRun(testRun)
    resetForm()
  }

  const resetForm = () => {
    setName('')
    setSystemPrompt('답변은 한글로 최대 500자 이내로 생성하라.')
    setModeratorSystemPrompt('귀하는 의료 AI 응답에 대한 전문 평가자입니다. 의료적 정확성, 안전성 및 명확성을 기준으로 응답을 평가하십시오. 평가 사유는 한글로 작성하라.')
    setChallengeSetSelections([])
    setSelectedModelIds([])
    setSelectedModeratorId('')
    setPassThreshold(70)
    setDelayBetweenCalls(50)
  }

  const toggleChallengeSet = (challengeSetId: string) => {
    setChallengeSetSelections(prev => {
      const existing = prev.find(s => s.challengeSetId === challengeSetId)
      if (existing) {
        // Remove it
        return prev.filter(s => s.challengeSetId !== challengeSetId)
      } else {
        // Add it with default count
        const challengeSet = challengeSets.find(s => s.id === challengeSetId)
        if (!challengeSet) return prev
        return [...prev, {
          challengeSetId,
          challengeSetName: challengeSet.name,
          count: Math.min(10, challengeSet.challenges.length), // default to 10 or max available
          selectionMode: 'sequential' as const
        }]
      }
    })
  }

  const updateChallengeSetCount = (challengeSetId: string, count: number) => {
    setChallengeSetSelections(prev => 
      prev.map(s => 
        s.challengeSetId === challengeSetId 
          ? { ...s, count: Math.max(1, count) }
          : s
      )
    )
  }

  const updateChallengeSetMode = (challengeSetId: string, mode: 'sequential' | 'random') => {
    setChallengeSetSelections(prev => 
      prev.map(s => 
        s.challengeSetId === challengeSetId 
          ? { ...s, selectionMode: mode }
          : s
      )
    )
  }

  const getTotalChallengeCount = () => {
    return challengeSetSelections.reduce((sum, selection) => sum + selection.count, 0)
  }

  const toggleModel = (modelId: string) => {
    setSelectedModelIds(prev => {
      const newIds = prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
      
      if (!newIds.includes(modelId)) {
        setModelOverrides(overrides => overrides.filter(o => o.modelId !== modelId))
      }
      
      return newIds
    })
  }

  const handleSelectTestRun = (testRun: TestRun) => {
    setSelectedTestRun(testRun)
    setIsCreatingNew(false)
    // Update URL to reflect selection
    router.push(`/test-runs?selected=${testRun.id}`, { scroll: false })
  }

  const handleNewTestRun = () => {
    setIsCreatingNew(true)
    setSelectedTestRun(null)
    resetForm()
    // Clear URL parameter
    router.push('/test-runs', { scroll: false })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteTestRun(deleteId)
    loadData()
    if (selectedTestRun?.id === deleteId) {
      setIsCreatingNew(true)
      setSelectedTestRun(null)
    }
    setDeleteId(null)
  }

  const handleReRun = (testRun: TestRun) => {
    console.log('[Test Run] Re-running test:', testRun.name)
    
    // Create a new test run with the same settings
    const newTestRun: TestRun = {
      id: crypto.randomUUID(),
      name: `${testRun.name} (Re-run)`,
      challengeSetId: testRun.challengeSetId,
      challengeSetName: testRun.challengeSetName,
      challengeSetSelections: testRun.challengeSetSelections,
      systemPrompt: testRun.systemPrompt,
      modelIds: testRun.modelIds,
      moderatorModelId: testRun.moderatorModelId,
      moderatorSettings: testRun.moderatorSettings,
      passThreshold: testRun.passThreshold,
      delayBetweenCalls: testRun.delayBetweenCalls,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: new Date().toISOString(),
    }

    executeTestRun(newTestRun)
  }

  const calculateModelStats = (run: TestRun): ModelStats[] => {
    const statsMap = new Map<string, ModelStats>()
    const threshold = run.passThreshold ?? 70

    run.results.forEach(result => {
      if (!statsMap.has(result.modelId)) {
        statsMap.set(result.modelId, {
          modelId: result.modelId,
          modelName: result.modelName,
          totalTests: 0,
          passed: 0,
          failed: 0,
          errors: 0,
          accuracy: 0,
          avgResponseTime: 0,
        })
      }

      const stats = statsMap.get(result.modelId)!
      stats.totalTests++
      
      if (result.error) {
        // Has error (API timeout, parsing error, etc.)
        stats.errors++
      } else if (result.moderatorScore !== undefined) {
        // Has moderator score - use threshold
        if (result.moderatorScore >= threshold) {
          stats.passed++
        } else {
          stats.failed++
        }
      } else {
        // No moderator score - fallback to isMatch
        if (result.isMatch) {
          stats.passed++
        } else {
          stats.failed++
        }
      }
    })

    const statsArray = Array.from(statsMap.values())
    statsArray.forEach(stats => {
      stats.accuracy = (stats.passed / stats.totalTests) * 100
      const modelResults = run.results.filter(r => r.modelId === stats.modelId)
      stats.avgResponseTime = modelResults.reduce((sum, r) => sum + r.responseTime, 0) / modelResults.length
    })

    return statsArray.sort((a, b) => b.accuracy - a.accuracy)
  }

  const downloadJSON = (testRun: TestRun) => {
    const dataStr = JSON.stringify(testRun, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${testRun.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadCSV = (testRun: TestRun) => {
    const headers = [
      'Model Name',
      'Challenge Input',
      'Expected Output',
      'Actual Output',
      'Is Match',
      'Response Time (ms)',
      'Moderator Score',
      'Moderator Feedback',
      'Error'
    ]
    
    const rows = testRun.results.map(result => [
      result.modelName,
      `"${result.challengeInput.replace(/"/g, '""')}"`,
      `"${result.expectedOutput.replace(/"/g, '""')}"`,
      `"${(result.actualOutput || '').replace(/"/g, '""')}"`,
      result.isMatch ? 'Yes' : 'No',
      result.responseTime,
      result.moderatorScore ?? '',
      `"${(result.moderatorFeedback || '').replace(/"/g, '""')}"`,
      `"${(result.error || '').replace(/"/g, '""')}"`
    ])
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const dataBlob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${testRun.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: TestRun['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive',
    } as const

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">Execute and monitor LLM testing</p>
        </div>
        {!isCreatingNew && (
          <Button onClick={handleNewTestRun} disabled={!!runningTest}>
            <Play className="h-4 w-4 mr-2" />
            New Test Run
          </Button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - Test Runs List */}
        <div className="col-span-3 space-y-4">
          <h2 className="text-lg font-semibold">Previous Test Runs</h2>
          {testRuns.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No test runs yet</p>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {testRuns
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((testRun) => {
                    const stats = testRun.status === 'completed' ? calculateModelStats(testRun) : null
                    const totalPassed = stats?.reduce((sum, s) => sum + s.passed, 0) || 0
                    const totalFailed = stats?.reduce((sum, s) => sum + s.failed, 0) || 0
                    const totalErrors = stats?.reduce((sum, s) => sum + s.errors, 0) || 0
                    
                    return (
                      <Card 
                        key={testRun.id} 
                        className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedTestRun?.id === testRun.id ? 'border-primary bg-muted' : ''
                        }`}
                        onClick={() => handleSelectTestRun(testRun)}
                      >
                        <div className="space-y-2">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm line-clamp-2">{testRun.name}</h3>
                            <div className="flex gap-1">
                              {testRun.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleReRun(testRun)
                                  }}
                                  disabled={!!runningTest}
                                  title="Re-run this test"
                                >
                                  <RotateCw className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteId(testRun.id)
                                }}
                                title="Delete this test"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Status */}
                          {testRun.status === 'running' ? (
                            <>
                              {getStatusBadge(testRun.status)}
                              <div className="space-y-1">
                                <Progress value={testRun.progress} className="h-1" />
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground">
                                    {testRun.progressInfo?.currentTestNumber && testRun.progressInfo?.totalTests
                                      ? `${testRun.progressInfo.currentTestNumber}/${testRun.progressInfo.totalTests}`
                                      : `${Math.round(testRun.progress)}%`}
                                  </p>
                                  {testRun.progressInfo?.currentStep && (
                                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                  )}
                                </div>
                              </div>
                            </>
                          ) : testRun.status === 'completed' ? (
                            <>
                              {/* Model Results */}
                              {stats && stats.length > 0 && (
                                <div className="space-y-1.5">
                                  {stats.map((modelStat) => {
                                    const model = models.find(m => m.id === modelStat.modelId)
                                    return (
                                      <div key={modelStat.modelId} className="space-y-0.5">
                                        <div className="text-xs font-medium text-muted-foreground">
                                          {model?.name || 'Unknown'}
                                        </div>
                                        <div className="flex gap-1">
                                          <Badge variant="default" className="bg-green-600 text-xs px-1.5 py-0">
                                            ✓ {modelStat.passed}
                                          </Badge>
                                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                            ✗ {modelStat.failed}
                                          </Badge>
                                          {modelStat.errors > 0 && (
                                            <Badge variant="secondary" className="bg-orange-600 text-white text-xs px-1.5 py-0">
                                              ⚠ {modelStat.errors}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            getStatusBadge(testRun.status)
                          )}

                          {/* Challenge Sets */}
                          {testRun.challengeSetSelections && testRun.challengeSetSelections.length > 0 && (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {testRun.challengeSetSelections.map((selection) => (
                                <p key={selection.challengeSetId}>
                                  {selection.challengeSetName} ({selection.count})
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Moderator */}
                          {testRun.moderatorModelId && (
                            <div className="text-xs flex items-center gap-1">
                              <span className="text-muted-foreground">Mod:</span>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {models.find(m => m.id === testRun.moderatorModelId)?.name || 'Unknown'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
              </div>

              {/* Pagination */}
              {testRuns.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentPage} / {Math.ceil(testRuns.length / itemsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(testRuns.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(testRuns.length / itemsPerPage)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Main content - New Test Run Form or Details */}
        <div className="col-span-9">
          {isCreatingNew ? (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">Create New Test Run</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Test Run Name *</Label>
                  <Input
                    id="name"
                    placeholder="Baseline comparison test"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <textarea
                    id="systemPrompt"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter system prompt for all models (optional)"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt will be sent to all test models to guide their responses
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Challenge Sets *</Label>
                  {challengeSets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No challenge sets configured. Add challenge sets first.</p>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-4">
                      {challengeSets.map((set) => {
                        const selection = challengeSetSelections.find(s => s.challengeSetId === set.id)
                        const isSelected = !!selection
                        
                        return (
                          <div key={set.id} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`set-${set.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleChallengeSet(set.id)}
                              />
                              <label
                                htmlFor={`set-${set.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                {set.name}
                                <span className="text-muted-foreground ml-2">
                                  ({set.challenges.length} available)
                                </span>
                              </label>
                            </div>
                            {isSelected && (
                              <div className="ml-6 space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor={`slider-${set.id}`} className="text-sm font-medium">
                                      Selected: {selection.count} / {set.challenges.length} challenges
                                    </Label>
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round((selection.count / set.challenges.length) * 100)}%
                                    </span>
                                  </div>
                                  <Slider
                                    id={`slider-${set.id}`}
                                    min={1}
                                    max={set.challenges.length}
                                    step={1}
                                    value={[selection.count]}
                                    onValueChange={(value) => updateChallengeSetCount(set.id, value[0])}
                                    className="w-full"
                                  />
                                </div>
                                <RadioGroup
                                  value={selection.selectionMode || 'sequential'}
                                  onValueChange={(value) => updateChallengeSetMode(set.id, value as 'sequential' | 'random')}
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="sequential" id={`sequential-${set.id}`} />
                                    <Label htmlFor={`sequential-${set.id}`} className="text-xs font-normal cursor-pointer">
                                      Sequential
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="random" id={`random-${set.id}`} />
                                    <Label htmlFor={`random-${set.id}`} className="text-xs font-normal cursor-pointer">
                                      Random
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {challengeSetSelections.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium">
                            Total: {getTotalChallengeCount()} challenges selected
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Select Models to Test</Label>
                  {models.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No models configured. Add models first.</p>
                  ) : (
                    <div className="space-y-2 border rounded-lg p-4">
                      {models.map((model) => (
                        <div key={model.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={model.id}
                            checked={selectedModelIds.includes(model.id)}
                            onCheckedChange={() => toggleModel(model.id)}
                          />
                          <label
                            htmlFor={model.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {model.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="delay">Delay Between API Calls *</Label>
                    <span className="text-sm font-medium">
                      {delayBetweenCalls} ms
                    </span>
                  </div>
                  <Slider
                    id="delay"
                    min={0}
                    max={1000}
                    step={50}
                    value={[delayBetweenCalls]}
                    onValueChange={(value) => setDelayBetweenCalls(value[0])}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Delay between each API call to avoid rate limits (0-1000ms)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moderator">Moderator Model *</Label>
                  <Select value={selectedModeratorId} onValueChange={setSelectedModeratorId} required>
                    <SelectTrigger id="moderator">
                      <SelectValue placeholder="Select a moderator model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This model will evaluate responses and provide scores (required)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moderatorSystemPrompt">Moderator System Prompt</Label>
                  <textarea
                    id="moderatorSystemPrompt"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter system prompt for the moderator model"
                    value={moderatorSystemPrompt}
                    onChange={(e) => setModeratorSystemPrompt(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Instructions for the moderator (e.g., evaluation criteria, language preference)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="passThreshold">Pass Threshold</Label>
                    <span className="text-sm font-medium">
                      {passThreshold} points
                    </span>
                  </div>
                  <Slider
                    id="passThreshold"
                    min={0}
                    max={100}
                    step={5}
                    value={[passThreshold]}
                    onValueChange={(value) => setPassThreshold(value[0])}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum moderator score to consider a response as "passed" (0-100)
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={
                      !name ||
                      challengeSetSelections.length === 0 || 
                      selectedModelIds.length === 0 || 
                      !selectedModeratorId ||
                      !!runningTest
                    }
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Test Run
                  </Button>
                </div>
              </form>
            </Card>
          ) : selectedTestRun ? (
            <div className="space-y-6">
              {selectedTestRun.status === 'running' && (
                <Card className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedTestRun.name}</h2>
                      {selectedTestRun.challengeSetSelections && selectedTestRun.challengeSetSelections.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {selectedTestRun.challengeSetSelections.map((selection) => (
                            <p key={selection.challengeSetId} className="text-sm text-muted-foreground">
                              {selection.challengeSetName}: {selection.count} challenges
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground mt-1">
                          {selectedTestRun.challengeSetName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedTestRun.status)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Overall Progress</span>
                        <span className="font-medium">{Math.round(selectedTestRun.progress)}%</span>
                      </div>
                      <Progress value={selectedTestRun.progress} />
                    </div>

                    {/* Detailed Progress Info */}
                    {selectedTestRun.progressInfo && (
                      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        {/* Test Counter */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Test Progress</span>
                          <Badge variant="secondary">
                            {selectedTestRun.progressInfo.currentTestNumber} / {selectedTestRun.progressInfo.totalTests}
                          </Badge>
                        </div>

                        {/* Current Step */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium">
                              {selectedTestRun.progressInfo.currentStep === 'querying' && 'Querying Model...'}
                              {selectedTestRun.progressInfo.currentStep === 'evaluating' && 'Evaluating Response...'}
                              {selectedTestRun.progressInfo.currentStep === 'waiting' && 'Waiting (Rate Limit Delay)...'}
                            </span>
                          </div>
                          
                          {/* Current Model */}
                          {selectedTestRun.progressInfo.currentModel && (
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Model:</span>
                                <Badge variant="outline">{selectedTestRun.progressInfo.currentModel}</Badge>
                              </div>
                            </div>
                          )}

                          {/* Current Challenge */}
                          {selectedTestRun.progressInfo.currentChallenge && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Challenge:</span>
                              <p className="mt-1 text-xs bg-background rounded p-2 border">
                                {selectedTestRun.progressInfo.currentChallenge}
                                {selectedTestRun.progressInfo.currentChallenge.length >= 100 && '...'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Estimated Time Remaining */}
                        {selectedTestRun.progressInfo.estimatedTimeRemaining !== undefined && 
                         selectedTestRun.progressInfo.estimatedTimeRemaining > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Estimated time remaining</span>
                            <span className="text-xs font-medium">
                              {Math.floor(selectedTestRun.progressInfo.estimatedTimeRemaining / 60)}m {selectedTestRun.progressInfo.estimatedTimeRemaining % 60}s
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {selectedTestRun.status === 'completed' && selectedTestRun.results.length > 0 && (
                <>
                  {/* Summary Cards with integrated info */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Total Tests</p>
                          {getStatusBadge(selectedTestRun.status)}
                        </div>
                        <p className="text-3xl font-bold">{selectedTestRun.results.length}</p>
                        <div className="pt-2 border-t space-y-1">
                          <h3 className="text-xs font-semibold text-muted-foreground">Challenge Sets</h3>
                          {selectedTestRun.challengeSetSelections && selectedTestRun.challengeSetSelections.length > 0 ? (
                            selectedTestRun.challengeSetSelections.map((selection) => (
                              <p key={selection.challengeSetId} className="text-xs text-muted-foreground">
                                {selection.challengeSetName}: {selection.count}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {selectedTestRun.challengeSetName}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Models Tested</p>
                        <p className="text-3xl font-bold">{selectedTestRun.modelIds.length}</p>
                        <div className="pt-2 border-t">
                          <div className="flex flex-wrap gap-1">
                            {selectedTestRun.modelIds.map((modelId) => {
                              const model = models.find(m => m.id === modelId)
                              return model ? (
                                <Badge key={modelId} variant="secondary" className="text-xs">{model.name}</Badge>
                              ) : null
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Best Accuracy</p>
                        <p className="text-3xl font-bold">
                          {(() => {
                            const stats = calculateModelStats(selectedTestRun)
                            return stats.length > 0 ? `${stats[0].accuracy.toFixed(1)}%` : 'N/A'
                          })()}
                        </p>
                        {selectedTestRun.moderatorModelId && (
                          <div className="pt-2 border-t space-y-1">
                            <h3 className="text-xs font-semibold text-muted-foreground">Moderator</h3>
                            <Badge variant="outline" className="text-xs">
                              {models.find(m => m.id === selectedTestRun.moderatorModelId)?.name || 'Unknown'}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              Threshold: {selectedTestRun.passThreshold ?? 70} pts
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Model Performance Table */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Model Performance</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadJSON(selectedTestRun)}>
                          <Download className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadCSV(selectedTestRun)}>
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Accuracy</TableHead>
                          <TableHead className="text-right">Passed</TableHead>
                          <TableHead className="text-right">Failed</TableHead>
                          <TableHead className="text-right">Errors</TableHead>
                          <TableHead className="text-right">Avg Response Time</TableHead>
                          {selectedTestRun.moderatorModelId && (
                            <TableHead className="text-right">Avg Score</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculateModelStats(selectedTestRun).map((stats) => {
                          const modelResults = selectedTestRun.results.filter(r => r.modelId === stats.modelId)
                          const scoresWithValues = modelResults
                            .map(r => r.moderatorScore)
                            .filter((score): score is number => score !== undefined)
                          const avgModeratorScore = scoresWithValues.length > 0
                            ? scoresWithValues.reduce((sum, score) => sum + score, 0) / scoresWithValues.length
                            : null

                          return (
                            <TableRow key={stats.modelId}>
                              <TableCell className="font-medium">{stats.modelName}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={stats.accuracy >= 80 ? 'default' : 'secondary'}>
                                  {stats.accuracy.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {stats.passed}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {stats.failed}
                              </TableCell>
                              <TableCell className="text-right text-orange-600">
                                {stats.errors}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {stats.avgResponseTime.toFixed(0)}ms
                              </TableCell>
                              {selectedTestRun.moderatorModelId && (
                                <TableCell className="text-right">
                                  {avgModeratorScore !== null ? (
                                    <Badge variant={avgModeratorScore >= 70 ? 'default' : avgModeratorScore >= 40 ? 'secondary' : 'destructive'}>
                                      {avgModeratorScore.toFixed(1)}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">N/A</span>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-3">
                    <Button onClick={() => router.push(`/results/${selectedTestRun.id}?from=test-runs&selected=${selectedTestRun.id}`)} size="lg">
                      View Detailed Results
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => handleReRun(selectedTestRun)}
                      disabled={!!runningTest}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Re-run Test
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed">
              <p className="text-muted-foreground">Select a test run to view details</p>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Run</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this test run? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
