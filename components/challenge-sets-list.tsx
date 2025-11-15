'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChallengeSet } from '@/lib/types'
import { FileText, Trash2, Eye } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ChallengeSetsListProps {
  challengeSets: ChallengeSet[]
  onDelete: (id: string) => void
}

export function ChallengeSetsList({ challengeSets, onDelete }: ChallengeSetsListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewingSet, setViewingSet] = useState<ChallengeSet | null>(null)

  if (challengeSets.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No challenge sets yet. Upload your first CSV to get started.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {challengeSets.map((set) => (
          <Card key={set.id} className="p-4 space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold">{set.name}</h3>
              {set.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{set.description}</p>
              )}
            </div>

            <Badge variant="secondary">
              {set.challenges.length} challenge{set.challenges.length !== 1 ? 's' : ''}
            </Badge>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewingSet(set)}>
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteId(set.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!viewingSet} onOpenChange={(open) => !open && setViewingSet(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewingSet?.name}</DialogTitle>
            <DialogDescription>{viewingSet?.description}</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead>Expected Output</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingSet?.challenges.map((challenge, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                    <TableCell className="text-sm">{challenge.input}</TableCell>
                    <TableCell className="text-sm">{challenge.expectedOutput}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDelete(deleteId)
                setDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
