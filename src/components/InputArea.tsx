import { useState } from 'react';

interface InputAreaProps {
  onSend: (message: string) => void;
}

export default function InputArea({ onSend }: InputAreaProps) {
  const [text, setText] = useState('');

  const normalizedText = text.toLowerCase().trim();

  const isPressureDetected =
    /\d+\s*(mtorr|pa|torr)/.test(normalizedText) ||
    ['pressure', '압력', '기압', '프레셔'].some(k => normalizedText.includes(k));

  const isSourceDetected =
    /(source|소스|rf|icp)\s*power?\s*[:=]?\s*\d+\s*w/.test(normalizedText) ||
    /\d+\s*w\s*(source|소스|rf|icp)/.test(normalizedText) ||
    ['source power', '소스 파워', '소스파워', 'source pw'].some(k => normalizedText.includes(k));

  const isBiasDetected =
    /(bias)\s*power?\s*[:=]?\s*\d+\s*w/.test(normalizedText) ||
    /\d+\s*w\s*(bias)/.test(normalizedText) ||
    ['bias power', '바이어스 파워', '바이어스파워', 'bias pw'].some(k => normalizedText.includes(k));

  const isIontempDetected =
    /\d+\s*(ev|k)\b/.test(normalizedText) ||
    ['ion temp', 'ion temperature', '이온 온도', '이온온도', '온도', 'ti'].some(k => normalizedText.includes(k));

  const isIondensityDetected =
    /\d+(\.\d+)?\s*[eE]\s*\d+\s*(cm|m)/.test(normalizedText) ||
    ['ion density', '이온 밀도', '이온밀도', '밀도', 'ni', 'nd'].some(k => normalizedText.includes(k));

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="pb-8 pt-2 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        
        <div className="flex gap-2 mb-4 ml-2 overflow-x-auto no-scrollbar py-1">
          <ParameterChip label="Pressure" isDetected={isPressureDetected} />
          <ParameterChip label="Source Power" isDetected={isSourceDetected} />
          <ParameterChip label="Bias Power" isDetected={isBiasDetected} />
          <div className="w-[1px] h-3 bg-slate-200 mx-1 self-center" />
          <ParameterChip label="Ion temp" isDetected={isIontempDetected} />
          <ParameterChip label="Ion density" isDetected={isIondensityDetected} />
        </div>

        <div className="relative flex flex-col bg-slate-50 border border-slate-200 rounded-[28px] shadow-sm focus-within:shadow-md transition-shadow">
          <textarea
            className="w-full bg-transparent px-6 pt-5 pb-14 text-[15px] resize-none focus:outline-none placeholder:text-slate-400 overflow-y-auto"
            style={{ minHeight: '140px' }} 
            placeholder="분석할 공정 조건과 최적화 목표를 입력해 주세요."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <div className="absolute right-6 bottom-5 flex items-center gap-4 text-slate-400">
            <button className="hover:text-blue-600 transition-colors" title="파일 업로드">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </button>
            <button 
              onClick={handleSend}
              className={`${text.trim() ? 'text-blue-600' : 'text-slate-300'} transition-colors`}
              title="분석 전송"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>

          <div className="absolute left-6 bottom-5 text-[11px] text-slate-400 font-medium tracking-tighter">
            {text.length} / 500
          </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
          본 플랫폼의 분석 결과는 의사결정 지원용이며, 중요한 정보는 엔지니어의 확인이 필요합니다.
        </p>
      </div>
    </div>
  );
}

function ParameterChip({ label, isDetected }: { label: string; isDetected: boolean }) {
  return (
    <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-semibold transition-all border ${
      isDetected 
        ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
        : 'bg-white border-slate-200 text-slate-500 opacity-100'
    }`}>
      {label} {isDetected ? '●' : '○'}
    </span>
  );
}