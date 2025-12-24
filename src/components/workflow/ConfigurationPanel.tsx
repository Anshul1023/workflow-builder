import { useState, useEffect } from 'react';
import { X, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { getComponentConfig, NodeType } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentUpload } from './DocumentUpload';
import { workflowDb, Document } from '@/lib/api/workflowDb';

const colorMap: Record<NodeType, string> = {
  userQuery: 'border-violet-500/50',
  knowledgeBase: 'border-emerald-500/50',
  llmEngine: 'border-amber-500/50',
  output: 'border-cyan-500/50',
};

export function ConfigurationPanel() {
  const { nodes, selectedNodeId, selectNode, updateNodeConfig, deleteNode, currentWorkflowId } =
    useWorkflowStore();
  const [documents, setDocuments] = useState<Document[]>([]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Fetch documents when knowledge base is selected
  useEffect(() => {
    if (selectedNode?.data.type === 'knowledgeBase') {
      workflowDb.getDocuments(currentWorkflowId || undefined).then(setDocuments);
    }
  }, [selectedNode?.data.type, currentWorkflowId]);

  if (!selectedNode) {
    return (
      <div className="w-80 glass-card p-6 flex flex-col items-center justify-center h-full panel-shadow">
        <div className="text-center">
          <Settings className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No Component Selected</h3>
          <p className="text-sm text-muted-foreground">
            Click on a component in the canvas to configure it
          </p>
        </div>
      </div>
    );
  }

  const config = getComponentConfig(selectedNode.data.type);
  if (!config) return null;

  const handleConfigChange = (fieldId: string, value: any) => {
    updateNodeConfig(selectedNode.id, { [fieldId]: value });
  };

  const handleDelete = () => {
    deleteNode(selectedNode.id);
  };

  return (
    <div
      className={cn(
        'w-80 glass-card flex flex-col h-full panel-shadow border-l-4 animate-slide-in-right',
        colorMap[selectedNode.data.type]
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{config.label}</h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectNode(null)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Configuration Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {config.configFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
              {field.label}
            </Label>

            {field.type === 'text' && (
              <Input
                id={field.id}
                value={selectedNode.data.config[field.id] || ''}
                onChange={(e) => handleConfigChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="bg-surface-2 border-border focus:ring-primary"
              />
            )}

            {field.type === 'textarea' && (
              <Textarea
                id={field.id}
                value={selectedNode.data.config[field.id] || ''}
                onChange={(e) => handleConfigChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="bg-surface-2 border-border focus:ring-primary min-h-[100px] resize-none"
              />
            )}

            {field.type === 'select' && (
              <Select
                value={selectedNode.data.config[field.id] || ''}
                onValueChange={(value) => handleConfigChange(field.id, value)}
              >
                <SelectTrigger className="bg-surface-2 border-border">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'toggle' && (
              <div className="flex items-center gap-3">
                <Switch
                  id={field.id}
                  checked={selectedNode.data.config[field.id] || false}
                  onCheckedChange={(checked) => handleConfigChange(field.id, checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedNode.data.config[field.id] ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Document Upload for Knowledge Base */}
        {selectedNode.data.type === 'knowledgeBase' && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-sm font-medium text-foreground">
              Documents
            </Label>
            <DocumentUpload
              workflowId={currentWorkflowId || undefined}
              documents={documents}
              onDocumentsChange={setDocuments}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          className="w-full gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Component
        </Button>
      </div>
    </div>
  );
}
