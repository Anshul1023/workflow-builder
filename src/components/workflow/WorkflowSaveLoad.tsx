import { useState, useEffect } from 'react';
import { Save, FolderOpen, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkflowStore } from '@/store/workflowStore';
import { workflowDb, SavedWorkflow } from '@/lib/api/workflowDb';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function WorkflowSaveLoad() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);

  const { nodes, edges, loadWorkflow, clearWorkflow } = useWorkflowStore();

  const fetchWorkflows = async () => {
    setIsLoading(true);
    const data = await workflowDb.getWorkflows();
    setWorkflows(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    setIsLoading(true);
    
    if (currentWorkflowId) {
      const success = await workflowDb.updateWorkflow(currentWorkflowId, nodes, edges, workflowName);
      if (success) {
        toast.success('Workflow updated');
      } else {
        toast.error('Failed to update workflow');
      }
    } else {
      const saved = await workflowDb.saveWorkflow(workflowName, nodes, edges);
      if (saved) {
        setCurrentWorkflowId(saved.id);
        toast.success('Workflow saved');
      } else {
        toast.error('Failed to save workflow');
      }
    }

    setIsLoading(false);
    setIsSaveOpen(false);
  };

  const handleLoad = async (workflow: SavedWorkflow) => {
    loadWorkflow(workflow.nodes, workflow.edges);
    setCurrentWorkflowId(workflow.id);
    setWorkflowName(workflow.name);
    setIsOpen(false);
    toast.success(`Loaded: ${workflow.name}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await workflowDb.deleteWorkflow(id);
    if (success) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      if (currentWorkflowId === id) {
        setCurrentWorkflowId(null);
        setWorkflowName('');
      }
      toast.success('Workflow deleted');
    } else {
      toast.error('Failed to delete workflow');
    }
  };

  const handleNew = () => {
    clearWorkflow();
    setCurrentWorkflowId(null);
    setWorkflowName('');
    setIsOpen(false);
    toast.success('New workflow created');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Dialog */}
      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={nodes.length === 0}
            className="gap-2 border-border hover:bg-surface-2"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
            <DialogDescription>
              Give your workflow a name to save it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow name..."
              className="bg-surface-2 border-border"
            />
            <Button
              onClick={handleSave}
              disabled={isLoading || !workflowName.trim()}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {currentWorkflowId ? 'Update Workflow' : 'Save Workflow'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border hover:bg-surface-2"
          >
            <FolderOpen className="h-4 w-4" />
            Load
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Load Workflow</DialogTitle>
            <DialogDescription>
              Select a saved workflow or create a new one
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button
              onClick={handleNew}
              variant="outline"
              className="w-full gap-2 mb-4 border-dashed border-border hover:bg-surface-2"
            >
              <Plus className="h-4 w-4" />
              New Workflow
            </Button>

            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No saved workflows yet
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => handleLoad(workflow)}
                      className={cn(
                        'p-3 rounded-lg cursor-pointer transition-colors group',
                        'bg-surface-2 hover:bg-surface-3 border border-transparent hover:border-primary/30',
                        currentWorkflowId === workflow.id && 'border-primary/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground text-sm">
                            {workflow.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {workflow.nodes.length} nodes •{' '}
                            {new Date(workflow.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(workflow.id, e)}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
