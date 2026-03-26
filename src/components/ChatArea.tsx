import { useState, useEffect, useRef } from 'react';
import ChatTypes from './chatTypes'; // 아까 만든 컴포넌트 임포트

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatArea({ messages }: { messages: ChatMessage[] }) {
  const [now, setNow] = useState(() => new Date());
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* 상단 시간 표시 */}
        <div className="text-center mb-8">
          <p className="text-xs text-slate-400">현재 세션</p>
          <p className="text-sm text-slate-500 font-medium">
            {now.toLocaleDateString('ko-KR', { 
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' 
            })}
          </p>
        </div>

        {/* 메시지 목록 출력 */}
        {messages.map((msg, index) => (
          <ChatTypes key={index} role={msg.role} content={msg.content} />
        ))}
        
        {/* 자동 스크롤을 위한 빈 태그 */}
        <div ref={endRef} />
      </div>
    </div>
  );
}