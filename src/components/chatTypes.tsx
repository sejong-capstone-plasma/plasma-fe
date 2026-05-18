import { useState } from 'react';
import { colors, typography } from '../styles/tokens';
import type {
  ExtractComparisonResponse, ExtractSuccessResponse,
  ExtractValidationError, BackendParamField, ConditionParams
} from '../types/api';

interface ChatProps {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  isLastAssistant?: boolean;
  isLatest?: boolean;
  type?: 'default' | 'param-confirm' | 'param-error' | 'error' | 'error-retry'
  | 'prediction-result' | 'optimization-result' | 'comparison-result' | 'comparison-confirm';
  onConfirm?: (taskType: 'PREDICTION' | 'OPTIMIZATION' | 'COMPARISON', params?: Record<string, number>) => void;
  onReanalyze?: (values: Record<string, number>) => void;
  onRetry?: () => void;
  nOpenPanel?: (historyId: string) => void;
  onOpenPanel?: (historyId: string) => void;
  loadingText?: string;
  disableEdit?: boolean;
  onComparisonConfirm?: (conditionA: ConditionParams, conditionB: ConditionParams) => void;
}

// ── 마크다운 굵기 파싱 ──────────────────────────────────
const renderContent = (text: string) => {
  const converted = text
    .replace(/cm\^-2/g, 'cm⁻²')
    .replace(/s\^-1/g, 's⁻¹')
    .replace(/cm\^-3/g, 'cm⁻³')
    .replace(/eV/g, 'eV')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^-1/g, '⁻¹')
    .replace(/\^-2/g, '⁻²');
  const parts = converted.split(/(\*\*[^*]+\*\*|[A-Za-z0-9][A-Za-z0-9_.+\-^*/×÷=<>%()[\]{}@#~²³°±⁻¹²³]*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 600, color: colors.slate[900] }}>{part.slice(2, -2)}</strong>;
    }
    if (/^[A-Za-z0-9]/.test(part)) {
      return <strong key={i} style={{ fontWeight: 600, color: colors.slate[900] }}>{part}</strong>;
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
  pressure: '2 ~ 10',
  source_power: '100 ~ 500',
  bias_power: '0 ~ 1000',
};

type ParamMap = Record<string, { value: number; unit: string; status: 'VALID' }>;

function ParamConfirmCard({ data, onConfirm, isLatest, disableEdit = false }: {
  data: ExtractSuccessResponse;
  onConfirm?: (taskType: 'PREDICTION' | 'OPTIMIZATION' | 'COMPARISON', params?: Record<string, number>) => void;
  isLatest?: boolean;
  disableEdit?: boolean;
}) {
  const [params, setParams] = useState<ParamMap>(data.process_params as unknown as ParamMap);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');


  const startEdit = (key: string, currentValue: number) => {
    if (!isLatest) return;
    setEditingField(key);
    setEditValue(String(currentValue));
  };

  const PARAM_MIN: Record<string, number> = { pressure: 2, source_power: 100, bias_power: 0 };
  const PARAM_MAX: Record<string, number> = { pressure: 10, source_power: 500, bias_power: 1000 };

  const isInRange = (key: string, val: number) => {
    if (PARAM_MIN[key] !== undefined && val < PARAM_MIN[key]) return false;
    if (PARAM_MAX[key] !== undefined && val > PARAM_MAX[key]) return false;
    return true;
  };

  const commitEdit = (key: string) => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && isInRange(key, parsed)) {
      setParams(prev => ({ ...prev, [key]: { ...prev[key], value: parsed } }));
    }
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);
  const entries = Object.entries(params) as [string, { value: number; unit: string }][];
  const taskType = data.task_type;

  return (
    <div style={{
      border: `0.5px solid ${colors.slate[300]}`,
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
                    border: `1px solid ${!isNaN(parseFloat(editValue)) && !isInRange(key, parseFloat(editValue))
                      ? colors.semantic.error
                      : colors.primary[400]}`,
                    borderRadius: '5px',
                    padding: '3px 7px', outline: 'none', backgroundColor: colors.surface.white, textAlign: 'right',
                  }}
                />
                <span style={{ fontSize: typography.size.xs, color: colors.slate[400] }}>{field.unit}</span>
                <button
                  onClick={() => commitEdit(key)}
                  onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                  style={{ fontSize: typography.size.xs, color: colors.primary[600], background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontWeight: typography.weight.medium }}>저장</button>
                <button
                  onClick={cancelEdit}
                  onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                  style={{ fontSize: typography.size.xs, color: colors.slate[400], background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>취소</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.slate[900] }}>
                  {field.value}{' '}
                  <span style={{ color: colors.slate[400], fontWeight: typography.weight.regular }}>{field.unit}</span>
                </span>
                {isLatest && !disableEdit && (
                  <button onClick={() => startEdit(key, field.value)} title="수정"
                    onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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
        {(taskType === 'PREDICTION' || taskType === 'UNSUPPORTED' || !taskType) && (
          <button
            onClick={() => {
              const currentValues = Object.fromEntries(entries.map(([k, v]) => [k, v.value]));
              onConfirm?.('PREDICTION', currentValues);
            }}
            onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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
        )}
        {(taskType === 'OPTIMIZATION' || taskType === 'UNSUPPORTED' || !taskType) && (
          <button
            onClick={() => {
              const currentValues = Object.fromEntries(entries.map(([k, v]) => [k, v.value]));
              onConfirm?.('OPTIMIZATION', currentValues);
            }}
            onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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
        )}
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
  const reenterFields = [...data.missing_fields, ...data.ambiguous_fields, ...data.out_of_range_fields];
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
      border: `0.5px solid ${colors.slate[300]}`,
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
          onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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

function ComparisonConfirmCard({ data, onComparisonConfirm, isLatest }: {
  data: ExtractComparisonResponse;
  onComparisonConfirm?: (conditionA: ConditionParams, conditionB: ConditionParams) => void;
  isLatest?: boolean;
}) {
  const initParams = (params: BackendParamField[]) =>
    Object.fromEntries(params.map(p => [
      p.key,
      {
        value: (p.status === 'MISSING' || p.status === 'OUT_OF_RANGE') ? '' : String(p.value ?? ''),
        unit: p.unit,
        status: p.status,
      }
    ]));

  const [paramsA, setParamsA] = useState<Record<string, { value: string; unit: string; status: string }>>(
    initParams(data.conditionA?.parameters ?? [])
  );
  const [paramsB, setParamsB] = useState<Record<string, { value: string; unit: string; status: string }>>(
    initParams(data.conditionB?.parameters ?? [])
  );

  const PARAM_MIN: Record<string, number> = { pressure: 2, source_power: 100, bias_power: 0 };
  const PARAM_MAX: Record<string, number> = { pressure: 10, source_power: 500, bias_power: 1000 };

  const isInRange = (key: string, val: string) => {
    const v = parseFloat(val);
    if (isNaN(v)) return false;
    if (PARAM_MIN[key] !== undefined && v < PARAM_MIN[key]) return false;
    if (PARAM_MAX[key] !== undefined && v > PARAM_MAX[key]) return false;
    return true;
  };

  const allFilled = isLatest &&
    Object.entries(paramsA).every(([k, v]) => v.value.trim() !== '' && isInRange(k, v.value)) &&
    Object.entries(paramsB).every(([k, v]) => v.value.trim() !== '' && isInRange(k, v.value));

  const handleConfirm = () => {
    if (!allFilled) return;
    const toConditionParams = (params: Record<string, { value: string; unit: string; status: string }>): ConditionParams => ({
      pressure: { value: parseFloat(params.pressure.value), unit: params.pressure.unit },
      source_power: { value: parseFloat(params.source_power.value), unit: params.source_power.unit },
      bias_power: { value: parseFloat(params.bias_power.value), unit: params.bias_power.unit },
    });
    onComparisonConfirm?.(toConditionParams(paramsA), toConditionParams(paramsB));
  };

  const renderParams = (
    params: Record<string, { value: string; unit: string; status: string }>,
    setParams: React.Dispatch<React.SetStateAction<Record<string, { value: string; unit: string; status: string }>>>
  ) => (
    Object.entries(params).map(([key, field]) => {
      const invalid = field.value !== '' && !isInRange(key, field.value);
      return (
        <div key={key} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: typography.size.xs, color: colors.slate[500], minWidth: '72px', flexShrink: 0 }}>
            {PARAM_LABEL[key] ?? key}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              value={field.value}
              disabled={!isLatest}
              placeholder={PARAM_RANGE[key] ?? '—'}
              onChange={e => setParams(prev => ({
                ...prev,
                [key]: { ...prev[key], value: e.target.value }
              }))}
              style={{
                flex: 1,
                fontSize: typography.size.sm,
                color: colors.slate[900],
                border: `1px solid ${invalid ? colors.semantic.error : colors.slate[300]}`,
                borderRadius: '6px',
                padding: '5px 10px',
                outline: 'none',
                backgroundColor: isLatest ? colors.surface.white : colors.slate[100],
                transition: 'border-color 0.15s',
                cursor: isLatest ? 'text' : 'default',
                width: '100%',
              }}
              onFocus={e => {
                if (isLatest) e.currentTarget.style.borderColor = invalid
                  ? colors.semantic.error
                  : colors.primary[400];
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = field.value && !isInRange(key, field.value)
                  ? colors.semantic.error
                  : colors.slate[300];
              }}
            />
            <span style={{ fontSize: typography.size.xs, color: colors.slate[400], flexShrink: 0 }}>
              {field.unit}
            </span>
          </div>
        </div>
      );
    })
  );

  return (
    <div style={{
      border: `0.5px solid ${colors.slate[300]}`,
      borderRadius: '10px',
      padding: '12px 14px',
      backgroundColor: colors.surface.card,
      maxWidth: '560px',
      minWidth: '400px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: isLatest ? 1 : 0.5,
    }}>
      <span style={{
        fontSize: typography.size.xs, fontWeight: typography.weight.medium,
        color: colors.primary[600], backgroundColor: colors.primary[50],
        padding: '2px 8px', borderRadius: '4px', border: `1px solid ${colors.primary[100]}`,
        alignSelf: 'flex-start',
      }}>
        파라미터 확인
      </span>

      <div style={{ display: 'flex', gap: '0px', alignItems: 'stretch' }}>
        {[
          { label: '조건 A', params: paramsA, setParams: setParamsA },
          { label: '조건 B', params: paramsB, setParams: setParamsB },
        ].map(({ label, params, setParams }, colIdx) => (
          <>
            {colIdx === 1 && (
              <div style={{ width: '1px', backgroundColor: colors.slate[100], margin: '0 8px', flexShrink: 0 }} />
            )}
            <div key={label} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '8px 10px',
              backgroundColor: colors.slate[50],
              borderRadius: '8px',
            }}>
              <span style={{
                fontSize: typography.size.xs,
                color: colors.slate[700],
                fontWeight: typography.weight.medium,
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: `1px solid ${colors.slate[200]}`,
              }}>
                {label}
              </span>
              {renderParams(params, setParams)}
            </div>
          </>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: `1px solid ${colors.slate[200]}` }}>
        <button
          onClick={handleConfirm}
          onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
          disabled={!allFilled}
          style={{
            fontSize: typography.size.xs, fontWeight: typography.weight.medium,
            color: colors.surface.white,
            backgroundColor: allFilled ? colors.primary[500] : colors.slate[300],
            border: 'none', borderRadius: '6px', padding: '6px 14px',
            cursor: allFilled ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => { if (allFilled) e.currentTarget.style.backgroundColor = colors.primary[600]; }}
          onMouseLeave={e => { if (allFilled) e.currentTarget.style.backgroundColor = colors.primary[500]; }}>
          비교 분석
        </button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function ChatTypes({ role, content, isTyping, isLastAssistant,
  isLatest = true, type = 'default', onConfirm, onReanalyze, onRetry, loadingText,
  disableEdit, onOpenPanel, onComparisonConfirm }: ChatProps) {
  const isUser = role === 'user';
  const isWaiting = isTyping && content === '';
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
            border: `0.5px solid ${colors.slate[300]}`,
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
              onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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
    if (type === 'optimization-result') {
      try {
        const data = JSON.parse(content) as {
          historyId: string;
          label: string;
          currentScore: number;
          bestScore: number;
        };
        const diff = data.bestScore - data.currentScore;
        return (
          <div style={{
            border: `0.5px solid ${colors.slate[300]}`,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: typography.size.xs, fontWeight: typography.weight.medium,
                color: colors.primary[600], backgroundColor: colors.primary[50],
                padding: '2px 8px', borderRadius: '4px', border: `1px solid ${colors.primary[100]}`,
                alignSelf: 'flex-start',
              }}>
                최적화 완료
              </span>
              <span style={{
                fontSize: typography.size.sm, fontWeight: typography.weight.medium,
                color: colors.slate[700],
              }}>
                {data.label}
              </span>
              <span style={{ fontSize: typography.size.xs, color: colors.slate[400] }}>
                Score {Number(data.currentScore.toFixed(1))} → 최고{' '}
                <span style={{ fontWeight: typography.weight.medium, color: colors.slate[700] }}>
                  {Number(data.bestScore.toFixed(1))}
                </span>
                {' '}
                <span style={{ color: diff >= 0 ? '#059669' : '#dc2626', fontWeight: typography.weight.medium }}>
                  ({diff >= 0 ? '+' : ''}{diff.toFixed(1)})
                </span>
              </span>
            </div>
            <button
              onClick={() => onOpenPanel?.(data.historyId)}
              onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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

    if (type === 'comparison-confirm') {
      try {
        const data = JSON.parse(content) as ExtractComparisonResponse;
        return <ComparisonConfirmCard data={data} onComparisonConfirm={onComparisonConfirm} isLatest={isLatest} />;
      } catch {
        return null;
      }
    }

    if (type === 'comparison-result') {
      try {
        const data = JSON.parse(content) as {
          historyId: string;
          leftLabel: string;
          rightLabel: string;
          etchScoreDelta: number;
          etchScoreUnit: string;
        };
        return (
          <div style={{
            border: `0.5px solid ${colors.slate[300]}`,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: typography.size.xs, fontWeight: typography.weight.medium,
                color: colors.primary[600], backgroundColor: colors.primary[50],
                padding: '2px 8px', borderRadius: '4px', border: `1px solid ${colors.primary[100]}`,
                alignSelf: 'flex-start',
              }}>
                비교 완료
              </span>
              <span style={{ fontSize: typography.size.xs, color: colors.slate[500] }}>
                A — <span style={{ color: colors.slate[700], fontWeight: typography.weight.medium }}>{data.leftLabel}</span>
              </span>
              <span style={{ fontSize: typography.size.xs, color: colors.slate[500] }}>
                B — <span style={{ color: colors.slate[700], fontWeight: typography.weight.medium }}>{data.rightLabel}</span>
              </span>
              <span style={{ fontSize: typography.size.xs, color: colors.slate[400], marginTop: '2px' }}>
                Etch Score 차이: <span style={{ fontWeight: typography.weight.medium, color: colors.slate[700] }}>
                  {data.etchScoreDelta >= 0 ? '+' : ''}{data.etchScoreDelta.toFixed(2)}
                </span> {data.etchScoreUnit}
              </span>
            </div>
            <button
              onClick={() => onOpenPanel?.(data.historyId)}
              onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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
            onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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
        {isUser ? content : renderContent(content)}
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
          <div
            style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            {isWaiting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: colors.primary[500], borderRadius: '10px', animation: 'breathe 1.8s ease-in-out infinite', flexShrink: 0 }} />
                {loadingText && (
                  <span style={{ fontSize: typography.size.sm, color: colors.slate[400] }}>
                    {loadingText}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}