import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { colors, typography } from '../styles/tokens';
import type { OptimizationResult, OptimizationCandidate } from '../types/api';

Chart.register(...registerables);

// ── Props ─────────────────────────────────────────────
interface OptimizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: OptimizationResult | null;
}

// ── 상수 ──────────────────────────────────────────────
const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SL = colors.slate;
const PR = colors.primary;

const CANDIDATE_COLORS = ['#6366f1', '#f59e0b', '#10b981'];
const CURRENT_COLOR = '#94a3b8';

// ── 목업 데이터 ───────────────────────────────────────
const MOCK_DATA: OptimizationResult = {
  current: {
    process_params: {
      pressure: { value: 8, unit: 'mTorr' },
      source_power: { value: 450, unit: 'W' },
      bias_power: { value: 80, unit: 'W' },
    },
    prediction_result: {
      ion_flux: { value: 6.15e16, unit: 'cm⁻² s⁻¹' },
      ion_energy: { value: 55.6, unit: 'eV' },
      etch_score: { value: 46.7, unit: 'point' },
    },

    graphs: {
      cur: Array.from({ length: 60 }, (_, i) => ({ x: +(i / 60).toFixed(2), y: +(Math.sin(2 * Math.PI * (i / 60)) * Math.exp(-(i / 60) * 0.5) * 8e5 + Math.sin(4 * Math.PI * (i / 60)) * 1.5e5).toFixed(0) })),
      iad: Array.from({ length: 41 }, (_, i) => ({ x: +(-10 + i * 0.5).toFixed(1), y: +Math.exp(-0.5 * Math.pow((-10 + i * 0.5) / 1.8, 2)).toFixed(3) })),
      ied: Array.from({ length: 60 }, (_, i) => ({ x: +(10 + i * 12).toFixed(0), y: +(Math.exp(-0.5 * Math.pow((10 + i * 12 - 60) / 20, 2)) * 0.8 + Math.exp(-0.5 * Math.pow((10 + i * 12 - 350) / 80, 2)) * 0.25).toFixed(3) })),
    },
  },
  candidates: [
    {
      candidate_id: 1,
      process_params: { pressure: { value: 6, unit: 'mTorr' }, source_power: { value: 500, unit: 'W' }, bias_power: { value: 120, unit: 'W' } },
      prediction_result: {
        ion_flux: { value: 7.2e16, unit: 'cm⁻² s⁻¹' },
        ion_energy: { value: 72.1, unit: 'eV' },
        etch_score: { value: 46.7, unit: 'point' },
      },
      graphs: {
        cur: Array.from({ length: 60 }, (_, i) => ({ x: +(i / 60).toFixed(2), y: +(Math.sin(2 * Math.PI * (i / 60)) * Math.exp(-(i / 60) * 0.5) * 9.5e5 + Math.sin(4 * Math.PI * (i / 60)) * 1.8e5).toFixed(0) })),
        iad: Array.from({ length: 41 }, (_, i) => ({ x: +(-10 + i * 0.5).toFixed(1), y: +Math.exp(-0.5 * Math.pow((-10 + i * 0.5) / 1.5, 2)).toFixed(3) })),
        ied: Array.from({ length: 60 }, (_, i) => ({ x: +(10 + i * 12).toFixed(0), y: +(Math.exp(-0.5 * Math.pow((10 + i * 12 - 80) / 20, 2)) * 0.8 + Math.exp(-0.5 * Math.pow((10 + i * 12 - 420) / 80, 2)) * 0.25).toFixed(3) })),
      },
      parameter_impact: {
        pressure:     Array.from({ length: 50 }, (_, i) => ({ x: +(2 + i * 0.16).toFixed(2), y: +(78.3 - i * 0.3).toFixed(1) })),
        source_power: Array.from({ length: 50 }, (_, i) => ({ x: 100 + i * 8,                y: +(60 + i * 0.4).toFixed(1) })),
        bias_power:   Array.from({ length: 50 }, (_, i) => ({ x: i * 20,                      y: +(50 + i * 0.6).toFixed(1) })),
      },
    },
    {
      candidate_id: 2,
      process_params: { pressure: { value: 5, unit: 'mTorr' }, source_power: { value: 480, unit: 'W' }, bias_power: { value: 150, unit: 'W' } },
      prediction_result: { 
        ion_flux: { value: 6.9e16, unit: 'cm⁻² s⁻¹' }, 
        ion_energy: { value: 85.4, unit: 'eV' },
        etch_score: { value: 71.5, unit: 'point' },
      },
      graphs: {
        cur: Array.from({ length: 60 }, (_, i) => ({ x: +(i / 60).toFixed(2), y: +(Math.sin(2 * Math.PI * (i / 60)) * Math.exp(-(i / 60) * 0.5) * 1.1e6 + Math.sin(4 * Math.PI * (i / 60)) * 2e5).toFixed(0) })),
        iad: Array.from({ length: 41 }, (_, i) => ({ x: +(-10 + i * 0.5).toFixed(1), y: +Math.exp(-0.5 * Math.pow((-10 + i * 0.5) / 1.3, 2)).toFixed(3) })),
        ied: Array.from({ length: 60 }, (_, i) => ({ x: +(10 + i * 12).toFixed(0), y: +(Math.exp(-0.5 * Math.pow((10 + i * 12 - 95) / 20, 2)) * 0.8 + Math.exp(-0.5 * Math.pow((10 + i * 12 - 480) / 80, 2)) * 0.25).toFixed(3) })),
      },
      parameter_impact: {
        pressure:     Array.from({ length: 50 }, (_, i) => ({ x: +(2 + i * 0.16).toFixed(2), y: +(78.3 - i * 0.3).toFixed(1) })),
        source_power: Array.from({ length: 50 }, (_, i) => ({ x: 100 + i * 8,                y: +(60 + i * 0.4).toFixed(1) })),
        bias_power:   Array.from({ length: 50 }, (_, i) => ({ x: i * 20,                      y: +(50 + i * 0.6).toFixed(1) })),
      },
    },
    {
      candidate_id: 3,
      process_params: { pressure: { value: 9, unit: 'mTorr' }, source_power: { value: 420, unit: 'W' }, bias_power: { value: 100, unit: 'W' } },
      prediction_result: { 
        ion_flux: { value: 6.3e16, unit: 'cm⁻² s⁻¹' },
        ion_energy: { value: 63.2, unit: 'eV' },
        etch_score: { value: 71.5, unit: 'point' },
      },
      graphs: {
        cur: Array.from({ length: 60 }, (_, i) => ({ x: +(i / 60).toFixed(2), y: +(Math.sin(2 * Math.PI * (i / 60)) * Math.exp(-(i / 60) * 0.5) * 8.5e5 + Math.sin(4 * Math.PI * (i / 60)) * 1.6e5).toFixed(0) })),
        iad: Array.from({ length: 41 }, (_, i) => ({ x: +(-10 + i * 0.5).toFixed(1), y: +Math.exp(-0.5 * Math.pow((-10 + i * 0.5) / 2.0, 2)).toFixed(3) })),
        ied: Array.from({ length: 60 }, (_, i) => ({ x: +(10 + i * 12).toFixed(0), y: +(Math.exp(-0.5 * Math.pow((10 + i * 12 - 68) / 20, 2)) * 0.8 + Math.exp(-0.5 * Math.pow((10 + i * 12 - 380) / 80, 2)) * 0.25).toFixed(3) })),
      },
      parameter_impact: {
        pressure:     Array.from({ length: 50 }, (_, i) => ({ x: +(2 + i * 0.16).toFixed(2), y: +(78.3 - i * 0.3).toFixed(1) })),
        source_power: Array.from({ length: 50 }, (_, i) => ({ x: 100 + i * 8,                y: +(60 + i * 0.4).toFixed(1) })),
        bias_power:   Array.from({ length: 50 }, (_, i) => ({ x: i * 20,                      y: +(50 + i * 0.6).toFixed(1) })),
      },
    },
  ],
};

