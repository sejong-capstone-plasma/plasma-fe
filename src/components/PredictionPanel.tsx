import { useEffect } from 'react';
import { colors, typography } from '../styles/tokens';
import type { PredictionResult } from '../types/api';

interface ProcessParams {
  pressure:     number;
  source_power: number;
  bias_power:   number;
}

interface PredictionPanelProps {
  isOpen:        boolean;
  onClose:       () => void;
  data:          PredictionResult | null;
  processParams: ProcessParams | null;
}

const RANGES = {
  pressure:     { min: 2,   max: 10   },
  source_power: { min: 100, max: 500  },
  bias_power:   { min: 0,   max: 1500 },
};

function isInRange(p: ProcessParams): boolean {
  return (
    p.pressure     >= RANGES.pressure.min     && p.pressure     <= RANGES.pressure.max     &&
    p.source_power >= RANGES.source_power.min && p.source_power <= RANGES.source_power.max &&
    p.bias_power   >= RANGES.bias_power.min   && p.bias_power   <= RANGES.bias_power.max
  );
}

const RADIUS = 76;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function calcDashOffset(score: number): number {
  return CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1e13) return value.toExponential(2);
  if (Math.abs(value) >= 1000) return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  return Number(value.toFixed(3)).toString();
}

const SL = colors.slate;
const PR = colors.primary;

const secLabel: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: typography.weight.medium,
  color: SL[400],
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '8px',
};

const rowCard: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  backgroundColor: SL[50],
  borderRadius: '8px',
};

