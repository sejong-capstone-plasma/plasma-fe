import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { colors, typography } from '../styles/tokens';
import type { PredictionResult } from '../types/api';

Chart.register(...registerables);

interface ProcessParams {
  pressure: number;
  source_power: number;
  bias_power: number;
}

interface PredictionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: PredictionResult | null;
  processParams: ProcessParams | null;
}

const RANGES = {
  pressure: { min: 2, max: 10 },
  source_power: { min: 100, max: 500 },
  bias_power: { min: 0, max: 1500 },
};

function isInRange(p: ProcessParams): boolean {
  return (
    p.pressure >= RANGES.pressure.min && p.pressure <= RANGES.pressure.max &&
    p.source_power >= RANGES.source_power.min && p.source_power <= RANGES.source_power.max &&
    p.bias_power >= RANGES.bias_power.min && p.bias_power <= RANGES.bias_power.max
  );
}

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function calcDashOffset(score: number): number {
  return CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1e13) return value.toExponential(2);
  if (Math.abs(value) >= 1000) return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  return Number(value.toFixed(3)).toString();
}

// ── 목업 데이터 (실제 K-PLASMA 데이터 형태 기반) ──────
const MOCK_IAD = Array.from({ length: 41 }, (_, i) => {
  const x = -10 + i * 0.5;
  const y = Math.exp(-0.5 * Math.pow(x / 1.8, 2));
  return { x, y };
});

const MOCK_CUR = Array.from({ length: 60 }, (_, i) => {
  const x = parseFloat((i / 60).toFixed(3));
  const y = Math.sin(2 * Math.PI * x) * Math.exp(-x * 0.5) * 8e5
    + Math.sin(4 * Math.PI * x) * 1.5e5;
  return { x, y };
});

const MOCK_IED = Array.from({ length: 60 }, (_, i) => {
  const x = 10 + i * 12;
  const y = Math.exp(-0.5 * Math.pow((x - 60) / 20, 2)) * 0.8
    + Math.exp(-0.5 * Math.pow((x - 400) / 80, 2)) * 0.3
    + Math.exp(-0.5 * Math.pow((x - 680) / 15, 2)) * 0.15;
  return { x, y: Math.max(0, y) };
});

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
  padding: '6px 10px',
  backgroundColor: SL[50],
  borderRadius: '6px',
  marginBottom: '4px',
};

