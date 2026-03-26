interface ChatProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function chatTypes({ role, content }: ChatProps) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8 w-full`}>
      <div
        className={`transition-all ${
          isUser 
            ? 'max-w-[80%] p-4 rounded-2xl border bg-blue-50/40 border-blue-100 text-slate-800' 
            : 'max-w-[92%] px-6 py-2 text-slate-900 ml-4' // AI 답변은 말풍선 없이 넓게 사용하도록 설정
        }`}
      >
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}