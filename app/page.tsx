'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, FileText, Play, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { getModels, getChallengeSets, getTestRuns } from '@/lib/storage'

export default function HomePage() {
  const [stats, setStats] = useState({
    models: 0,
    challengeSets: 0,
    testRuns: 0,
  })

  useEffect(() => {
    setStats({
      models: getModels().length,
      challengeSets: getChallengeSets().length,
      testRuns: getTestRuns().length,
    })
  }, [])

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-bold tracking-tight">LLM Testing Platform</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Compare and evaluate large language models with systematic testing. Upload challenge sets, configure models, and analyze performance metrics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold">{stats.models}</span>
          </div>
          <div>
            <h3 className="font-semibold">Models</h3>
            <p className="text-sm text-muted-foreground">Configured LLM models</p>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold">{stats.challengeSets}</span>
          </div>
          <div>
            <h3 className="font-semibold">Challenge Sets</h3>
            <p className="text-sm text-muted-foreground">Test datasets uploaded</p>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <BarChart3 className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold">{stats.testRuns}</span>
          </div>
          <div>
            <h3 className="font-semibold">Test Runs</h3>
            <p className="text-sm text-muted-foreground">Completed evaluations</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-8 space-y-4 border-2 hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Quick Start</h2>
            <p className="text-muted-foreground">
              Get started by configuring your first LLM model and uploading a challenge set.
            </p>
          </div>
          <div className="space-y-2">
            <Link href="/models">
              <Button variant="outline" className="w-full justify-between">
                Configure Models
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/challenges">
              <Button variant="outline" className="w-full justify-between">
                Upload Challenges
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-8 space-y-4 border-2 hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Run Tests</h2>
            <p className="text-muted-foreground">
              Execute test runs to compare model performance across your challenge sets.
            </p>
          </div>
          <Link href="/test-runs">
            <Button className="w-full justify-between" size="lg">
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start Testing
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="p-8 bg-muted/50">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold">
                1
              </div>
              <h3 className="font-semibold">Configure Models</h3>
              <p className="text-sm text-muted-foreground">
                Add your LLM models with API keys and configuration
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold">
                2
              </div>
              <h3 className="font-semibold">Upload Challenges</h3>
              <p className="text-sm text-muted-foreground">
                Import CSV files with test inputs and expected outputs
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold">
                3
              </div>
              <h3 className="font-semibold">Run Tests</h3>
              <p className="text-sm text-muted-foreground">
                Execute tests across selected models and challenge sets
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary font-bold">
                4
              </div>
              <h3 className="font-semibold">Analyze Results</h3>
              <p className="text-sm text-muted-foreground">
                Review accuracy metrics and detailed test outcomes
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
