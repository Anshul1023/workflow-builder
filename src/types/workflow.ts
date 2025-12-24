import { Node, Edge } from 'reactflow';

export type NodeType = 'userQuery' | 'knowledgeBase' | 'llmEngine' | 'output';

export interface ComponentConfig {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  configFields: ConfigField[];
}

export interface ConfigField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'toggle' | 'file';
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | boolean;
}

export interface WorkflowNode extends Node {
  data: {
    label: string;
    type: NodeType;
    config: Record<string, any>;
    isConfigured: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface WorkflowState {
  nodes: WorkflowNode[];
  edges: Edge[];
  isValid: boolean;
  validationErrors: string[];
}

export const COMPONENT_CONFIGS: ComponentConfig[] = [
  {
    id: 'userQuery',
    type: 'userQuery',
    label: 'User Query',
    description: 'Entry point for user questions',
    icon: 'MessageSquare',
    color: 'node-user-query',
    configFields: [
      {
        id: 'placeholder',
        label: 'Input Placeholder',
        type: 'text',
        placeholder: 'Ask a question...',
        defaultValue: 'Enter your query here...',
      },
      {
        id: 'maxLength',
        label: 'Max Character Length',
        type: 'text',
        placeholder: '1000',
        defaultValue: '1000',
      },
    ],
  },
  {
    id: 'knowledgeBase',
    type: 'knowledgeBase',
    label: 'Knowledge Base',
    description: 'Document processing & retrieval',
    icon: 'Database',
    color: 'node-knowledge-base',
    configFields: [
      {
        id: 'embeddingModel',
        label: 'Embedding Model',
        type: 'select',
        options: [
          { value: 'openai', label: 'OpenAI Embeddings' },
          { value: 'gemini', label: 'Gemini Embeddings' },
          { value: 'cohere', label: 'Cohere Embeddings' },
        ],
        defaultValue: 'openai',
      },
      {
        id: 'chunkSize',
        label: 'Chunk Size',
        type: 'text',
        placeholder: '500',
        defaultValue: '500',
      },
      {
        id: 'topK',
        label: 'Top K Results',
        type: 'text',
        placeholder: '5',
        defaultValue: '5',
      },
      {
        id: 'passContext',
        label: 'Pass Context to LLM',
        type: 'toggle',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'llmEngine',
    type: 'llmEngine',
    label: 'LLM Engine',
    description: 'AI language model processing',
    icon: 'Brain',
    color: 'node-llm-engine',
    configFields: [
      {
        id: 'model',
        label: 'Model',
        type: 'select',
        options: [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
          { value: 'gemini-pro', label: 'Gemini Pro' },
          { value: 'claude-3', label: 'Claude 3' },
        ],
        defaultValue: 'gpt-4',
      },
      {
        id: 'systemPrompt',
        label: 'System Prompt',
        type: 'textarea',
        placeholder: 'You are a helpful assistant...',
        defaultValue: 'You are a helpful assistant that answers questions accurately and concisely.',
      },
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'text',
        placeholder: '0.7',
        defaultValue: '0.7',
      },
      {
        id: 'enableWebSearch',
        label: 'Enable Web Search',
        type: 'toggle',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'output',
    type: 'output',
    label: 'Output',
    description: 'Display response in chat',
    icon: 'Send',
    color: 'node-output',
    configFields: [
      {
        id: 'format',
        label: 'Output Format',
        type: 'select',
        options: [
          { value: 'text', label: 'Plain Text' },
          { value: 'markdown', label: 'Markdown' },
          { value: 'json', label: 'JSON' },
        ],
        defaultValue: 'markdown',
      },
      {
        id: 'streamResponse',
        label: 'Stream Response',
        type: 'toggle',
        defaultValue: true,
      },
    ],
  },
];

export function getComponentConfig(type: NodeType): ComponentConfig | undefined {
  return COMPONENT_CONFIGS.find((c) => c.type === type);
}
