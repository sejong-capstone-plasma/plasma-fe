import { useState, useRef } from 'react';
import ChatArea from './components/ChatArea';
import Header from './components/Header';
import InputArea, { type InputAreaHandle } from './components/InputArea';
import Sidebar from './components/Sidebar';
import { extractParams, resetSession, setSession, fetchSessionMessages, adaptResponse } from './api/analysis';
import { colors, typography } from './styles/tokens';
import type { ExtractValidationError } from './types/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'default' | 'param-confirm' | 'param-error' | 'error' | 'error-retry';
}

const WELCOME_MESSAGE =
  `안녕하세요. 플라즈마 Etch 공정 분석 AI입니다.

본 시스템은 **아르곤(Ar) 가스 기반 TCP(Planar ICP) + Bias Power** 인가 장비 환경에서
공정 조건을 분석하고 최적화 방향을 제안합니다.

분석을 위해 아래 3가지 조건을 필수로 입력해 주세요:
  · **압력 (단위: mTorr)**   
  · **소스 파워 (단위: W)**         
  · **바이어스 파워 (단위: W)**
     
아래 형식을 참고해서 입력해 주세요:
  · "압력 8mTorr, 소스 파워 450W, 바이어스 파워 80W 조건 분석해줘"
  · "압력 8mTorr, 소스 파워 450W, 바이어스 파워 80W에서 Etch Rate 높이는 방향으로 최적화해줘"`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const isSending = useRef(false);
  const hasWelcomed = useRef(false);
  const lastInput = useRef<string>('');
  const inputAreaRef = useRef<InputAreaHandle>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const handleFirstFocus = () => {
    if (hasWelcomed.current) return;
    hasWelcomed.current = true;
    setIsFocused(true);

    setTimeout(() => {
      let i = 0;
      const fullText = WELCOME_MESSAGE;
      setMessages([{ role: 'assistant', content: '' }]);
      setIsTyping(true);

      const interval = setInterval(() => {
        i++;
        setMessages([{ role: 'assistant', content: fullText.slice(0, i) }]);
        if (i >= fullText.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 8);
    }, 400);
  };

  // ── 말풍선 타이핑 효과 ──────────────────────────────
  const typeMessage = (text: string, speed = 18): Promise<void> => {
    return new Promise((resolve) => {
      let i = 0;
      // 빈 말풍선 먼저 추가
      setMessages(prev => [...prev, { role: 'assistant', content: '', type: 'default' }]);

      const interval = setInterval(() => {
        i++;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: text.slice(0, i),
          };
          return updated;
        });
        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  };

  const handleSend = async (content: string) => {
    if (isSending.current) return;
    isSending.current = true;
    lastInput.current = content;

    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsTyping(true);

    // 최소 1.2초 로딩 + API 호출 병렬
    const [result] = await Promise.all([
      extractParams(content),
      new Promise(r => setTimeout(r, 1200)),
    ]);

    if (result.success) {
      await typeMessage(result.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: JSON.stringify(result),
        type: 'param-confirm',
      }]);

    } else if (!result.success && 'code' in result && result.code === 'INPUT_VALIDATION_FAILED') {
      const err = result as ExtractValidationError;
      await typeMessage(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: JSON.stringify(err),
        type: 'param-error',
      }]);

    } else if ('code' in result && result.code === 'INVALID_JSON') {
      await typeMessage('입력을 처리하지 못했습니다. 다시 입력해 주세요.', 14);
      setTimeout(() => inputAreaRef.current?.focus(), 50);

    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        type: 'error-retry',
      }]);
    }

    setIsTyping(false);
    isSending.current = false;
  };

  const handleConfirm = () => {
    // TODO: 백엔드 연동 후 예측/최적화 API 호출 로직 구현
    console.log('확인 버튼 클릭 — 다음 단계 진행');
  };

  const handleReanalyze = (values: Record<string, number>) => {
    // TODO: 백엔드 연동 후 수정된 파라미터로 재분석 API 호출
    console.log('재분석 실행 — 수정된 파라미터:', values);
  };

  const handleRetry = () => {
    if (!lastInput.current) return;
    handleSend(lastInput.current);
  };

  const handleSelectSession = async (sessionId: string) => {
    // 세션 전환 — 해당 세션 ID로 설정하고 메시지 복원
    setSession(sessionId);
    hasWelcomed.current = true;
    setIsFocused(true);
    setMessages([]);

    const sessionMessages = await fetchSessionMessages(sessionId);
    const restored: Message[] = [];

    for (const msg of sessionMessages) {
      // 유저 메시지
      restored.push({ role: 'user', content: msg.inputText });
      console.log('sessionId:', sessionId);
      console.log('sessionMessages:', sessionMessages);

      // AI 응답 복원
      const validation = msg.validations?.[0];
      if (!validation) continue;

      const result = adaptResponse(validation);
      if (result.success) {
        restored.push({ role: 'assistant', content: result.message, type: 'default' });
        restored.push({ role: 'assistant', content: JSON.stringify(result), type: 'param-confirm' });
      } else if ('code' in result && result.code === 'INPUT_VALIDATION_FAILED') {
        restored.push({ role: 'assistant', content: result.message, type: 'default' });
        restored.push({ role: 'assistant', content: JSON.stringify(result), type: 'param-error' });
      } else {
        restored.push({ role: 'assistant', content: result.message, type: 'error' });
      }
    }

    setMessages(restored);
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans">
      <Sidebar
        onNewChat={() => {
          setMessages([]);
          hasWelcomed.current = false;
          setIsFocused(false);
          resetSession();
        }}
        onSelectSession={handleSelectSession}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex flex-col overflow-hidden px-8">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <h1
                className="font-light tracking-tight"
                style={{
                  fontSize: typography.size.xl,
                  color: colors.slate[400],
                  animation: isFocused
                    ? 'fadeOut 0.4s ease forwards'
                    : 'fadeIn 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                }}
              >
                지금 어떤 조건을 분석하시겠습니까 ?
              </h1>
            </div>
          ) : (
            <ChatArea
              messages={messages}
              isTyping={isTyping}
              onConfirm={handleConfirm}
              onReanalyze={handleReanalyze}
              onRetry={handleRetry}
            />
          )}

          <InputArea
            ref={inputAreaRef}
            onSend={handleSend}
            onFirstFocus={handleFirstFocus}
            isTyping={isTyping}
          />
        </div>
      </div>
    </div>
  );
}