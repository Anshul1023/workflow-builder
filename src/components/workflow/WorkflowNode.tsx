import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Database, Brain, Send, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeType, getComponentConfig } from '@/types/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

const iconMap = {
  MessageSquare,
  Database,
  Brain,
  Send,
};

const colorMap: Record<NodeType, string> = {
  userQuery: 'border-violet-500 bg-violet-500/10',
  knowledgeBase: 'border-emerald-500 bg-emerald-500/10',
  llmEngine: 'border-amber-500 bg-amber-500/10',
  output: 'border-cyan-500 bg-cyan-500/10',
};

const iconColorMap: Record<NodeType, string> = {
  userQuery: 'text-violet-400',
  knowledgeBase: 'text-emerald-400',
  llmEngine: 'text-amber-400',
  output: 'text-cyan-400',
};

const handleStyles: Record<NodeType, { source: boolean; target: boolean }> = {
  userQuery: { source: true, target: false },
  knowledgeBase: { source: true, target: true },
  llmEngine: { source: true, target: true },
  output: { source: false, target: true },
};

interface WorkflowNodeData {
  label: string;
  type: NodeType;
  config: Record<string, any>;
  isConfigured: boolean;
}

function WorkflowNodeComponent({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const { selectNode, selectedNodeId } = useWorkflowStore();
  const config = getComponentConfig(data.type);
  const Icon = iconMap[config?.icon as keyof typeof iconMap] || MessageSquare;
  const handles = handleStyles[data.type];

  const handleClick = () => {
    selectNode(id);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative min-w-[180px] rounded-xl border-2 transition-all duration-200 cursor-pointer node-shadow',
        colorMap[data.type],
        selected || selectedNodeId === id
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
          : 'hover:scale-[1.02]'
      )}
    >
      {handles.target && (
        <Handle
          type="target"
          position={Position.Left}
          className="!-left-[7px]"
        />
      )}

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3',
              iconColorMap[data.type]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{data.label}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {config?.description}
            </p>
          </div>
        </div>

        {data.isConfigured && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
            <Settings className="h-3 w-3" />
            <span>Configured</span>
          </div>
        )}
      </div>

      {handles.source && (
        <Handle
          type="source"
          position={Position.Right}
          className="!-right-[7px]"
        />
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
