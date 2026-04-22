import { useEffect, useRef } from 'react';
import ChatTypes from './ChatTypes';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'default' | 'param-confirm' | 'param-error' | 'error' | 'error-retry';
}

export default function ChatArea({ messages, isTyping, onConfirm, onReanalyze, onRetry }: {
  messages: ChatMessage[];
  isTyping: boolean;
  onConfirm?: () => void;
  onReanalyze?: (values: Record<string, number>) => void;
  onRetry?: () => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto px-5">
        {messages.map((msg, index) => {
          const isLastAssistant =
            msg.role === 'assistant' &&
            messages.slice(index + 1).every(m => m.role !== 'assistant');

          return (
            <ChatTypes
              key={index}
              role={msg.role}
              content={msg.content}
              type={msg.type}
              isTyping={isTyping && index === messages.length - 1 && msg.role === 'assistant'}
              isLastAssistant={isLastAssistant}
              onConfirm={msg.type === 'param-confirm' ? onConfirm : undefined}
              onReanalyze={msg.type === 'param-error' ? onReanalyze : undefined}
              onRetry={msg.type === 'error-retry' ? onRetry : undefined}
            />
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}