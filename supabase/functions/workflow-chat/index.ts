import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, model, documentIds } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing chat request with', messages.length, 'messages');

    // Fetch document content if documentIds provided
    let documentContext = '';
    if (documentIds && documentIds.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log('Fetching documents:', documentIds);

      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds);

      if (!docError && documents) {
        for (const doc of documents) {
          if (doc.content) {
            documentContext += `\n\n--- Document: ${doc.name} ---\n${doc.content}`;
          } else if (doc.file_type?.startsWith('text/') || doc.name.endsWith('.txt') || doc.name.endsWith('.md')) {
            // Download and read text files
            const { data: fileData } = await supabase.storage
              .from('documents')
              .download(doc.file_path);

            if (fileData) {
              const text = await fileData.text();
              documentContext += `\n\n--- Document: ${doc.name} ---\n${text}`;
              
              // Cache the content
              await supabase
                .from('documents')
                .update({ content: text })
                .eq('id', doc.id);
            }
          } else if (doc.file_type === 'application/pdf' || doc.name.endsWith('.pdf')) {
            // Basic PDF text extraction
            const { data: fileData } = await supabase.storage
              .from('documents')
              .download(doc.file_path);

            if (fileData) {
              const arrayBuffer = await fileData.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              const decoder = new TextDecoder('utf-8', { fatal: false });
              const pdfString = decoder.decode(uint8Array);
              
              // Extract readable text
              const readableText = pdfString
                .replace(/[^\x20-\x7E\n\r]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 8000);
              
              if (readableText.length > 100) {
                documentContext += `\n\n--- Document: ${doc.name} ---\n${readableText}`;
                
                // Cache the content
                await supabase
                  .from('documents')
                  .update({ content: readableText })
                  .eq('id', doc.id);
              }
            }
          }
        }
      }
      
      console.log('Document context length:', documentContext.length);
    }

    // Build enhanced system prompt with document context
    let enhancedSystemPrompt = systemPrompt || 'You are a helpful AI assistant. Keep answers clear and concise.';
    
    if (documentContext) {
      enhancedSystemPrompt += `\n\n## Knowledge Base Documents\nUse the following document content to answer questions:\n${documentContext}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: enhancedSystemPrompt
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: 'Payment required, please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Streaming response started');
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
