import { useState, useRef } from 'react';
import PredictionPanel from './components/PredictionPanel';
import OptimizationPanel from './components/OptimizationPanel';
import ChatArea from './components/ChatArea';
import Header from './components/Header';
import InputArea, { type InputAreaHandle } from './components/InputArea';
import Sidebar from './components/Sidebar';
import {
  extractParams, resetSession, setSession,
  fetchSessionMessages, adaptResponse,
  revalidateParams, confirmValidation,
  getCurrentSessionId
} from './api/analysis';
import { colors, typography } from './styles/tokens';
import type { ExtractValidationError, PredictionResult, OptimizationResult } from './types/api';

interface ProcessParams {
  pressure: number;
  source_power: number;
  bias_power: number;
}

export interface PredictionHistoryItem {
  id: string;
  createdAt: Date;
  label: string;
  processParams: ProcessParams;
  predictionData: import('./types/api').PredictionResult;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'default' | 'param-confirm' | 'param-error' | 'error' | 'error-retry' | 'prediction-result' | 'optimization-result';
  loadingText?: string;
}

const WELCOME_MESSAGE =
  `안녕하세요. 플라즈마 Etch 공정 분석 AI입니다.

본 시스템은 **아르곤(Ar) 가스 기반 TCP(Planar ICP) + Bias Power** 인가 장비 환경에서
**압력 (mTorr)**, **소스 파워 (W)**, **바이어스 파워 (W)** 조건을 학습한 모델입니다.

조건을 일부만 알고 있어도 괜찮습니다. 공정에 대해 궁금한 점이 있다면 자유롭게 질문하세요.

아래 형식을 참고하여 입력해 주세요:
  · "압력 8mTorr, 소스 파워 450W, 바이어스 파워 80W 조건 분석해줘"
  · "압력 8mTorr, 소스 파워 450W, 바이어스 파워 80W에서 Etch Rate 높이는 방향으로 최적화해줘"
  · "압력 8mTorr 조건이랑 압력 10mTorr 조건 비교해줘"
  · "ion flux가 뭐야?"`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const isSending = useRef(false);
  const hasWelcomed = useRef(false);
  const lastInput = useRef<string>('');
  const inputAreaRef = useRef<InputAreaHandle>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

  const currentMessageId = useRef<number>(-1);
  const currentValidationId = useRef<number>(-1);
  const lastKnownParams = useRef<Record<string, number>>({});

  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activePanelType, setActivePanelType] = useState<'prediction' | 'optimization' | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionResult | null>(null);
  const [optimizationData] = useState<OptimizationResult | null>(null);
  const [processParams, setProcessParams] = useState<ProcessParams | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(getCurrentSessionId());
  const [sessionRefreshTrigger, setSessionRefreshTrigger] = useState(0);

  const isPredictionPanelOpen = activePanelType === 'prediction';
  const isOptPanelOpen = activePanelType === 'optimization';

  // ── 말풍선 타이핑 효과 ──────────────────────────────
  const typeMessage = (text: string, speed = 18): Promise<void> => {
    return new Promise((resolve) => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: text.slice(0, i) };
          return updated;
        });
        if (i >= text.length) { clearInterval(interval); resolve(); }
      }, speed);
    });
  };

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
        if (i >= fullText.length) { clearInterval(interval); setIsTyping(false); }
      }, 8);
    }, 400);
  };

  // ── 전송 취소 ─────────────────────────────────────────
  const handleCancel = () => {
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.content === '') {
        return [...prev.slice(0, -1), { role: 'assistant', content: '응답이 중지되었습니다.', type: 'default' }];
      }
      return prev;
    });
    setIsTyping(false);
    isSending.current = false;
    setTimeout(() => inputAreaRef.current?.focus(), 50);
  };

  const handleSend = async (content: string) => {
    if (isSending.current) return;
    isSending.current = true;
    lastInput.current = content;

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    setMessages(prev => [
      ...prev,
      { role: 'user', content },
      { role: 'assistant', content: '', type: 'default' },
    ]);

    setIsTyping(true);

    const [{ messageId, validationId, response: result, allParams }] = await Promise.all([
      extractParams(content, ctrl.signal),
      new Promise(r => setTimeout(r, 1200)),
    ]);

    if (messageId !== -1) {
      setActiveSessionId(getCurrentSessionId());
    }

    if (!result.success && 'message' in result && result.message === '__CANCELLED__') {
      isSending.current = false;
      return;
    }

    currentMessageId.current = messageId;
    currentValidationId.current = validationId;
    lastKnownParams.current = allParams;
    setSessionRefreshTrigger(prev => prev + 1)

    if (result.success) {
      await typeMessage(result.message);
      setMessages(prev => [...prev, {
        role: 'assistant', content: JSON.stringify(result), type: 'param-confirm',
      }]);
    } else if (!result.success && 'code' in result && result.code === 'INPUT_VALIDATION_FAILED') {
      const err = result as ExtractValidationError;
      await typeMessage(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant', content: JSON.stringify(err), type: 'param-error',
      }]);
    } else if ('code' in result && result.code === 'INVALID_JSON') {
      await typeMessage('입력을 처리하지 못했습니다. 다시 입력해 주세요.', 14);
      setTimeout(() => inputAreaRef.current?.focus(), 50);
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant', content: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', type: 'error-retry',
      }]);
    }

    setIsTyping(false);
    isSending.current = false;
    abortCtrlRef.current = null;
  };

  // ── 분석 실행 확정 ────────────────────────────────────
  const handleConfirm = async (taskType: 'PREDICTION' | 'OPTIMIZATION', currentParams?: Record<string, number>) => {
    const mId = currentMessageId.current;
    const vId = currentValidationId.current;
    if (mId === -1 || vId === -1) return;

    if (currentParams) {
      const needsRevalidation = Object.entries(currentParams).some(
        ([k, v]) => lastKnownParams.current[k] !== v
      );
      if (needsRevalidation) {
        const { validationId, response } = await revalidateParams(mId, currentParams);
        if (!response.success) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '파라미터 재검증에 실패했습니다. 다시 시도해 주세요.',
            type: 'error-retry',
          }]);
          return;
        }
        currentValidationId.current = validationId;
        lastKnownParams.current = currentParams;
      }
    }

    const loadingText = taskType === 'OPTIMIZATION'
      ? '최적화 분석을 실행하고 있습니다...'
      : '예측 분석을 실행하고 있습니다...';

    setMessages(prev => [...prev, {
      role: 'assistant', content: '', type: 'default', loadingText,
    }]);
    setIsTyping(true);

    const confirmRes = await confirmValidation(mId, currentValidationId.current, taskType);

    setMessages(prev => prev.filter(m => m.loadingText !== loadingText));
    setIsTyping(false);

    if (!confirmRes) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `${taskType === 'OPTIMIZATION' ? '최적화' : '예측'} 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`,
        type: 'error-retry',
      }]);
      return;
    }

    if (confirmRes.executionError) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `${taskType === 'OPTIMIZATION' ? '최적화' : '예측'} 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.`,
        type: 'error-retry',
      }]);
      return;
    }

    if (confirmRes.predictionError) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '예측 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        type: 'error-retry',
      }]);
      return;
    }

    if (taskType === 'OPTIMIZATION') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '최적화 분석이 완료되었습니다.',
        type: 'optimization-result',
      }]);
      setActivePanelType('optimization');
      return;
    }


    if (confirmRes.prediction) {
      const pred = confirmRes.prediction;
      let params: ProcessParams | null = null;
      if (confirmRes.validation?.parameters) {
        const getVal = (key: string) =>
          confirmRes.validation.parameters.find(p => p.key === key)?.value ?? 0;
        params = {
          pressure: getVal('pressure'),
          source_power: getVal('source_power'),
          bias_power: getVal('bias_power'),
        };
      }

      const historyId = `pred-${Date.now()}`;
      const historyItem: PredictionHistoryItem = {
        id: historyId,
        createdAt: new Date(),
        label: params ? `P ${params.pressure}mTorr / SP ${params.source_power}W / BP ${params.bias_power}W` : '예측 결과',
        processParams: params ?? { pressure: 0, source_power: 0, bias_power: 0 },
        predictionData: pred,
      };
      setPredictionHistory(prev => [historyItem, ...prev]);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: JSON.stringify({ historyId, etch_score: pred.prediction_result.etch_score.value, label: historyItem.label }),
        type: 'prediction-result',
      }]);

      setPredictionData(pred);
      if (params) setProcessParams(params);
      setActivePanelType('prediction');
    } 
    else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '예측 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        type: 'error-retry',
      }]);
    }
  };


  // ── 재검증 ────────────────────────────────────────────
  const handleReanalyze = async (values: Record<string, number>) => {
    const mId = currentMessageId.current;
    if (mId === -1) return;

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    const mergedValues = { ...lastKnownParams.current, ...values };

    setMessages(prev => [...prev, { role: 'assistant', content: '', type: 'default' }]);
    setIsTyping(true);

    const [{ validationId, response: result }] = await Promise.all([
      revalidateParams(mId, mergedValues, ctrl.signal),
      new Promise(r => setTimeout(r, 1200)),
    ]);

    if (!result.success && 'message' in result && result.message === '__CANCELLED__') {
      return;
    }

    currentValidationId.current = validationId;
    lastKnownParams.current = mergedValues;

    if (result.success) {
      await typeMessage(result.message);
      setMessages(prev => [...prev, {
        role: 'assistant', content: JSON.stringify(result), type: 'param-confirm',
      }]);
    } else if (!result.success && 'code' in result && result.code === 'INPUT_VALIDATION_FAILED') {
      const err = result as ExtractValidationError;
      await typeMessage(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant', content: JSON.stringify(err), type: 'param-error',
      }]);
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant', content: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', type: 'error-retry',
      }]);
    }

    setIsTyping(false);
    abortCtrlRef.current = null;
  };

  const handleRetry = () => {
    if (!lastInput.current) return;
    handleSend(lastInput.current);
  };

  const handleSelectSession = async (sessionId: string) => {
    setSession(sessionId);
    setActiveSessionId(sessionId);
    hasWelcomed.current = true;
    setIsFocused(true);
    setMessages([]);

    const sessionMessages = await fetchSessionMessages(sessionId);
    const restoredHistory: PredictionHistoryItem[] = [];
    const restored: Message[] = [
      { role: 'assistant', content: WELCOME_MESSAGE },
    ];

    for (const msg of sessionMessages) {
      restored.push({ role: 'user', content: msg.inputText });
      if (!msg.validations || msg.validations.length === 0) continue;

      const lastValidation = msg.validations.at(-1);
      if (lastValidation) {
        currentMessageId.current = msg.messageId;
        currentValidationId.current = lastValidation.validationId;
        lastKnownParams.current = Object.fromEntries(
          lastValidation.parameters
            .filter(p => p.value != null)
            .map(p => [p.key, p.value as number])
        );
      }

      for (const validation of msg.validations) {
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

        if (validation.confirmed && validation.prediction) {
          const pred = validation.prediction;
          const getVal = (key: string) =>
            validation.parameters.find(p => p.key === key)?.value ?? 0;
          const params: ProcessParams = {
            pressure: getVal('pressure'),
            source_power: getVal('source_power'),
            bias_power: getVal('bias_power'),
          };
          const historyId = `pred-${validation.validationId}`;
          const historyItem: PredictionHistoryItem = {
            id: historyId,
            createdAt: new Date(validation.createdAt),
            label: `P ${params.pressure}mTorr / SP ${params.source_power}W / BP ${params.bias_power}W`,
            processParams: params,
            predictionData: pred,
          };
          restoredHistory.push(historyItem);
          restored.push({
            role: 'assistant',
            content: JSON.stringify({ historyId, etch_score: pred.prediction_result.etch_score.value, label: historyItem.label }),
            type: 'prediction-result',
          });
        }
      }
    }
    setPredictionHistory(restoredHistory);
    setMessages(restored);
  };

  return (
    <>
      <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans">
        <Sidebar
          predictionHistory={predictionHistory}
          activeSessionId={activeSessionId}
          onSelectHistory={(item) => {
            setPredictionData(item.predictionData);
            setProcessParams(item.processParams);
            setActivePanelType('prediction');
          }}
          onNewChat={() => {
            setMessages([]);
            hasWelcomed.current = false;
            setIsFocused(false);
            lastKnownParams.current = {};
            resetSession();
            setActiveSessionId(getCurrentSessionId());
          }}
          onSelectSession={handleSelectSession}
          sessionRefreshTrigger={sessionRefreshTrigger}
        />

        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.slate[50] }}>
          <Header onReset={() => {
            setMessages([]);
            hasWelcomed.current = false;
            setIsFocused(false);
            lastKnownParams.current = {};
            resetSession();
            setActiveSessionId(getCurrentSessionId());
          }}
          />
          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.slate[50] }}>
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
                onOpenPanel={(historyId) => {
                  if (historyId === 'optimization') {
                    setActivePanelType('optimization');
                    return;
                  }
                  const item = predictionHistory.find(h => h.id === historyId);
                  if (item) {
                    setPredictionData(item.predictionData);
                    setProcessParams(item.processParams);
                    setActivePanelType('prediction');
                  }
                }}
              />
            )}
            <InputArea
              ref={inputAreaRef}
              onSend={handleSend}
              onCancel={handleCancel}
              onFirstFocus={handleFirstFocus}
              isTyping={isTyping}
            />
          </div>
        </div>

        <PredictionPanel
          isOpen={isPredictionPanelOpen}
          onClose={() => setActivePanelType(null)}
          data={predictionData}
          processParams={processParams}
        />
        <OptimizationPanel
          isOpen={isOptPanelOpen}
          onClose={() => setActivePanelType(null)}
          data={optimizationData}
        />
      </div>
    </>
  );
}