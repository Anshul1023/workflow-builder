import { supabase } from '@/integrations/supabase/client';

type Message = { role: 'user' | 'assistant'; content: string };

interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    config: Record<string, any>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export const workflowApi = {
  // Stream chat with workflow context
  async streamChat({
    messages,
    systemPrompt,
    model,
    onDelta,
    onDone,
    onError,
  }: {
    messages: Message[];
    systemPrompt?: string;
    model?: string;
    onDelta: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  }) {
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages, systemPrompt, model }),
      });

      if (resp.status === 429) {
        onError('Rate limit exceeded. Please try again later.');
        return;
      }
      if (resp.status === 402) {
        onError('Payment required. Please add credits.');
        return;
      }
      if (!resp.ok || !resp.body) {
        onError('Failed to start chat stream');
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch { /* ignore */ }
        }
      }

      onDone();
    } catch (error) {
      console.error('Stream chat error:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  },

  // Execute entire workflow
  async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    userInput: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('workflow-execute', {
        body: { nodes, edges, userInput },
      });

      if (error) {
        console.error('Workflow execution error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      console.error('Workflow execution error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
};
