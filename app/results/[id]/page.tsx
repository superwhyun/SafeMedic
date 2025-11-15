'use client'

import { useState, useEffect, use } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TestRun, TestResult, ModelStats } from '@/lib/types'
import { getTestRuns } from '@/lib/storage'
import { ArrowLeft, CheckCircle2, XCircle, Clock, Download, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  const downloadJSON = () => {
    if (!testRun) return
    
    const dataStr = JSON.stringify(testRun, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${testRun.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadCSV = () => {
    if (!testRun) return
    
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

  if (!testRun) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Test run not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/test-runs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{testRun.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">{testRun.challengeSetName}</p>
            {testRun.moderatorModelId && (
              <>
                <span className="text-muted-foreground">·</span>
                <p className="text-sm text-muted-foreground">
                  Pass threshold: {testRun.passThreshold ?? 70} points
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Tests</p>
            <p className="text-3xl font-bold">{testRun.results.length}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Models Tested</p>
            <p className="text-3xl font-bold">{modelStats.length}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Best Accuracy</p>
            <p className="text-3xl font-bold">
              {modelStats.length > 0 ? `${modelStats[0].accuracy.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="font-semibold mb-4">Model Performance</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                    <TableHead className="text-right">Passed</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead className="text-right">Avg Response Time</TableHead>
                    {testRun.moderatorModelId && (
                      <TableHead className="text-right">Moderator Score</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelStats.map((stats) => {
                    const modelResults = testRun.results.filter(r => r.modelId === stats.modelId)
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
                        {testRun.moderatorModelId && (
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
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
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
                      <div className="space-y-4 max-h-[600px] overflow-auto pt-6">
                        {modelResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {result.isMatch ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <p className="text-sm font-medium">{result.challengeInput}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {result.responseTime}ms
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Expected:</span>
                            <p className="mt-1 p-2 bg-muted/50 rounded">{result.expectedOutput}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Actual:</span>
                            <p className={`mt-1 p-2 rounded ${result.isMatch ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              {result.actualOutput || result.error || 'No response'}
                            </p>
                          </div>
                          {result.moderatorScore !== undefined && (
                            <div className="border-t pt-2 mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-muted-foreground font-medium">Moderator Evaluation:</span>
                                <Badge variant={result.moderatorScore >= 70 ? 'default' : result.moderatorScore >= 40 ? 'secondary' : 'destructive'}>
                                  Score: {result.moderatorScore}/100
                                </Badge>
                              </div>
                              {result.moderatorFeedback && (
                                <p className="mt-1 p-2 bg-blue-500/10 rounded text-xs">
                                  {result.moderatorFeedback}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
