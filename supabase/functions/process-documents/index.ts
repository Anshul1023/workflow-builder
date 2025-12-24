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
    const { documentIds } = await req.json();
    
    if (!documentIds || documentIds.length === 0) {
      return new Response(JSON.stringify({ content: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching documents:', documentIds);

    // Get document records
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .in('id', documentIds);

    if (docError) {
      console.error('Error fetching documents:', docError);
      throw docError;
    }

    let allContent = '';

    for (const doc of documents || []) {
      // If we already have extracted content, use it
      if (doc.content) {
        allContent += `\n\n--- Document: ${doc.name} ---\n${doc.content}`;
        continue;
      }

      // For text files, download and read
      if (doc.file_type?.startsWith('text/') || 
          doc.name.endsWith('.txt') || 
          doc.name.endsWith('.md')) {
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(doc.file_path);

        if (!downloadError && fileData) {
          const text = await fileData.text();
          allContent += `\n\n--- Document: ${doc.name} ---\n${text}`;
          
          // Cache the content
          await supabase
            .from('documents')
            .update({ content: text })
            .eq('id', doc.id);
        }
      }
      
      // For PDFs - basic text extraction attempt
      if (doc.file_type === 'application/pdf' || doc.name.endsWith('.pdf')) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(doc.file_path);

        if (!downloadError && fileData) {
          // Try to extract text from PDF using basic method
          const arrayBuffer = await fileData.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Simple PDF text extraction - looks for text streams
          let extractedText = '';
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const pdfString = decoder.decode(uint8Array);
          
          // Extract text between BT and ET markers (basic PDF text objects)
          const textMatches = pdfString.match(/BT[\s\S]*?ET/g) || [];
          for (const match of textMatches) {
            // Extract text from Tj and TJ operators
            const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g) || [];
            for (const tj of tjMatches) {
              const text = tj.match(/\(([^)]*)\)/)?.[1] || '';
              extractedText += text + ' ';
            }
          }
          
          // Also try to find readable text patterns
          const readableText = pdfString
            .replace(/[^\x20-\x7E\n\r]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Use whichever has more content
          const finalText = extractedText.length > 100 ? extractedText : 
            readableText.substring(0, 5000); // Limit for basic extraction
          
          if (finalText.length > 50) {
            allContent += `\n\n--- Document: ${doc.name} ---\n${finalText}`;
            
            // Cache the content
            await supabase
              .from('documents')
              .update({ content: finalText })
              .eq('id', doc.id);
          } else {
            allContent += `\n\n--- Document: ${doc.name} ---\n[PDF file uploaded - content extraction limited]`;
          }
        }
      }
    }

    console.log('Extracted content length:', allContent.length);

    return new Response(JSON.stringify({ content: allContent.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Document processing error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      content: '' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
