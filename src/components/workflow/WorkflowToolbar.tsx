import { Play, Trash2, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WorkflowSaveLoad } from './WorkflowSaveLoad';

export function WorkflowToolbar() {
  const {
    nodes,
    isWorkflowValid,
    validationErrors,
    validateWorkflow,
    clearWorkflow,
    toggleChat,
    currentWorkflowName,
  } = useWorkflowStore();

  const handleValidate = () => {
    validateWorkflow();
  };

  const handleRun = () => {
    if (validateWorkflow()) {
      toggleChat();
    }
  };

  return (
    <div className="h-14 glass-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="h-3 w-3 rounded-sm bg-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {currentWorkflowName || 'Workflow Builder'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {nodes.length} component{nodes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {nodes.length > 0 && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
            {isWorkflowValid ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Valid</span>
              </div>
            ) : validationErrors.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs cursor-help">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{validationErrors.length} issue{validationErrors.length !== 1 ? 's' : ''}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px]">
                  <ul className="text-xs space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <WorkflowSaveLoad />

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleValidate}
          disabled={nodes.length === 0}
          className="gap-2 border-border hover:bg-surface-2"
        >
          <CheckCircle className="h-4 w-4" />
          Validate
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearWorkflow}
          disabled={nodes.length === 0}
          className="gap-2 border-border hover:bg-surface-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          size="sm"
          onClick={handleRun}
          disabled={nodes.length === 0}
          className={cn(
            'gap-2 transition-all',
            isWorkflowValid
              ? 'bg-primary hover:bg-primary/90 glow-sm'
              : 'bg-primary/50 hover:bg-primary/60'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Chat with Workflow
        </Button>
      </div>
    </div>
  );
}
