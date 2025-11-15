'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ModelDialog } from '@/components/model-dialog'
import { ModelsList } from '@/components/models-list'
import { LLMModel } from '@/lib/types'
import { getModels, saveModel, deleteModel } from '@/lib/storage'

export default function ModelsPage() {
  const [models, setModels] = useState<LLMModel[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<LLMModel | undefined>()

  useEffect(() => {
    setModels(getModels())
  }, [])

  const handleSave = (model: LLMModel) => {
    saveModel(model)
    setModels(getModels())
    setEditingModel(undefined)
  }

  const handleEdit = (model: LLMModel) => {
    setEditingModel(model)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteModel(id)
    setModels(getModels())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Models</h1>
          <p className="text-muted-foreground">Configure LLM models for testing</p>
        </div>
        <Button
          onClick={() => {
            setEditingModel(undefined)
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Model
        </Button>
      </div>

      <ModelsList models={models} onEdit={handleEdit} onDelete={handleDelete} />

      <ModelDialog open={dialogOpen} onOpenChange={setDialogOpen} model={editingModel} onSave={handleSave} />
    </div>
  )
}
