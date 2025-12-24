import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, User, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkflowStore } from '@/store/workflowStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { workflowApi } from '@/lib/api/workflow';
import { workflowDb, Document } from '@/lib/api/workflowDb';
import { toast } from 'sonner';

export function ChatModal() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    addChatMessage,
    nodes,
    edges,
    currentWorkflowId,
  } = useWorkflowStore();

  // Fetch documents when chat opens
  useEffect(() => {
    if (isChatOpen) {
      workflowDb.getDocuments(currentWorkflowId || undefined).then(setDocuments);
    }
  }, [isChatOpen, currentWorkflowId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    addChatMessage({ role: 'user', content: userMessage });
    setIsProcessing(true);
    setStreamingContent('');

    // Get LLM config from workflow
    const llmNode = nodes.find((n) => n.data.type === 'llmEngine');
    const knowledgeBaseNode = nodes.find((n) => n.data.type === 'knowledgeBase');
    
    // Build system prompt from workflow
    let systemPrompt = llmNode?.data.config?.systemPrompt || 'You are a helpful AI assistant.';
    
    // Get document IDs if knowledge base is configured
    const documentIds = knowledgeBaseNode?.data.config?.passContext !== false 
      ? documents.map(d => d.id) 
      : [];

    // Show processing status with document count
    const statusMsg = documentIds.length > 0 
      ? `🔄 Processing with ${documentIds.length} document(s)...`
      : `🔄 Processing through workflow...`;
    
    addChatMessage({
      role: 'system',
      content: statusMsg,
    });

    try {
      let fullContent = '';
      
      await workflowApi.streamChat({
        messages: [{ role: 'user', content: userMessage }],
        systemPrompt,
        model: llmNode?.data.config?.model || 'google/gemini-2.5-flash',
        documentIds,
        onDelta: (text) => {
          fullContent += text;
          setStreamingContent(fullContent);
        },
        onDone: () => {
          setStreamingContent('');
          addChatMessage({ role: 'assistant', content: fullContent });
          setIsProcessing(false);
        },
        onError: (error) => {
          toast.error(error);
          setIsProcessing(false);
          setStreamingContent('');
        },
      });
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
      setIsProcessing(false);
      setStreamingContent('');
    }
  };

  if (!isChatOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-[600px] glass-card flex flex-col animate-scale-in panel-shadow mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Workflow Chat</h2>
              <p className="text-xs text-muted-foreground">
                {nodes.length} components • {edges.length} connections
                {documents.length > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {documents.length} doc{documents.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsChatOpen(false)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {chatMessages.length === 0 && !streamingContent && (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {documents.length > 0 
                    ? `Ask questions about your ${documents.length} uploaded document${documents.length !== 1 ? 's' : ''}.`
                    : 'Your query will be processed through the workflow you\'ve built.'}
                </p>
              </div>
            )}

            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 animate-fade-in',
                  message.role === 'user' && 'justify-end'
                )}
              >
                {message.role !== 'user' && (
                  <div
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      message.role === 'assistant'
                        ? 'bg-primary/20'
                        : 'bg-muted'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'assistant'
                      ? 'bg-surface-2 text-foreground'
                      : 'bg-surface-3/50 text-muted-foreground italic'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-violet-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming response */}
            {streamingContent && (
              <div className="flex gap-3 animate-fade-in">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="max-w-[80%] bg-surface-2 rounded-lg px-4 py-3 text-sm text-foreground">
                  <p className="whitespace-pre-wrap">{streamingContent}</p>
                </div>
              </div>
            )}

            {isProcessing && !streamingContent && (
              <div className="flex gap-3 animate-fade-in">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
                <div className="bg-surface-2 rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={documents.length > 0 ? "Ask about your documents..." : "Type your message..."}
              disabled={isProcessing}
              className="flex-1 bg-surface-2 border-border focus:ring-primary"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
