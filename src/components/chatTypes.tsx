import { useState } from 'react';
import { colors, typography } from '../styles/tokens';
import type { ExtractSuccessResponse, ExtractValidationError } from '../types/api';

interface ChatProps {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  isLastAssistant?: boolean;
  isLatest?: boolean;
  type?: 'default' | 'param-confirm' | 'param-error' | 'error' | 'error-retry' | 'prediction-result';
  onConfirm?: (taskType: 'PREDICTION' | 'OPTIMIZATION', params?: Record<string, number>) => void;
  onReanalyze?: (values: Record<string, number>) => void;
  onRetry?: () => void;
  loadingText?: string;
  onOpenPanel?: (historyId: string) => void;
  disableEdit?: boolean;
}

// ── 마크다운 굵기 파싱 ──────────────────────────────────
const renderContent = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: colors.slate[900] }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

// ── 파라미터 확인 카드 ──────────────────────────────────
const PARAM_LABEL: Record<string, string> = {
  pressure: '압력',
  source_power: '소스 파워',
  bias_power: '바이어스 파워',
};

const PARAM_UNIT: Record<string, string> = {
  pressure: 'mTorr',
  source_power: 'W',
  bias_power: 'W',
};

const PARAM_RANGE: Record<string, string> = {
  pressure: '2 ~ 10 mTorr',
  source_power: '100 ~ 500 W',
  bias_power: '0 ~ 1000 W',
};

type ParamMap = Record<string, { value: number; unit: string; status: 'VALID' }>;

