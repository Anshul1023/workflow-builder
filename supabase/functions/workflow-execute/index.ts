import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface WorkflowRequest {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  userInput: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nodes, edges, userInput }: WorkflowRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Executing workflow with', nodes.length, 'nodes');

    // Find nodes by type
    const userQueryNode = nodes.find(n => n.type === 'userQuery');
    const knowledgeBaseNode = nodes.find(n => n.type === 'knowledgeBase');
    const llmEngineNode = nodes.find(n => n.type === 'llmEngine');
    const outputNode = nodes.find(n => n.type === 'output');

    // Build context from workflow
    let context = '';
    let systemPrompt = 'You are a helpful AI assistant.';

    if (knowledgeBaseNode?.data.config) {
      const kbConfig = knowledgeBaseNode.data.config;
      context = `Knowledge Base: ${kbConfig.name || 'Default'}\n`;
      if (kbConfig.documents) {
        context += `Documents: ${kbConfig.documents}\n`;
      }
    }

    if (llmEngineNode?.data.config) {
      const llmConfig = llmEngineNode.data.config;
      systemPrompt = llmConfig.systemPrompt || systemPrompt;
    }

    // Execute LLM call
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: llmEngineNode?.data.config?.model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt + (context ? `\n\nContext:\n${context}` : '') },
          { role: 'user', content: userInput },
        ],
        temperature: llmEngineNode?.data.config?.temperature || 0.7,
        max_tokens: llmEngineNode?.data.config?.maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || 'No response generated';

    console.log('Workflow execution completed');

    return new Response(JSON.stringify({
      success: true,
      output,
      nodesExecuted: nodes.map(n => n.id),
      model: llmEngineNode?.data.config?.model || 'google/gemini-2.5-flash',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
