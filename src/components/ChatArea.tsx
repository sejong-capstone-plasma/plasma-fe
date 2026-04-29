import { useLayoutEffect, useRef } from 'react';
import ChatTypes from './ChatTypes';

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
  
  // param-confirm / param-error 통합 — 마지막 인터랙티브 카드 인덱스
  const lastInteractiveIndex = messages.reduce((last, m, i) =>
    m.type === 'param-confirm' || m.type === 'param-error' ? i : last, -1
  );

  
  useLayoutEffect(() => {
    if (lastUserRef.current) {
      lastUserRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto pt-6 pb-0">
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
              <div ref={index === lastUserIndex ? lastUserRef : undefined}>
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
        <div ref={endRef} />
      </div>
    </div>
  );
}