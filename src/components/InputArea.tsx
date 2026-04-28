import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { colors, typography } from '../styles/tokens';

interface InputAreaProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  onTextChange?: (text: string) => void;
  onFirstFocus?: () => void;
  isTyping?: boolean;
}

export interface InputAreaHandle {
  focus: () => void;
}

const InputArea = forwardRef<InputAreaHandle, InputAreaProps>(
  ({ onSend, onCancel, onTextChange, onFirstFocus, isTyping }, ref) => {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      onTextChange?.(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };

    const handleSend = () => {
      if (!text.trim() || isTyping) return;
      onSend(text);
      setText('');
      onTextChange?.('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    };

    const handleButtonClick = () => {
      if (isTyping) {
        onCancel?.();
      } else {
        handleSend();
      }
    };

    const canSend = Boolean(text.trim()) && !isTyping;
    const buttonActive = isTyping || canSend;

    return (
      <div className="pb-3 px-6">
        <div className="max-w-3xl mx-auto">
          <div
            className="relative flex flex-col rounded-[18px] overflow-hidden"
            style={{
              backgroundColor: colors.surface.card,
              border: `1px solid ${colors.slate[300]}`,
              boxShadow: '0 4px 5px rgba(0,0,0,0.08)',
            }}
          >
            <textarea
              ref={textareaRef}
              onFocus={onFirstFocus}
              maxLength={500}
              className="w-full bg-transparent px-6 pt-4 resize-none focus:outline-none placeholder:text-slate-400 overflow-y-auto"
              style={{ fontSize: typography.size.md, minHeight: '24px', maxHeight: '200px' }}
              placeholder="압력, 소스 파워, 바이어스 파워 조건을 입력하고 분석 또는 최적화를 요청해 보세요."
              value={text}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex justify-end items-center px-3 pb-3">
              <button
                onClick={handleButtonClick}
                disabled={!buttonActive}
                style={{
                  backgroundColor: isTyping ? '#FFFFFF' : '#FFFFFF',
                  borderRadius: isTyping ? '8px' : '30%',
                  padding: '8px',
                  boxShadow: buttonActive ? '0 0 3px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: buttonActive ? 'pointer' : 'default',
                  opacity: buttonActive ? 1 : 0.45,
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                className="hover:scale-110 hover:shadow-md active:scale-95"
                title={isTyping ? '전송 취소' : '분석 전송'}
              >
                {isTyping ? (
                  // 정지 아이콘 
                  <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
                    <circle cx="9.5" cy="9.5" r="8.5" stroke={colors.slate[500]} strokeWidth="2" />
                    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" fill={colors.slate[500]} />
                  </svg>
                ) : (
                  // 전송 아이콘 
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
                    stroke={canSend ? colors.primary[500] : colors.slate[400]}
                    strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <p className="text-center mt-2 opacity-80"
            style={{ fontSize: typography.size.sm, color: colors.slate[400] }}>
            본 플랫폼의 분석 결과는 의사결정 지원용이며, 중요한 정보는 엔지니어의 확인이 필요합니다.
          </p>
        </div>
      </div>
    );
  }
);

InputArea.displayName = 'InputArea';
export default InputArea;