// ── 그래프 카드 컴포넌트 ──────────────────────────────
function GraphCard({ id, title, sub, data, color, xlabel, ylabel, panelWidth }: {
  id: string;
  title: string;
  sub: string;
  data: { x: number; y: number }[];
  color: string;
  xlabel: string;
  ylabel: string;
  panelWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const gridColor = 'rgba(0,0,0,0.05)';
    const tc = SL[400];

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map(d => d.x),
        datasets: [{
          data: data.map(d => d.y),
          borderColor: color,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: gridColor },
            border: { display: false },
            ticks: { color: tc, font: { size: 10 }, maxTicksLimit: 7 },
            title: { display: true, text: xlabel, color: tc, font: { size: 10 }, padding: { top: 8 } },
          },
          y: {
            grid: { color: gridColor },
            border: { display: false },
            ticks: { color: tc, font: { size: 10 }, maxTicksLimit: 5 },
            title: { display: true, text: ylabel, color: tc, font: { size: 10 } },
          },
        },
      },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [data, color, xlabel, ylabel]);

  useEffect(() => {
    chartRef.current?.resize();
  }, [panelWidth]);

  return (
    <div style={{
      background: colors.surface.white,
      borderRadius: '10px',
      padding: '20px 20px 16px',
      border: `0.5px solid ${SL[200]}`,
    }}>
      <div style={{ fontSize: '13px', fontWeight: typography.weight.medium, color: SL[700], marginBottom: '3px' }}>
        {title}
      </div>
      <div style={{ fontSize: '11px', color: SL[400], marginBottom: '16px', lineHeight: '1.4' }}>
        {sub}
      </div>
      <div style={{ position: 'relative', width: '100%', height: '180px' }}>
        <canvas ref={canvasRef} role="img" aria-label={title} />
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function PredictionPanel({ isOpen, onClose, data, processParams }: PredictionPanelProps) {
  const [width, setWidth] = useState(700);
  const isResizing = useRef(false);

  const handleMouseDown = () => {
    isResizing.current = true;
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setWidth(Math.max(320, Math.min(800, window.innerWidth - e.clientX)));
    };
    const onMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const prediction = data?.prediction_result;
  const score = prediction?.etch_score?.value ?? 0;
  const dashOffset = calcDashOffset(score);

  const PARAMS = [
    { key: 'pressure', label: 'Pressure', unit: 'mTorr', value: processParams?.pressure },
    { key: 'source_power', label: 'Source Power', unit: 'W', value: processParams?.source_power },
    { key: 'bias_power', label: 'Bias Power', unit: 'W', value: processParams?.bias_power },
  ];

  const PLASMA = [
    { key: 'ion_flux' as const, label: 'Ion Flux', unit: prediction?.ion_flux?.unit ?? 'cm⁻² s⁻¹' },
    { key: 'ion_energy' as const, label: 'Ion Energy', unit: prediction?.ion_energy?.unit ?? 'eV' },
  ];

  const GRAPHS = [
    { id: 'cur', title: 'Current Density (CUR)', sub: 'RF 주기 내 전류밀도 시간 변화', data: MOCK_CUR, color: '#6366f1', xlabel: 'time (rf cycle)', ylabel: 'J (statA/cm²)' },
    { id: 'iad', title: 'Ion Angle Dist. (IAD)', sub: '이온 입사 각도 분포', data: MOCK_IAD, color: '#6366f1', xlabel: 'angle (°)', ylabel: 'IAD (a.u.)' },
    { id: 'ied', title: 'Ion Energy Dist. (IED)', sub: '이온 에너지 분포', data: MOCK_IED, color: '#6366f1', xlabel: 'energy (eV)', ylabel: 'IED (a.u.)' },
  ];

  return (
    <div style={{ position: 'relative', width: `${width}px`, height: '100vh', flexShrink: 0, borderLeft: `1px solid ${SL[200]}`, backgroundColor: colors.surface.white, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* 드래그 핸들 */}
      <div
        onMouseDown={handleMouseDown}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
      >
        <div
          style={{ width: '4px', height: '40px', borderRadius: '999px', backgroundColor: SL[300], transition: 'background-color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = SL[400]; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = SL[300]; }}
        />
      </div>

      {/* container query 적용 래퍼 */}
      <div className="prediction-panel-inner">

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `0.5px solid ${SL[100]}`, flexShrink: 0 }}>
          <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.medium, color: PR[600], backgroundColor: PR[50], padding: '2px 8px', borderRadius: '4px', border: `1px solid ${PR[100]}` }}>
            예측 결과
          </span>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: 'none', background: 'none', borderRadius: '6px', cursor: 'pointer', color: SL[400], transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = SL[100]; e.currentTarget.style.color = SL[700]; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = SL[400]; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>


        {/* 상단: 현재 조건 + Etch Score */}
        <div style={{ display: 'flex', borderBottom: `0.5px solid ${SL[100]}`, flexShrink: 0 }}>

          {/* Etch Score 게이지 */}
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={secLabel}>Etch Score</span>
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r={RADIUS} fill="none" stroke={SL[100]} strokeWidth="8" />
                <circle cx="60" cy="60" r={RADIUS} fill="none" stroke={PR[500]} strokeWidth="8"
                  strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
                  strokeLinecap="round" transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '34px', fontWeight: typography.weight.medium, color: SL[900], lineHeight: 1 }}>
                  {Number(score.toFixed(1))}
                </span>
                <span style={{ fontSize: '10px', color: SL[400], marginTop: '2px' }}>/ 100</span>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: SL[400], textAlign: 'center', lineHeight: '1.5' }}>
              * 실제 식각률(ER)이 아닌<br />공정 조건 간 상대 비교 지표입니다
            </span>
          </div>

          <div style={{ width: '0.5px', backgroundColor: SL[100] }} />

          {/* 현재 조건 + Plasma 상태 변수 */}
          <div style={{ width: '300px', flexShrink: 0, padding: '16px 18px' }}>
            <span style={secLabel}>현재 조건</span>
            {PARAMS.map(p => (
              <div key={p.key} style={rowCard}>
                <span style={{ fontSize: '11px', color: SL[500] }}>{p.label}</span>
                <span>
                  <span style={{ fontSize: '12px', fontWeight: typography.weight.medium, color: SL[900] }}>{p.value ?? '—'}</span>
                  <span style={{ fontSize: '10px', color: SL[400], marginLeft: '2px' }}>{p.unit}</span>
                </span>
              </div>
            ))}

            <span style={{ ...secLabel, marginTop: '10px' }}>Plasma 상태 변수</span>
            {PLASMA.map(({ key, label, unit }) => {
              const field = prediction?.[key];
              return (
                <div key={key} style={rowCard}>
                  <span style={{ fontSize: '11px', color: SL[500] }}>{label}</span>
                  <span>
                    <span style={{ fontSize: '11px', fontWeight: typography.weight.medium, color: SL[900] }}>
                      {field?.value != null ? formatValue(field.value) : '—'}
                    </span>
                    <span style={{ fontSize: '10px', color: SL[400], marginLeft: '2px' }}>{unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>


        {/* 하단: 물리 분포 그래프 */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={secLabel}>물리 분포</span>
          {GRAPHS.map(g => (
            <GraphCard key={g.id} {...g} panelWidth={width} />
          ))}
        </div>

        {/* 푸터 */}
        <div style={{ borderTop: `0.5px solid ${SL[100]}`, padding: '8px 18px', fontSize: '10px', color: SL[400], lineHeight: '1.5', flexShrink: 0 }}>
          * Etch Score는 ion_flux · ion_energy 기반 상대 지표이며, 실제 Etch Rate와 다를 수 있습니다. 중요한 공정 결정은 엔지니어의 검토가 필요합니다.
        </div>

      </div>
    </div >
  );
}