import { create } from 'zustand';
import { Node, Edge, addEdge, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { NodeType, ChatMessage, WorkflowNode, getComponentConfig } from '@/types/workflow';

interface WorkflowStore {
  nodes: WorkflowNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  chatMessages: ChatMessage[];
  isWorkflowValid: boolean;
  validationErrors: string[];
  isChatOpen: boolean;
  
  // Node actions
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, any>) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (nodeId: string | null) => void;
  deleteNode: (nodeId: string) => void;
  
  // Workflow actions
  validateWorkflow: () => boolean;
  clearWorkflow: () => void;
  
  // Chat actions
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  toggleChat: () => void;
  setIsChatOpen: (isOpen: boolean) => void;
}

let nodeIdCounter = 0;

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  chatMessages: [],
  isWorkflowValid: false,
  validationErrors: [],
  isChatOpen: false,

  addNode: (type, position) => {
    const config = getComponentConfig(type);
    if (!config) return;

    const newNode: WorkflowNode = {
      id: `${type}-${++nodeIdCounter}`,
      type: 'workflowNode',
      position,
      data: {
        label: config.label,
        type,
        config: config.configFields.reduce((acc, field) => {
          acc[field.id] = field.defaultValue ?? '';
          return acc;
        }, {} as Record<string, any>),
        isConfigured: false,
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: { ...node.data.config, ...config },
                isConfigured: true,
              },
            }
          : node
      ),
    }));
    get().validateWorkflow();
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as WorkflowNode[],
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
    get().validateWorkflow();
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: 'hsl(187, 94%, 43%)' },
        },
        state.edges
      ),
    }));
    get().validateWorkflow();
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
    get().validateWorkflow();
  },

  validateWorkflow: () => {
    const { nodes, edges } = get();
    const errors: string[] = [];

    // Check for required components
    const hasUserQuery = nodes.some((n) => n.data.type === 'userQuery');
    const hasOutput = nodes.some((n) => n.data.type === 'output');
    const hasLLM = nodes.some((n) => n.data.type === 'llmEngine');

    if (!hasUserQuery) errors.push('Workflow must have a User Query component');
    if (!hasOutput) errors.push('Workflow must have an Output component');
    if (!hasLLM) errors.push('Workflow must have an LLM Engine component');

    // Check for connections
    if (nodes.length > 1 && edges.length === 0) {
      errors.push('Components must be connected');
    }

    // Check if all nodes have at least one connection
    nodes.forEach((node) => {
      const hasConnection = edges.some(
        (e) => e.source === node.id || e.target === node.id
      );
      if (!hasConnection && nodes.length > 1) {
        errors.push(`${node.data.label} is not connected`);
      }
    });

    const isValid = errors.length === 0;
    set({ isWorkflowValid: isValid, validationErrors: errors });
    return isValid;
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isWorkflowValid: false,
      validationErrors: [],
    });
    nodeIdCounter = 0;
  },

  addChatMessage: (message) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      ...message,
    };
    set((state) => ({
      chatMessages: [...state.chatMessages, newMessage],
    }));
  },

  clearChat: () => {
    set({ chatMessages: [] });
  },

  toggleChat: () => {
    set((state) => ({ isChatOpen: !state.isChatOpen }));
  },

  setIsChatOpen: (isOpen) => {
    set({ isChatOpen: isOpen });
  },
}));
