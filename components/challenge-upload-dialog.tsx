'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChallengeSet } from '@/lib/types'
import { parseCSV, generateSampleCSV } from '@/lib/csv-parser'
import { Upload, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ChallengeUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  challengeSet?: ChallengeSet
  onSave: (challengeSet: ChallengeSet) => void
}

export function ChallengeUploadDialog({ open, onOpenChange, challengeSet, onSave }: ChallengeUploadDialogProps) {
  const [name, setName] = useState(challengeSet?.name || '')
  const [description, setDescription] = useState(challengeSet?.description || '')
  const [csvText, setCsvText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  const handleDownloadSample = () => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-challenges.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !csvText) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a name and upload a CSV file.',
        variant: 'destructive',
      })
      return
    }

    try {
      const challenges = parseCSV(csvText)
      if (challenges.length === 0) {
        throw new Error('No valid challenges found in CSV')
      }

      const set: ChallengeSet = {
        id: challengeSet?.id || crypto.randomUUID(),
        name,
        description,
        challenges,
        createdAt: challengeSet?.createdAt || new Date().toISOString(),
      }

      onSave(set)
      onOpenChange(false)
      setName('')
      setDescription('')
      setCsvText('')

      toast({
        title: 'Success',
        description: `Challenge set saved with ${challenges.length} challenges.`,
      })
    } catch (error) {
      toast({
        title: 'Parse Error',
        description: error instanceof Error ? error.message : 'Failed to parse CSV file',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{challengeSet ? 'Edit Challenge Set' : 'Upload Challenge Set'}</DialogTitle>
          <DialogDescription>
            Upload a CSV file with input and expected output columns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 px-1">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Customer Support Q&A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="A set of customer support questions and expected responses"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="csv">CSV File</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleDownloadSample}>
                <Download className="h-3 w-3 mr-1" />
                Sample CSV
              </Button>
            </div>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center space-y-2 transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <Label htmlFor="csv" className="cursor-pointer text-primary hover:underline">
                  Click to upload
                </Label>
                <span className="text-sm text-muted-foreground"> or drag and drop</span>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground">CSV with input and expectedOutput columns</p>
            </div>
          </div>

          {csvText && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-3 bg-muted/50 h-32 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">{csvText.split('\n').slice(0, 5).join('\n')}</pre>
                {csvText.split('\n').length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ... and {csvText.split('\n').length - 5} more lines
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t mt-4 sticky bottom-0 bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Challenge Set</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
