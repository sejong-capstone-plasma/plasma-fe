import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { colors, typography } from '../styles/tokens';

interface InputAreaProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  onTextChange?: (text: string) => void;
  onFirstFocus?: () => void;
  isTyping?: boolean;
  showChips?: boolean;
}

export interface InputAreaHandle {
  focus: () => void;
}

const InputArea = forwardRef<InputAreaHandle, InputAreaProps>(
  ({ onSend, onCancel, onTextChange, onFirstFocus, isTyping, showChips }, ref) => {
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

    const CHIPS = [
      { label: '예측 분석', text: '압력 8mTorr, 소스 파워 450W, 바이어스 파워 120W 조건 예측해줘' },
      { label: '최적화', text: '압력 8mTorr, 소스 파워 450W, 바이어스 파워 120W에서 Etch Rate 높이는 방향으로 최적화해줘' },
      { label: '비교 분석', text: '압력 8mTorr 조건이랑 압력 10mTorr 조건 비교해줘' },
    ];

    return (
      <div className="pb-3 px-5">
        <div className="max-w-3xl mx-auto">

          {showChips && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => {
                    setText(chip.text);
                    onTextChange?.(chip.text);
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
                      textareaRef.current.focus();
                    }
                  }}
                  style={{
                    fontSize: typography.size.base,
                    color: colors.slate[500],
                    backgroundColor: colors.surface.white,
                    border: `1px solid ${colors.slate[400]}`,
                    borderRadius: '999px',
                    padding: '5px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = colors.primary[50];
                    e.currentTarget.style.borderColor = colors.primary[400];
                    e.currentTarget.style.color = colors.primary[600];
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = colors.surface.white;
                    e.currentTarget.style.borderColor = colors.slate[300];
                    e.currentTarget.style.color = colors.slate[500];
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div
            className="relative flex flex-col rounded-[24px] overflow-hidden"
            style={{
              backgroundColor: colors.surface.card,
              border: `0.5px solid ${colors.slate[300]}`,
              boxShadow: '0 3px 5px rgba(0,0,0,0.05)',
            }}
          >
            <textarea
              ref={textareaRef}
              onFocus={onFirstFocus}
              maxLength={500}
              rows={1}
              className="w-full bg-transparent py-2 px-5 pt-4 resize-none focus:outline-none placeholder:text-slate-400 overflow-y-auto"
              style={{ fontSize: typography.size.md, minHeight: '24px', maxHeight: '200px' }}
              placeholder="분석하고 싶은 조건을 입력해 보세요..."
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

            <div className="flex justify-end items-center px-3.5 pb-3.5">
              <button
                onClick={handleButtonClick}
                disabled={!buttonActive}
                style={{
                  backgroundColor: isTyping ? '#FFFFFF' : colors.primary[500],
                  borderRadius: '10px',
                  padding: '8px',
                  border: `1px solid ${colors.slate[300]}`,
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
                    stroke={canSend ? colors.slate[50] : colors.slate[400]}
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="6 10 12 5 18 10" />
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