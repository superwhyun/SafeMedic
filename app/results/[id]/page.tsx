'use client'

import { useState, useEffect, use } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TestRun, ModelStats } from '@/lib/types'
import { getTestRuns } from '@/lib/storage'
import { ArrowLeft, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [testRun, setTestRun] = useState<TestRun | null>(null)
  const [modelStats, setModelStats] = useState<ModelStats[]>([])
  const [openModels, setOpenModels] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const run = getTestRuns().find(r => r.id === resolvedParams.id)
    if (run) {
      setTestRun(run)
      const stats = calculateModelStats(run)
      setModelStats(stats)
      // Open the first model by default
      if (stats.length > 0) {
        setOpenModels(new Set([stats[0].modelId]))
      }
    }
  }, [resolvedParams.id])

  const toggleModel = (modelId: string) => {
    setOpenModels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(modelId)) {
        newSet.delete(modelId)
      } else {
        newSet.add(modelId)
      }
      return newSet
    })
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

  if (!testRun) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Test run not found</p>
      </div>
    )
  }

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const selectedId = params.get('selected')
      if (selectedId) {
        router.push(`/test-runs?selected=${selectedId}`)
        return
      }
    }
    router.push('/test-runs')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{testRun.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed test results by model
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="space-y-4">
        {modelStats.map((stats) => {
          const modelResults = testRun.results.filter(r => r.modelId === stats.modelId)
          const isOpen = openModels.has(stats.modelId)
          
          return (
            <Card key={stats.modelId}>
              <Collapsible open={isOpen} onOpenChange={() => toggleModel(stats.modelId)}>
                <div className="p-6">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-6 -my-6 px-6 py-6 rounded-t-lg">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        <h3 className="font-semibold text-lg">{stats.modelName}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={stats.accuracy >= 80 ? 'default' : 'secondary'}>
                          {stats.accuracy.toFixed(1)}% accuracy
                        </Badge>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600 font-medium">
                            {stats.passed} passed
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-red-600 font-medium">
                            {stats.failed} failed
                          </span>
                          {stats.errors > 0 && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-orange-600 font-medium">
                                {stats.errors} errors
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-6 max-h-[600px] overflow-auto pt-6 px-2">
                      {modelResults.map((result, index) => (
                    <Card key={index} className={`relative overflow-hidden ${
                      result.isMatch 
                        ? 'border-l-4 border-l-green-500 shadow-sm' 
                        : 'border-l-4 border-l-red-500 shadow-sm'
                    }`}>
                      <div className="p-6 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-4">
                              <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 px-4 py-2 rounded-lg shadow-sm -rotate-6">
                                <span className="font-mono text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                                  Test #{index + 1}
                                </span>
                              </div>
                              {result.isMatch ? (
                                <div className="flex items-center gap-1.5 text-green-600">
                                  <CheckCircle2 className="h-5 w-5" />
                                  <span className="text-base font-semibold">PASSED</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-red-600">
                                  <XCircle className="h-5 w-5" />
                                  <span className="text-base font-semibold">FAILED</span>
                                </div>
                              )}
                            </div>
                            <h4 className="text-base font-semibold leading-relaxed">
                              {result.challengeInput}
                            </h4>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">{result.responseTime}ms</span>
                            </div>
                            {result.moderatorScore !== undefined && (
                              <Badge 
                                variant={result.moderatorScore >= 70 ? 'default' : result.moderatorScore >= 40 ? 'secondary' : 'destructive'}
                                className="text-sm px-3 py-1"
                              >
                                {result.moderatorScore}/100
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Expected vs Actual */}
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-blue-500" />
                              <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Expected Answer
                              </h5>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.expectedOutput}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={`h-1 w-1 rounded-full ${result.isMatch ? 'bg-green-500' : 'bg-red-500'}`} />
                              <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Model Response
                              </h5>
                            </div>
                            <div className={`p-4 border rounded-lg ${
                              result.error 
                                ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
                                : result.isMatch 
                                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
                                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                            }`}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {result.actualOutput || result.error || 'No response'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Moderator Evaluation */}
                        {result.moderatorScore !== undefined && result.moderatorFeedback && (
                          <div className="space-y-2 pt-4 border-t">
                            <div className="flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-purple-500" />
                              <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Moderator Evaluation
                              </h5>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {result.moderatorFeedback}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