export default function PredictionPanel({ isOpen, onClose, data, processParams }: PredictionPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const prediction  = data?.prediction_result;
  const explanation = data?.explanation;
  const score       = prediction?.etch_score?.value ?? 0;
  const dashOffset  = calcDashOffset(score);
  const inRange     = processParams ? isInRange(processParams) : true;

  const PARAMS = [
    { key: 'pressure',     label: 'Pressure',     unit: 'mTorr', value: processParams?.pressure },
    { key: 'source_power', label: 'Source Power', unit: 'W',     value: processParams?.source_power },
    { key: 'bias_power',   label: 'Bias Power',   unit: 'W',     value: processParams?.bias_power },
  ];

  const PLASMA = [
    { key: 'ion_flux'   as const, label: 'Ion Flux' },
    { key: 'ion_energy' as const, label: 'Ion Energy' },
  ];

  const filteredDetails = (explanation?.details ?? []).filter(d => {
    const lower = d.toLowerCase();
    return (
      lower.includes('etch score') || lower.includes('etch_score') ||
      lower.includes('ion_flux')   || lower.includes('ion flux')   ||
      lower.includes('ion_energy') || lower.includes('ion energy') ||
      lower.includes('plasma')
    );
  });

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'overlayIn 0.18s ease forwards',
      }}
    >
      <style>{`
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '960px',
        backgroundColor: colors.surface.white,
        borderRadius: '16px',
        border: `1px solid ${SL[200]}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'panelIn 0.24s cubic-bezier(0.34,1.4,0.64,1) forwards',
      }}>

        {/* ── 헤더 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 22px', borderBottom: `1px solid ${SL[100]}`, flexShrink: 0,
        }}>
          <span style={{
            fontSize: typography.size.xs, fontWeight: typography.weight.medium,
            color: PR[600], backgroundColor: PR[50],
            padding: '2px 8px', borderRadius: '4px', border: `1px solid ${PR[100]}`,
          }}>
            예측 결과
          </span>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', border: 'none', background: 'none',
              borderRadius: '6px', cursor: 'pointer', color: SL[400], transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = SL[100]; e.currentTarget.style.color = SL[700]; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = SL[400]; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── 본문 3단 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1px 1fr 1px 1fr', minHeight: '320px' }}>

          {/* 왼쪽: 현재 조건 + Plasma 상태 변수 */}
          <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px', justifyContent: 'center' }}>

            {/* 현재 조건 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={secLabel}>현재 조건</span>
                <span style={{
                  fontSize: '10px', fontWeight: typography.weight.medium,
                  color: inRange ? '#059669' : colors.semantic.error,
                  backgroundColor: inRange ? '#ecfdf5' : colors.semantic.errorBg,
                  border: `0.5px solid ${inRange ? '#a7f3d0' : colors.semantic.errorBorder}`,
                  borderRadius: '3px', padding: '1px 6px',
                  marginTop: '-8px',
                }}>
                  {inRange ? '정상' : '범위 초과'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {PARAMS.map(p => (
                  <div key={p.key} style={rowCard}>
                    <span style={{ fontSize: '11px', color: SL[500] }}>{p.label}</span>
                    <span>
                      <span style={{ fontSize: '13px', fontWeight: typography.weight.medium, color: SL[900] }}>
                        {p.value ?? '—'}
                      </span>
                      <span style={{ fontSize: '10px', color: SL[400], marginLeft: '2px' }}>{p.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plasma 상태 변수 */}
            <div>
              <span style={secLabel}>Plasma 상태 변수</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {PLASMA.map(({ key, label }) => {
                  const field = prediction?.[key];
                  return (
                    <div key={key} style={rowCard}>
                      <span style={{ fontSize: '12px', color: SL[500] }}>{label}</span>
                      <span>
                        <span style={{ fontSize: '13px', fontWeight: typography.weight.medium, color: SL[900] }}>
                          {field?.value != null ? formatValue(field.value) : '—'}
                        </span>
                        <span style={{ fontSize: '10px', color: SL[400], marginLeft: '3px' }}>{field?.unit ?? ''}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div style={{ backgroundColor: SL[100] }} />

          {/* 가운데: Etch Score 게이지 */}
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            <span style={secLabel}>Etch Score</span>
            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r={RADIUS} fill="none" stroke={SL[100]} strokeWidth="12" />
                <circle
                  cx="100" cy="100" r={RADIUS} fill="none"
                  stroke={PR[500]} strokeWidth="12"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '48px', fontWeight: typography.weight.medium, color: SL[900], lineHeight: 1 }}>
                  {Number(score.toFixed(1))}
                </span>
                <span style={{ fontSize: '12px', color: SL[400], marginTop: '4px' }}>/ 100</span>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: SL[400], textAlign: 'center', lineHeight: '1.55' }}>
              실제 ER 수치가 아닌<br />상대 비교 지표입니다
            </span>
          </div>

          <div style={{ backgroundColor: SL[100] }} />

          {/* 오른쪽: 요약 + 상세 분석 */}
          <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
            {explanation?.summary && (
              <div>
                <span style={secLabel}>요약</span>
                <div style={{ backgroundColor: SL[50], borderRadius: '10px', padding: '12px 14px', fontSize: typography.size.sm, color: SL[700], lineHeight: '1.7' }}>
                  {explanation.summary}
                </div>
              </div>
            )}
            {filteredDetails.length > 0 && (
              <div>
                <span style={secLabel}>상세 분석</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredDetails.map((detail, i) => (
                    <div key={i} style={{
                      fontSize: typography.size.xs, color: SL[700],
                      padding: '8px 12px', lineHeight: '1.6',
                      backgroundColor: SL[50],
                      borderLeft: `2px solid ${PR[400]}`,
                      borderRadius: '0 6px 6px 0',
                    }}>
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── 푸터 ── */}
        <div style={{ borderTop: `1px solid ${SL[100]}`, padding: '9px 22px', fontSize: '10px', color: SL[400], lineHeight: '1.5' }}>
          * Etch Score는 ion_flux · ion_energy 기반 상대 지표이며, 실제 Etch Rate와 다를 수 있습니다. 중요한 공정 결정은 엔지니어의 검토가 필요합니다.
        </div>

      </div>
    </div>
  );
}