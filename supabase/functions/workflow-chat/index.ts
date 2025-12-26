import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
            // For PDFs, we need to use AI vision to extract text
            const { data: fileData } = await supabase.storage
              .from('documents')
              .download(doc.file_path);

            if (fileData) {
              // Convert PDF to base64 for AI processing
              const arrayBuffer = await fileData.arrayBuffer();
              const base64 = base64Encode(arrayBuffer);
              
              try {
                // Use Gemini vision to extract text from PDF
                const extractResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                      {
                        role: 'user',
                        content: [
                          {
                            type: 'text',
                            text: 'Extract ALL text content from this PDF document. Return ONLY the extracted text, preserving the structure and formatting as much as possible. Include all details like names, dates, skills, experiences, etc.'
                          },
                          {
                            type: 'file',
                            file: {
                              filename: doc.name,
                              file_data: `data:application/pdf;base64,${base64}`
                            }
                          }
                        ]
                      }
                    ],
                    max_tokens: 8000
                  }),
                });

                if (extractResponse.ok) {
                  const extractData = await extractResponse.json();
                  const extractedText = extractData.choices?.[0]?.message?.content || '';
                  
                  if (extractedText.length > 50) {
                    documentContext += `\n\n--- Document: ${doc.name} ---\n${extractedText}`;
                    
                    // Cache the extracted content
                    await supabase
                      .from('documents')
                      .update({ content: extractedText })
                      .eq('id', doc.id);
                    
                    console.log(`Extracted ${extractedText.length} chars from PDF: ${doc.name}`);
                  }
                } else {
                  console.error('PDF extraction failed:', await extractResponse.text());
                  documentContext += `\n\n--- Document: ${doc.name} ---\n[PDF document - could not extract text]`;
                }
              } catch (extractError) {
                console.error('PDF extraction error:', extractError);
                documentContext += `\n\n--- Document: ${doc.name} ---\n[PDF document - extraction error]`;
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

    // Validate model - only allow supported Lovable AI models
    const validModels = [
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro', 
      'google/gemini-2.5-flash-lite',
      'google/gemini-3-pro-preview',
      'openai/gpt-5',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano'
    ];
    const requestedModel = model || 'google/gemini-2.5-flash';
    const selectedModel = validModels.includes(requestedModel) ? requestedModel : 'google/gemini-2.5-flash';
    
    if (requestedModel !== selectedModel) {
      console.log(`Invalid model "${requestedModel}" requested, falling back to "${selectedModel}"`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
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
