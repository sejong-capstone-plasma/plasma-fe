import { useEffect, useRef } from 'react';
import ChatTypes from './chatTypes';
import type { ConditionParams } from '../types/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'default' | 'param-confirm' | 'param-error' | 'error' | 'error-retry'
  | 'prediction-result' | 'optimization-result' | 'comparison-result' | 'comparison-confirm';
  loadingText?: string;
}

export default function ChatArea(
  { messages, isTyping, onConfirm, onReanalyze, onRetry, onOpenPanel, onComparisonConfirm }: {
    messages: ChatMessage[];
    isTyping: boolean;
    onConfirm?: (taskType: 'PREDICTION' | 'OPTIMIZATION' | 'COMPARISON', params?: Record<string, number>) => void;
    onReanalyze?: (values: Record<string, number>) => void;
    onRetry?: () => void;
    onOpenPanel?: (historyId: string) => void;
    onComparisonConfirm?: (conditionA: ConditionParams, conditionB: ConditionParams) => void;
  }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastUserRef = useRef<HTMLDivElement | null>(null);

  const lastUserIndex = messages.map(m => m.role).lastIndexOf('user');

  const lastInteractiveIndex = messages.reduce((last, m, i) =>
    m.type === 'param-confirm' || m.type === 'param-error' || m.type === 'comparison-confirm' ? i : last, -1
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
            (msg.type === 'param-confirm' || msg.type === 'param-error' || msg.type === 'comparison-confirm')
              ? index === lastInteractiveIndex
              : true;

          const hasResultAfter = messages
            .slice(index + 1)
            .some(m =>
              m.type === 'prediction-result' ||
              m.type === 'optimization-result' ||
              m.type === 'comparison-result'
            );

            const prevMsg = messages[index - 1];
            const isRoleSwitch = prevMsg && prevMsg.role !== msg.role;

          return (
            <div key={index} className={isRoleSwitch ? 'mt-6' : ''}>
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
                  onOpenPanel={(msg.type === 'prediction-result' || msg.type === 'optimization-result' || msg.type === 'comparison-result') ? onOpenPanel : undefined}
                  disableEdit={msg.type === 'param-confirm' && hasResultAfter}
                  onComparisonConfirm={msg.type === 'comparison-confirm' ? onComparisonConfirm : undefined}
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