function ParamConfirmCard({ data, onConfirm, isLatest, disableEdit = false }: {
  data: ExtractSuccessResponse;
  onConfirm?: (taskType: 'PREDICTION' | 'OPTIMIZATION', params?: Record<string, number>) => void;
  isLatest?: boolean;
  disableEdit?: boolean;
}) {
  const [params, setParams] = useState<ParamMap>(
    data.process_params as unknown as ParamMap
  );
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startEdit = (key: string, currentValue: number) => {
    if (!isLatest) return;
    setEditingField(key);
    setEditValue(String(currentValue));
  };

  const commitEdit = (key: string) => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      setParams(prev => ({ ...prev, [key]: { ...prev[key], value: parsed } }));
    }
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);
  const entries = Object.entries(params) as [string, { value: number; unit: string }][];

  return (
    <div style={{
      border: `1.5px solid ${colors.slate[200]}`,
      borderRadius: '10px',
      padding: '12px 14px',
      backgroundColor: colors.surface.card,
      maxWidth: '400px',
      minWidth: '280px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      opacity: isLatest ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px' }}>
        <span style={{
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
          color: colors.primary[600],
          backgroundColor: colors.primary[50],
          padding: '2px 8px',
          borderRadius: '4px',
          border: `1px solid ${colors.primary[100]}`,
        }}>
          파라미터 확인
        </span>
      </div>

      {entries.map(([key, field], idx) => (
        <div key={key}>
          {idx > 0 && <div style={{ height: '1px', backgroundColor: colors.slate[200] }} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 2px' }}>
            <span style={{ fontSize: typography.size.sm, color: colors.slate[500], minWidth: '80px' }}>
              {PARAM_LABEL[key] ?? key}
            </span>
            {editingField === key ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  autoFocus type="number" value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(key); if (e.key === 'Escape') cancelEdit(); }}
                  style={{
                    width: '72px', fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium, color: colors.slate[900],
                    border: `1px solid ${colors.primary[400]}`, borderRadius: '5px',
                    padding: '3px 7px', outline: 'none', backgroundColor: colors.surface.white, textAlign: 'right',
                  }}
                />
                <span style={{ fontSize: typography.size.xs, color: colors.slate[400] }}>{field.unit}</span>
                <button onClick={() => commitEdit(key)} style={{ fontSize: typography.size.xs, color: colors.primary[600], background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontWeight: typography.weight.medium }}>저장</button>
                <button onClick={cancelEdit} style={{ fontSize: typography.size.xs, color: colors.slate[400], background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>취소</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.slate[900] }}>
                  {field.value}{' '}
                  <span style={{ color: colors.slate[400], fontWeight: typography.weight.regular }}>{field.unit}</span>
                </span>
                {isLatest && !disableEdit && (
                  <button onClick={() => startEdit(key, field.value)} title="수정"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: colors.slate[400], borderRadius: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = colors.slate[700])}
                    onMouseLeave={e => (e.currentTarget.style.color = colors.slate[400])}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: `1px solid ${colors.slate[200]}` }}>
        <button
          onClick={() => {
            const currentValues = Object.fromEntries(
              entries.map(([k, v]) => [k, v.value])
            );
            onConfirm?.('PREDICTION', currentValues);
          }}
          disabled={!isLatest}
          style={{
            fontSize: typography.size.xs, fontWeight: typography.weight.medium,
            color: colors.surface.white,
            backgroundColor: isLatest ? colors.primary[500] : colors.slate[300],
            border: 'none', borderRadius: '6px', padding: '6px 14px',
            cursor: isLatest ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => { if (isLatest) e.currentTarget.style.backgroundColor = colors.primary[600]; }}
          onMouseLeave={e => { if (isLatest) e.currentTarget.style.backgroundColor = colors.primary[500]; }}>
          예측
        </button>
        <button
          onClick={() => {
            const currentValues = Object.fromEntries(
              entries.map(([k, v]) => [k, v.value])
            );
            onConfirm?.('OPTIMIZATION', currentValues);
          }}
          disabled={!isLatest}
          style={{
            fontSize: typography.size.xs, fontWeight: typography.weight.medium,
            color: colors.surface.white,
            backgroundColor: isLatest ? colors.primary[500] : colors.slate[300],
            border: 'none', borderRadius: '6px', padding: '6px 14px',
            cursor: isLatest ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => { if (isLatest) e.currentTarget.style.backgroundColor = colors.primary[600]; }}
          onMouseLeave={e => { if (isLatest) e.currentTarget.style.backgroundColor = colors.primary[500]; }}>
          최적화
        </button>
      </div>
    </div>
  );
}

// ── 파라미터 오류 카드 ──────────────────────────────────
const FIELD_LABEL: Record<string, string> = {
  pressure: '압력',
  source_power: '소스 파워',
  bias_power: '바이어스 파워',
};

function ParamErrorCard({ data, onReanalyze, isLatest }: {
  data: ExtractValidationError;
  onReanalyze?: (values: Record<string, number>) => void;
  isLatest?: boolean;
}) {
  const reenterFields = [...data.missing_fields, ...data.ambiguous_fields];
  const [inputValues, setInputValues] = useState<Record<string, string>>(
    Object.fromEntries(reenterFields.map(f => [f, '']))
  );

  const handleReanalyze = () => {
    if (!isLatest) return;
    const parsed: Record<string, number> = {};
    for (const f of reenterFields) {
      const v = parseFloat(inputValues[f]);
      if (isNaN(v)) return;
      parsed[f] = v;
    }
    onReanalyze?.(parsed);
  };

  const PARAM_MIN: Record<string, number> = {
    pressure: 2,
    source_power: 100,
    bias_power: 0,
  };
  const PARAM_MAX: Record<string, number> = {
    pressure: 10,
    source_power: 500,
    bias_power: 1000,
  };

  const isInRange = (f: string, val: string) => {
    const v = parseFloat(val);
    if (isNaN(v)) return false;
    const min = PARAM_MIN[f];
    const max = PARAM_MAX[f];
    if (min !== undefined && v < min) return false;
    if (max !== undefined && v > max) return false;
    return true;
  };

  const allFilled = isLatest && reenterFields.every(f =>
    inputValues[f].trim() !== '' && isInRange(f, inputValues[f])
  );

  return (
    <div style={{
      border: `1.5px solid ${colors.slate[200]}`,
      borderRadius: '10px',
      padding: '12px 14px',
      backgroundColor: colors.surface.card,
      maxWidth: '400px',
      minWidth: '280px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      opacity: isLatest ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
          color: colors.primary[600],
          backgroundColor: colors.primary[50],
          padding: '2px 8px',
          borderRadius: '4px',
          border: `1px solid ${colors.primary[100]}`,
        }}>
          확인이 필요한 항목
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {reenterFields.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: typography.size.xs, color: colors.slate[500], minWidth: '72px', flexShrink: 0 }}>
              {FIELD_LABEL[f] ?? f}
            </span>
            <input
              type="number"
              placeholder={PARAM_RANGE[f] ?? `수치 입력 (${PARAM_UNIT[f] ?? ''})`}
              value={inputValues[f]}
              disabled={!isLatest}
              onChange={e => {
                setInputValues(prev => ({ ...prev, [f]: e.target.value }));
                e.currentTarget.style.borderColor = isInRange(f, e.target.value)
                  ? colors.slate[300]
                  : colors.semantic.error;
              }}
              onKeyDown={e => { if (e.key === 'Enter' && allFilled) handleReanalyze(); }}
              style={{
                flex: 1,
                fontSize: typography.size.sm,
                color: colors.slate[900],
                border: `1px solid ${colors.slate[300]}`,
                borderRadius: '6px',
                padding: '5px 10px',
                outline: 'none',
                backgroundColor: isLatest ? colors.surface.white : colors.slate[100],
                transition: 'border-color 0.15s',
                cursor: isLatest ? 'text' : 'default',
              }}
              onFocus={e => {
                if (isLatest) e.currentTarget.style.borderColor = isInRange(f, inputValues[f])
                  ? colors.primary[400]
                  : colors.semantic.error;
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = inputValues[f] && !isInRange(f, inputValues[f])
                  ? colors.semantic.error
                  : colors.slate[300];
              }}
            />
            <span style={{ fontSize: typography.size.xs, color: colors.slate[400], flexShrink: 0 }}>
              {PARAM_UNIT[f] ?? ''}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: `1px solid ${colors.slate[200]}` }}>
        <button
          onClick={handleReanalyze}
          disabled={!allFilled}
          style={{
            fontSize: typography.size.xs,
            fontWeight: typography.weight.medium,
            color: colors.surface.white,
            backgroundColor: allFilled ? colors.primary[500] : colors.slate[300],
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            cursor: allFilled ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => { if (allFilled) e.currentTarget.style.backgroundColor = colors.primary[600]; }}
          onMouseLeave={e => { if (allFilled) e.currentTarget.style.backgroundColor = colors.primary[500]; }}
        >
          수정
        </button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function ChatTypes({ role, content, isTyping, isLastAssistant, isLatest = true, type = 'default', onConfirm, onReanalyze, onRetry, loadingText, disableEdit, onOpenPanel }: ChatProps) {
  const isUser = role === 'user';
  const isWaiting = isTyping && content === '';
  const isResponding = isTyping && content !== '';
  const PERIMETER = 56;

  const renderBody = () => {
    if (type === 'param-confirm') {
      try {
        const data = JSON.parse(content) as ExtractSuccessResponse;
        return <ParamConfirmCard data={data} onConfirm={onConfirm} isLatest={isLatest} disableEdit={disableEdit} />;
      } catch {
        return <span style={{ color: colors.semantic.error }}>파라미터 파싱 오류</span>;
      }
    }
    if (type === 'param-error') {
      try {
        const data = JSON.parse(content) as ExtractValidationError;
        return <ParamErrorCard data={data} onReanalyze={onReanalyze} isLatest={isLatest} />;
      } catch {
        return <span style={{ color: colors.semantic.error }}>오류 파싱 실패</span>;
      }
    }
    if (type === 'prediction-result') {
      try {
        const { historyId, etch_score, label } = JSON.parse(content);
        return (
          <div style={{
            border: `1px solid ${colors.slate[300]}`,
            borderRadius: '10px',
            padding: '12px 14px',
            backgroundColor: colors.surface.card,
            maxWidth: '400px',
            minWidth: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{
                fontSize: typography.size.xs, fontWeight: typography.weight.medium,
                color: colors.primary[600], backgroundColor: colors.primary[50],
                padding: '2px 8px', borderRadius: '4px', border: `1px solid ${colors.primary[100]}`,
                alignSelf: 'flex-start',
              }}>
                예측 완료
              </span>
              <span style={{ fontSize: typography.size.sm, color: colors.slate[700], marginTop: '2px' }}>
                {label}
              </span>
              <span style={{ fontSize: typography.size.xs, color: colors.slate[400] }}>
                Etch Score <span style={{ fontWeight: typography.weight.medium, color: colors.slate[700] }}>{Number(etch_score.toFixed(1))}</span> / 100
              </span>
            </div>
            <button
              onClick={() => onOpenPanel?.(historyId)}
              style={{
                fontSize: typography.size.xs, fontWeight: typography.weight.medium,
                color: colors.surface.white, backgroundColor: colors.primary[500],
                border: 'none', borderRadius: '6px', padding: '6px 14px',
                cursor: 'pointer', flexShrink: 0, transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.primary[600])}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary[500])}
            >
              결과 보기
            </button>
          </div>
        );
      } catch {
        return null;
      }
    }
    if (type === 'error') {
      return (
        <span style={{ color: colors.semantic.error, fontSize: typography.size.md }}>
          {content}
        </span>
      );
    }
    if (type === 'error-retry') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: colors.semantic.error, fontSize: typography.size.md }}>
            {content}
          </span>
          <button
            onClick={onRetry}
            title="재시도"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              width: '28px', height: '28px',
              borderRadius: '50%',
              border: `1px solid ${colors.semantic.errorBorder}`,
              backgroundColor: colors.semantic.errorBg,
              cursor: 'pointer',
              color: colors.semantic.error,
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.semantic.errorBorder)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.semantic.errorBg)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      );
    }
    return (
      <div style={{ fontSize: typography.size.md, lineHeight: typography.lineHeight.normal }} className="whitespace-pre-wrap">
        {renderContent(content)}
      </div>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1 w-full`}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1);    opacity: 0.75; }
          50%       { transform: scale(1.28); opacity: 1;    }
        }
        @keyframes spinBorder {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -${PERIMETER}; }
        }
      `}</style>

      <div
        className={`transition-all ${isUser ? 'max-w-[80%] px-4 py-2 rounded-2xl' : 'max-w-[100%] py-2 ml-1'}`}
        style={isUser ? { backgroundColor: colors.primary[100], borderColor: colors.primary[100], color: colors.slate[700] } : { color: colors.slate[900] }}
      >
        {renderBody()}

        {!isUser && isLastAssistant && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}>
            {!isWaiting && !isResponding && (
              <div style={{ width: '16px', height: '16px', backgroundColor: colors.primary[500], borderRadius: '6px' }} />
            )}
            {isWaiting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: colors.primary[500], borderRadius: '6px', animation: 'breathe 1.8s ease-in-out infinite', flexShrink: 0 }} />
                {loadingText && (
                  <span style={{ fontSize: typography.size.sm, color: colors.slate[400] }}>
                    {loadingText}
                  </span>
                )}
              </div>
            )}
            {isResponding && (
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block', overflow: 'visible' }}>
                <rect x="0" y="0" width="16" height="16" rx="5" fill={colors.primary[500]} opacity="0.18" />
                <rect x="1" y="1" width="14" height="14" rx="6" fill="none" stroke={colors.primary[500]} strokeWidth="1.5"
                  strokeDasharray={`${PERIMETER * 0.35} ${PERIMETER * 0.65}`}
                  style={{ animation: 'spinBorder 1s linear infinite' }} />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
}