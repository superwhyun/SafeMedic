'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, FileText, Play, BarChart3, Settings, Download, Upload } from 'lucide-react'
import Link from 'next/link'
import { getModels, getChallengeSets, getTestRuns, exportAllData, importAllData } from '@/lib/storage'
import { useToast } from '@/hooks/use-toast'

export default function HomePage() {
  const [stats, setStats] = useState({
    models: 0,
    challengeSets: 0,
    testRuns: 0,
  })
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const loadStats = () => {
    setStats({
      models: getModels().length,
      challengeSets: getChallengeSets().length,
      testRuns: getTestRuns().length,
    })
  }

  useEffect(() => {
    loadStats()
  }, [])

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsMenu) {
        const target = event.target as HTMLElement
        if (!target.closest('.settings-menu-container')) {
          setShowSettingsMenu(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettingsMenu])

  const handleExport = () => {
    try {
      const data = exportAllData()
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `safemedic_backup_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      setShowSettingsMenu(false)
      toast({
        title: 'Export Successful',
        description: 'All data has been exported to JSON file',
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        importAllData(data)
        loadStats()
        setShowSettingsMenu(false)
        toast({
          title: 'Import Successful',
          description: `Imported ${data.models?.length || 0} models, ${data.challengeSets?.length || 0} challenge sets, and ${data.testRuns?.length || 0} test runs`,
        })
        // Reload the page to reflect changes
        window.location.reload()
      } catch (error) {
        toast({
          title: 'Import Failed',
          description: error instanceof Error ? error.message : 'Invalid file format',
          variant: 'destructive',
        })
      }
    }
    reader.readAsText(file)
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4 py-12 relative">
        <h1 className="text-5xl font-bold tracking-tight">LLM Testing Platform</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Compare and evaluate large language models with systematic testing. Upload challenge sets, configure models, and analyze performance metrics.
        </p>
        
        {/* Settings Button - Top Right */}
        <div className="absolute top-0 right-0 settings-menu-container">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="rounded-full hover:bg-muted"
            >
              <Settings className="h-5 w-5 transition-transform duration-300 hover:rotate-90" />
            </Button>
            
            {/* Settings Menu */}
            {showSettingsMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-background border rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-muted"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-muted"
                    onClick={handleImport}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
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
