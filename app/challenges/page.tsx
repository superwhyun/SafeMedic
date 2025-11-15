'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Trash2, Edit, Save, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { ChallengeUploadDialog } from '@/components/challenge-upload-dialog'
import { ChallengeSet, Challenge } from '@/lib/types'
import { getChallengeSets, saveChallengeSet, deleteChallengeSet, initializeDefaultData } from '@/lib/storage'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

const ITEMS_PER_PAGE = 10

export default function ChallengesPage() {
  const [challengeSets, setChallengeSets] = useState<ChallengeSet[]>([])
  const [selectedSet, setSelectedSet] = useState<ChallengeSet | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedChallenges, setEditedChallenges] = useState<Challenge[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const init = async () => {
      await initializeDefaultData()
      const sets = getChallengeSets()
      setChallengeSets(sets)
      if (sets.length > 0 && !selectedSet) {
        setSelectedSet(sets[0])
      }
    }
    init()
  }, [])

  const handleSave = (challengeSet: ChallengeSet) => {
    saveChallengeSet(challengeSet)
    const sets = getChallengeSets()
    setChallengeSets(sets)
    if (selectedSet?.id === challengeSet.id) {
      setSelectedSet(challengeSet)
    }
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteChallengeSet(deleteId)
    const sets = getChallengeSets()
    setChallengeSets(sets)
    if (selectedSet?.id === deleteId) {
      setSelectedSet(sets.length > 0 ? sets[0] : null)
    }
    setDeleteId(null)
  }

  const handleSelectSet = (set: ChallengeSet) => {
    setSelectedSet(set)
    setIsEditing(false)
    setCurrentPage(1)
  }

  const handleStartEdit = () => {
    if (selectedSet) {
      setEditedChallenges([...selectedSet.challenges])
      setIsEditing(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedChallenges([])
  }

  const handleSaveEdit = () => {
    if (selectedSet) {
      const updatedSet = {
        ...selectedSet,
        challenges: editedChallenges,
      }
      saveChallengeSet(updatedSet)
      const sets = getChallengeSets()
      setChallengeSets(sets)
      setSelectedSet(updatedSet)
      setIsEditing(false)
    }
  }

  const handleChallengeChange = (index: number, field: 'input' | 'expectedOutput', value: string) => {
    const newChallenges = [...editedChallenges]
    newChallenges[index] = { ...newChallenges[index], [field]: value }
    setEditedChallenges(newChallenges)
  }

  const totalPages = selectedSet ? Math.ceil(selectedSet.challenges.length / ITEMS_PER_PAGE) : 0
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentChallenges = isEditing 
    ? editedChallenges.slice(startIndex, endIndex)
    : selectedSet?.challenges.slice(startIndex, endIndex) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Challenge Sets</h1>
          <p className="text-muted-foreground">Upload CSV files with test inputs and expected outputs</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - Challenge Sets List */}
        <div className="col-span-3 space-y-2">
          <h2 className="text-lg font-semibold mb-4">Challenge Sets</h2>
          {challengeSets.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No challenge sets yet</p>
            </Card>
          ) : (
            challengeSets.map((set) => (
              <Card 
                key={set.id} 
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedSet?.id === set.id ? 'border-primary bg-muted' : ''
                }`}
                onClick={() => handleSelectSet(set)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-2">{set.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteId(set.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {set.challenges.length} challenges
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Main content - Challenge Details */}
        <div className="col-span-9">
          {selectedSet ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedSet.name}</h2>
                  {selectedSet.description && (
                    <p className="text-muted-foreground mt-1">{selectedSet.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleStartEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-1/2">Input</TableHead>
                      <TableHead className="w-1/2">Expected Output</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentChallenges.map((challenge, index) => {
                      const actualIndex = startIndex + index
                      return (
                        <TableRow key={actualIndex}>
                          <TableCell className="font-mono text-xs">{actualIndex + 1}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Textarea
                                value={challenge.input}
                                onChange={(e) => handleChallengeChange(actualIndex, 'input', e.target.value)}
                                className="min-h-[60px] text-sm"
                              />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{challenge.input}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Textarea
                                value={challenge.expectedOutput}
                                onChange={(e) => handleChallengeChange(actualIndex, 'expectedOutput', e.target.value)}
                                className="min-h-[60px] text-sm"
                              />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{challenge.expectedOutput}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, selectedSet.challenges.length)} of {selectedSet.challenges.length} challenges
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center border-dashed">
              <p className="text-muted-foreground">Select a challenge set to view details</p>
            </Card>
          )}
        </div>
      </div>

      <ChallengeUploadDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge Set</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this challenge set? This action cannot be undone.
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
