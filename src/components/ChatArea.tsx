import { useEffect, useRef } from 'react';
import ChatTypes from './chatTypes';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'default' | 'param-confirm' | 'param-error' | 'error' | 'error-retry' | 'prediction-result';
  loadingText?: string;
}

export default function ChatArea({ messages, isTyping, onConfirm, onReanalyze, onRetry, onOpenPanel }: {
  messages: ChatMessage[];
  isTyping: boolean;
  onConfirm?: (taskType: 'PREDICTION' | 'OPTIMIZATION', params?: Record<string, number>) => void;
  onReanalyze?: (values: Record<string, number>) => void;
  onRetry?: () => void;
  onOpenPanel?: (historyId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastUserRef = useRef<HTMLDivElement | null>(null);

  const lastUserIndex = messages.map(m => m.role).lastIndexOf('user');

  const lastInteractiveIndex = messages.reduce((last, m, i) =>
    m.type === 'param-confirm' || m.type === 'param-error' ? i : last, -1
  );

  useEffect(() => {
    if (messages.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [messages.length]);

  return (
    <div ref={containerRef}
      className="flex-1 overflow-y-auto h-full pt-6 pb-0 scroll-smooth">
      <div className="max-w-3xl mx-auto px-5">
        {messages.map((msg, index) => {
          const isLastAssistant =
            msg.role === 'assistant' &&
            messages.slice(index + 1).every(m => m.role !== 'assistant');

          const isLatest =
            (msg.type === 'param-confirm' || msg.type === 'param-error')
              ? index === lastInteractiveIndex
              : true;

          const hasPredictionResult = messages.some(m => m.type === 'prediction-result');

          return (
            <div key={index}>
              <div
                ref={index === lastUserIndex ? lastUserRef : undefined}
                className="scroll-mt-16"
              >
                <ChatTypes
                  role={msg.role}
                  content={msg.content}
                  type={msg.type}
                  isTyping={isTyping && index === messages.length - 1 && msg.role === 'assistant'}
                  isLastAssistant={isLastAssistant}
                  isLatest={isLatest}
                  onConfirm={msg.type === 'param-confirm' ? onConfirm : undefined}
                  onReanalyze={msg.type === 'param-error' ? onReanalyze : undefined}
                  onRetry={msg.type === 'error-retry' ? onRetry : undefined}
                  loadingText={msg.loadingText}
                  onOpenPanel={msg.type === 'prediction-result' ? onOpenPanel : undefined}
                  disableEdit={msg.type === 'param-confirm' && hasPredictionResult}
                />
              </div>
            </div>
          );
        })}
        <div ref={endRef} className={isTyping ? "h-[40vh] pointer-events-none" : "h-[16.5vh] pointer-events-none"} />
      </div>
    </div>
  );
}