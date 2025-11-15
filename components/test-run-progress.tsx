'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TestRun } from '@/lib/types'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface TestRunProgressProps {
  testRun: TestRun
}

export function TestRunProgress({ testRun }: TestRunProgressProps) {
  const statusIcon = {
    pending: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
    running: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
    completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    failed: <XCircle className="h-5 w-5 text-destructive" />,
  }

  const statusColor = {
    pending: 'secondary',
    running: 'default',
    completed: 'default',
    failed: 'destructive',
  } as const

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold">{testRun.name}</h3>
          <p className="text-sm text-muted-foreground">{testRun.challengeSetName}</p>
        </div>
        <Badge variant={statusColor[testRun.status]} className="capitalize">
          {testRun.status}
        </Badge>
      </div>

      {(testRun.status === 'running' || testRun.status === 'completed') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(testRun.progress)}%</span>
          </div>
          <Progress value={testRun.progress} />
        </div>
      )}

      <div className="flex items-center gap-2">
        {statusIcon[testRun.status]}
        <span className="text-sm text-muted-foreground">
          {testRun.status === 'completed' && `Completed ${testRun.results.length} tests`}
          {testRun.status === 'running' && 'Testing in progress...'}
          {testRun.status === 'pending' && 'Waiting to start...'}
          {testRun.status === 'failed' && 'Test run failed'}
        </span>
      </div>
    </Card>
  )
}