// ── 유틸 ──────────────────────────────────────────────
function calcDashOffset(score: number): number {
  return CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1e13) return v.toExponential(2);
  if (Math.abs(v) >= 1000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  return Number(v.toFixed(3)).toString();
}

// ── 스타일 상수 ────────────────────────────────────────
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
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 10px', backgroundColor: SL[50], borderRadius: '6px', marginBottom: '4px',
};

const chartOpts = (xlabel: string, ylabel: string) => ({
  responsive: true, maintainAspectRatio: false, animation: false as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: SL[400], font: { size: 9 }, maxTicksLimit: 6 }, title: { display: true, text: xlabel, color: SL[400], font: { size: 9 }, padding: { top: 6 } } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false }, ticks: { color: SL[400], font: { size: 9 }, maxTicksLimit: 5 }, title: { display: true, text: ylabel, color: SL[400], font: { size: 9 } } },
  },
});

// ── 경향성 그래프 컴포넌트 ─────────────────────────────
function TrendCard({ canvasId, title, sub, xlabel, xValues, scoreFn, panelWidth }: {
  canvasId: string; title: string; sub: string; xlabel: string;
  xValues: number[]; scoreFn: (x: number) => number; panelWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: xValues.map(v => v.toString()),
        datasets: [{ data: xValues.map(x => +scoreFn(x).toFixed(1)), borderColor: PR[500], borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false }],
      },
      options: chartOpts(xlabel, 'Etch Score'),
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [xValues, scoreFn, xlabel]);

  useEffect(() => { chartRef.current?.resize(); }, [panelWidth]);

  return (
    <div style={{ background: colors.surface.white, borderRadius: '8px', padding: '14px 14px 10px', border: `0.5px solid ${SL[200]}`, minWidth: 0, overflow: 'hidden' }}>
      <div style={{ fontSize: '11px', fontWeight: typography.weight.medium, color: SL[700], marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ fontSize: '10px', color: SL[400], marginBottom: '10px', lineHeight: '1.4' }}>{sub}</div>
      <div style={{ position: 'relative', width: '100%', height: '120px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} id={canvasId} role="img" aria-label={title} />
      </div>
    </div>
  );
}

// ── 물리 분포 그래프 컴포넌트 ─────────────────────────
function DistCard({ canvasId, title, sub, xlabel, ylabel, datasets, panelWidth }: {
  canvasId: string; title: string; sub: string; xlabel: string; ylabel: string;
  datasets: { label: string; color: string; data: { x: number; y: number }[] }[];
  panelWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: datasets[0]?.data.map(d => d.x.toString()) ?? [],
        datasets: datasets.map(ds => ({
          label: ds.label, data: ds.data.map(d => d.y),
          borderColor: ds.color, borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false,
        })),
      },
      options: chartOpts(xlabel, ylabel),
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [datasets, xlabel, ylabel]);

  useEffect(() => { chartRef.current?.resize(); }, [panelWidth]);

  return (
    <div style={{ background: colors.surface.white, borderRadius: '8px', padding: '14px 14px 10px', border: `0.5px solid ${SL[200]}` }}>
      <div style={{ fontSize: '12px', fontWeight: typography.weight.medium, color: SL[700], marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '10px', color: SL[400], marginBottom: '10px', lineHeight: '1.4' }}>{sub}</div>
      <div style={{ position: 'relative', width: '100%', height: '150px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} id={canvasId} role="img" aria-label={title} />
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function OptimizationPanel({ isOpen, onClose, data }: OptimizationPanelProps) {
  const [width, setWidth] = useState(700);
  const [selectedCandIdx, setSelectedCandIdx] = useState(0);
  const isResizing = useRef(false);

  const handleMouseDown = () => {
    isResizing.current = true;
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setWidth(Math.max(360, Math.min(900, window.innerWidth - e.clientX)));
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

  const d = data ?? MOCK_DATA;
  const current = d.current; 
  const candidates = d.candidates;
  const selCand = candidates[selectedCandIdx];

  const score = current.prediction_result.etch_score.value;
  const dashOffset = calcDashOffset(score);

  const PARAMS = [
    { label: 'Pressure', unit: 'mTorr', key: 'pressure' as const },
    { label: 'Source Power', unit: 'W', key: 'source_power' as const },
    { label: 'Bias Power', unit: 'W', key: 'bias_power' as const },
  ];

  // 경향성 그래프 — 선택된 후보 기준 나머지 두 파라미터 고정
  const sp = selCand.process_params.source_power.value;
  const bp = selCand.process_params.bias_power.value;
  const pr = selCand.process_params.pressure.value;

  const scoreModel = (p: number, s: number, b: number) =>
    Math.min(100, 20 + (s / 500) * 35 + (b / 1500) * 25 + (1 - p / 10) * 20);

  const trendGraphs = [
    { canvasId: 'trend-p', title: 'Pressure vs Etch Score', xlabel: 'pressure (mTorr)', sub: `Source Power ${sp}W, Bias Power ${bp}W 고정`, xValues: Array.from({ length: 20 }, (_, i) => +(2 + i * 0.4).toFixed(1)), scoreFn: (x: number) => scoreModel(x, sp, bp) },
    { canvasId: 'trend-sp', title: 'Source Power vs Etch Score', xlabel: 'source power (W)', sub: `Pressure ${pr}mTorr, Bias Power ${bp}W 고정`, xValues: Array.from({ length: 20 }, (_, i) => 100 + i * 20), scoreFn: (x: number) => scoreModel(pr, x, bp) },
    { canvasId: 'trend-bp', title: 'Bias Power vs Etch Score', xlabel: 'bias power (W)', sub: `Pressure ${pr}mTorr, Source Power ${sp}W 고정`, xValues: Array.from({ length: 20 }, (_, i) => i * 75), scoreFn: (x: number) => scoreModel(pr, sp, x) },
  ];

  const distGraphs = [
    {
      canvasId: 'dist-cur', title: 'Current Density (CUR)', sub: 'RF 주기 내 전류밀도 시간 변화 — x: time (rf cycle) / y: J₀h_h (statA/cm²)', xlabel: 'time (rf cycle)', ylabel: 'J (statA/cm²)',
      datasets: [
        { label: '현재', color: CURRENT_COLOR, data: current.graphs.cur },
        ...candidates.map((c, i) => ({ label: `후보 ${i + 1}`, color: CANDIDATE_COLORS[i], data: c.graphs.cur })),
      ],
    },
    {
      canvasId: 'dist-iad', title: 'Ion Angle Distribution (IAD)', sub: '이온 입사 각도 분포 — x: angle (°) / y: IAD (a.u.)', xlabel: 'angle (°)', ylabel: 'IAD (a.u.)',
      datasets: [
        { label: '현재', color: CURRENT_COLOR, data: current.graphs.iad },
        ...candidates.map((c, i) => ({ label: `후보 ${i + 1}`, color: CANDIDATE_COLORS[i], data: c.graphs.iad })),
      ],
    },
    {
      canvasId: 'dist-ied', title: 'Ion Energy Distribution (IED)', sub: '이온 에너지 분포 — x: energy (eV) / y: IED (a.u.)', xlabel: 'energy (eV)', ylabel: 'IED (a.u.)',
      datasets: [
        { label: '현재', color: CURRENT_COLOR, data: current.graphs.ied },
        ...candidates.map((c, i) => ({ label: `후보 ${i + 1}`, color: CANDIDATE_COLORS[i], data: c.graphs.ied })),
      ],
    },
  ];

  return (
    <div style={{ position: 'relative', width: `${width}px`, height: '100vh', flexShrink: 0, borderLeft: `1px solid ${SL[200]}`, backgroundColor: colors.surface.white, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* 드래그 핸들 */}
      <div
        onMouseDown={handleMouseDown}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{ width: '4px', height: '40px', borderRadius: '999px', backgroundColor: SL[300], transition: 'background-color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = SL[400]; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = SL[300]; }}
        />
      </div>

      <div className="prediction-panel-inner">

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `0.5px solid ${SL[100]}`, flexShrink: 0 }}>
          <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.medium, color: PR[600], backgroundColor: PR[50], padding: '2px 8px', borderRadius: '4px', border: `1px solid ${PR[100]}` }}>
            최적화 결과
          </span>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: 'none', background: 'none', borderRadius: '6px', cursor: 'pointer', color: SL[400], transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = SL[100]; e.currentTarget.style.color = SL[700]; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = SL[400]; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 상단: Etch Score + 현재 조건 */}
        <div style={{ display: 'flex', borderBottom: `0.5px solid ${SL[100]}`, flexShrink: 0 }}>

          {/* Etch Score 게이지 */}
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={secLabel}>Etch Score (현재)</span>
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
                  <span style={{ fontSize: '12px', fontWeight: typography.weight.medium, color: SL[900] }}>{current.process_params[p.key].value}</span>
                  <span style={{ fontSize: '10px', color: SL[400], marginLeft: '2px' }}>{p.unit}</span>
                </span>
              </div>
            ))}
            <span style={{ ...secLabel, marginTop: '10px' }}>Plasma 상태 변수</span>
            {(['ion_flux', 'ion_energy'] as const).map(k => (
              <div key={k} style={rowCard}>
                <span style={{ fontSize: '11px', color: SL[500] }}>{k === 'ion_flux' ? 'Ion Flux' : 'Ion Energy'}</span>
                <span>
                  <span style={{ fontSize: '11px', fontWeight: typography.weight.medium, color: SL[900] }}>
                    {formatValue(current.prediction_result[k].value)}
                  </span>
                  <span style={{ fontSize: '10px', color: SL[400], marginLeft: '2px' }}>{current.prediction_result[k].unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 후보 비교 테이블 */}
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${SL[100]}`, flexShrink: 0 }}>
          <span style={secLabel}>후보 비교</span>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: '10px', fontWeight: 500, color: SL[400], textAlign: 'left', padding: '6px 10px', backgroundColor: SL[50], borderBottom: `0.5px solid ${SL[200]}` }}></th>
                  <th style={{ fontSize: '10px', fontWeight: 500, color: SL[500], textAlign: 'right', padding: '6px 10px', backgroundColor: SL[50], borderBottom: `0.5px solid ${SL[200]}` }}>현재</th>
                  {candidates.map((_, i) => (
                    <th key={i} onClick={() => setSelectedCandIdx(i)} style={{ fontSize: '10px', fontWeight: 500, textAlign: 'right', padding: '6px 10px', borderBottom: `0.5px solid ${SL[200]}`, cursor: 'pointer', backgroundColor: selectedCandIdx === i ? '#eef2ff' : SL[50], color: selectedCandIdx === i ? PR[600] : SL[500], transition: 'all 0.15s' }}>
                      후보 {i + 1}{selectedCandIdx === i ? ' ▲' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Pressure (mTorr)', cur: current.process_params.pressure.value, cands: candidates.map(c => c.process_params.pressure.value) },
                  { label: 'Source Power (W)', cur: current.process_params.source_power.value, cands: candidates.map(c => c.process_params.source_power.value) },
                  { label: 'Bias Power (W)', cur: current.process_params.bias_power.value, cands: candidates.map(c => c.process_params.bias_power.value) },
                  { label: 'Ion Flux', cur: formatValue(current.prediction_result.ion_flux.value), cands: candidates.map(c => formatValue(c.prediction_result.ion_flux.value)) },
                  { label: 'Ion Energy (eV)', cur: current.prediction_result.ion_energy.value, cands: candidates.map(c => c.prediction_result.ion_energy.value) },
                ].map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ fontSize: '11px', color: SL[500], padding: '7px 10px', borderBottom: `0.5px solid ${SL[100]}` }}>{row.label}</td>
                    <td style={{ textAlign: 'right', padding: '7px 10px', borderBottom: `0.5px solid ${SL[100]}`, color: SL[700], backgroundColor: SL[50] }}>{row.cur}</td>
                    {row.cands.map((v, ci) => (
                      <td key={ci} onClick={() => setSelectedCandIdx(ci)} style={{ textAlign: 'right', padding: '7px 10px', borderBottom: `0.5px solid ${SL[100]}`, cursor: 'pointer', color: selectedCandIdx === ci ? PR[600] : SL[700], backgroundColor: selectedCandIdx === ci ? '#eef2ff' : 'transparent', transition: 'all 0.15s' }}>{v}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td style={{ fontSize: '11px', fontWeight: 500, color: SL[700], padding: '7px 10px' }}>Etch Score</td>
                  <td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 500, color: PR[500], backgroundColor: SL[50] }}>{current.prediction_result.etch_score.value.toFixed(1)}</td>
                  {candidates.map((c, ci) => (
                    <td key={ci} onClick={() => setSelectedCandIdx(ci)} style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 500, cursor: 'pointer', color: PR[500], backgroundColor: selectedCandIdx === ci ? '#eef2ff' : 'transparent', transition: 'all 0.15s' }}>{c.prediction_result.etch_score.value.toFixed(1)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 경향성 그래프 */}
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${SL[100]}` }}>
          <span style={secLabel}>경향성 분석 — 후보 {selectedCandIdx + 1} 기준</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            {trendGraphs.map(g => (
              <TrendCard key={g.canvasId} {...g} panelWidth={width} />
            ))}
          </div>
        </div>

        {/* 물리 분포 비교 */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={secLabel}>물리 분포 비교</span>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[{ label: '현재', color: CURRENT_COLOR }, ...candidates.map((_, i) => ({ label: `후보 ${i + 1}`, color: CANDIDATE_COLORS[i] }))].map(item => (
                <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: SL[500] }}>
                  <span style={{ width: '10px', height: '3px', borderRadius: '2px', backgroundColor: item.color, display: 'inline-block' }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          {distGraphs.map(g => (
            <DistCard key={g.canvasId} {...g} panelWidth={width} />
          ))}
        </div>

        {/* 푸터 */}
        <div style={{ borderTop: `0.5px solid ${SL[100]}`, padding: '8px 18px', fontSize: '10px', color: SL[400], lineHeight: '1.5', flexShrink: 0 }}>
          * Etch Score는 ion_flux · ion_energy 기반 상대 지표이며, 실제 Etch Rate와 다를 수 있습니다. 중요한 공정 결정은 엔지니어의 검토가 필요합니다.
        </div>

      </div>
    </div>
  );
}