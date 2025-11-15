'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LLMModel } from '@/lib/types'

interface ModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: LLMModel
  onSave: (model: LLMModel) => void
}

export function ModelDialog({ open, onOpenChange, model, onSave }: ModelDialogProps) {
  const [formData, setFormData] = useState<Partial<LLMModel>>({
    name: '',
    provider: 'openai',
    apiKey: '',
    modelId: '',
  })

  // Reset form when dialog opens or model changes
  useEffect(() => {
    if (open) {
      if (model) {
        setFormData(model)
      } else {
        setFormData({
          name: '',
          provider: 'openai',
          apiKey: '',
          modelId: '',
        })
      }
    }
  }, [open, model])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.apiKey || !formData.modelId) return

    const modelData: LLMModel = {
      id: model?.id || crypto.randomUUID(),
      name: formData.name,
      provider: formData.provider as LLMModel['provider'],
      apiKey: formData.apiKey,
      endpoint: formData.endpoint,
      modelId: formData.modelId,
      createdAt: model?.createdAt || new Date().toISOString(),
    }

    onSave(modelData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{model ? 'Edit Model' : 'Add New Model'}</DialogTitle>
          <DialogDescription>
            Configure an LLM model for testing. Your API keys are stored locally.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Model Name</Label>
            <Input
              id="name"
              placeholder="GPT-4, Claude 3, etc."
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={formData.provider || 'openai'}
              onValueChange={(value) => setFormData({ ...formData, provider: value as LLMModel['provider'] })}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="grok">Grok</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelId">Model ID</Label>
            <Input
              id="modelId"
              placeholder="gpt-4, claude-3-opus-20240229, etc."
              value={formData.modelId || ''}
              onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={formData.apiKey || ''}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              required
            />
          </div>

          {formData.provider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="endpoint">Custom Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="https://api.example.com/v1/chat/completions"
                value={formData.endpoint || ''}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Model</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
