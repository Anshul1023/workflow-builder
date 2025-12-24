import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkflowStore } from '@/store/workflowStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatModal() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    addChatMessage,
    nodes,
    edges,
  } = useWorkflowStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    addChatMessage({ role: 'user', content: userMessage });
    setIsProcessing(true);

    // Simulate workflow processing
    await simulateWorkflowExecution(userMessage);
    setIsProcessing(false);
  };

  const simulateWorkflowExecution = async (query: string) => {
    // Find the workflow path
    const userQueryNode = nodes.find((n) => n.data.type === 'userQuery');
    const knowledgeBaseNode = nodes.find((n) => n.data.type === 'knowledgeBase');
    const llmNode = nodes.find((n) => n.data.type === 'llmEngine');
    const outputNode = nodes.find((n) => n.data.type === 'output');

    // Simulate processing steps
    addChatMessage({
      role: 'system',
      content: `🔄 Processing query through workflow...`,
    });

    await new Promise((r) => setTimeout(r, 500));

    if (knowledgeBaseNode) {
      addChatMessage({
        role: 'system',
        content: `📚 Searching knowledge base (${knowledgeBaseNode.data.config.embeddingModel || 'default'} embeddings)...`,
      });
      await new Promise((r) => setTimeout(r, 800));
    }

    addChatMessage({
      role: 'system',
      content: `🧠 Generating response with ${llmNode?.data.config.model || 'GPT-4'}...`,
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Generate a mock response based on the query
    const response = generateMockResponse(query, llmNode?.data.config, knowledgeBaseNode?.data.config);

    addChatMessage({
      role: 'assistant',
      content: response,
    });
  };

  const generateMockResponse = (query: string, llmConfig?: any, kbConfig?: any) => {
    const model = llmConfig?.model || 'GPT-4';
    const hasContext = kbConfig?.passContext !== false;

    const responses = [
      `Based on my analysis${hasContext ? ' and the relevant context from the knowledge base' : ''}, here's what I found:\n\n${query.toLowerCase().includes('how') ? 'The process involves several key steps that work together to achieve the desired outcome. Each step builds upon the previous one to ensure a comprehensive solution.' : query.toLowerCase().includes('what') ? 'This refers to a fundamental concept that plays a crucial role in the overall system. Understanding this helps in making informed decisions.' : 'After careful consideration of all available information, I can provide you with a detailed response that addresses your specific needs.'}`,
      `Great question! ${hasContext ? 'After reviewing the relevant documents, ' : ''}I can explain this in detail:\n\nThe key points to understand are:\n1. The foundation of the concept\n2. How it applies in practical scenarios\n3. Best practices for implementation`,
      `I've processed your query${hasContext ? ' against the knowledge base' : ''} and here's my response:\n\nThis is an important topic that requires careful consideration. The main aspects to focus on include understanding the core principles and applying them effectively.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
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
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your query will be processed through the workflow you've built.
                  Ask anything to get started!
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

            {isProcessing && (
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
              placeholder="Type your message..."
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
