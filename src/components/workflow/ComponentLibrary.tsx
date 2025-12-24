import { DragEvent } from 'react';
import { MessageSquare, Database, Brain, Send, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPONENT_CONFIGS, NodeType } from '@/types/workflow';

const iconMap = {
  MessageSquare,
  Database,
  Brain,
  Send,
};

const colorMap: Record<NodeType, { bg: string; border: string; text: string }> = {
  userQuery: {
    bg: 'bg-violet-500/10 hover:bg-violet-500/20',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
  },
  knowledgeBase: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  llmEngine: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  output: {
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
  },
};

export function ComponentLibrary() {
  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-72 glass-card p-4 flex flex-col h-full panel-shadow">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Components</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Drag components to the canvas
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {COMPONENT_CONFIGS.map((component) => {
          const Icon = iconMap[component.icon as keyof typeof iconMap] || MessageSquare;
          const colors = colorMap[component.type];

          return (
            <div
              key={component.id}
              draggable
              onDragStart={(e) => onDragStart(e, component.type)}
              className={cn(
                'group flex items-center gap-3 p-3 rounded-lg border cursor-grab transition-all duration-200',
                'active:cursor-grabbing active:scale-[0.98]',
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md bg-surface-3',
                    colors.text
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground text-sm">
                  {component.label}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {component.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500"></span>
            Entry point for queries
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Document knowledge retrieval
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            AI processing engine
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            Response output
          </p>
        </div>
      </div>
    </div>
  );
}
