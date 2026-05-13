import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { colors, typography } from '../styles/tokens';
import type { ComparisonResult } from '../types/api';

Chart.register(...registerables);

interface ComparisonPanelProps {
    isOpen: boolean;
    onClose: () => void;
    data: ComparisonResult | null;
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

const PARAM_LABEL: Record<string, string> = {
    pressure: 'Pressure',
    source_power: 'Source Power',
    bias_power: 'Bias Power',
};

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
    padding: '5px 8px',
    backgroundColor: SL[50],
    borderRadius: '6px',
    marginBottom: '3px',
    minWidth: 0,
    overflow: 'hidden',
};

const chartOpts = (xlabel: string, ylabel: string, xMax?: number) => ({
    responsive: true, maintainAspectRatio: false, animation: false as const,
    plugins: { legend: { display: false } },
    scales: {
        x: {
            grid: { display: false }, border: { display: false },
            ticks: { color: SL[400], font: { size: 9 }, maxTicksLimit: 6 },
            title: { display: true, text: xlabel, color: SL[400], font: { size: 9 }, padding: { top: 6 } },
            ...(xMax !== undefined ? { max: xMax } : {}),
        },
        y: {
            grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false },
            ticks: { color: SL[400], font: { size: 9 }, maxTicksLimit: 5 },
            title: { display: true, text: ylabel, color: SL[400], font: { size: 9 } },
        },
    },
});

// ── 분포 그래프 컴포넌트 ───────────────────────────────
function DistCard({ canvasId, title, sub, xlabel, ylabel, datasets, panelWidth, xMax }: {
    canvasId: string; title: string; sub: string;
    xlabel: string; ylabel: string;
    datasets: { label: string; color: string; data: { x: number; y: number }[] }[];
    panelWidth: number;
    xMax?: number;
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
                    borderColor: ds.color, borderWidth: 1.5,
                    pointRadius: 0, tension: 0.4, fill: false,
                })),
            },
            options: chartOpts(xlabel, ylabel, xMax),
        });
        return () => { chartRef.current?.destroy(); chartRef.current = null; };
    }, [datasets, xlabel, ylabel, xMax]);

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
export default function ComparisonPanel({ isOpen, onClose, data }: ComparisonPanelProps) {
    const [width, setWidth] = useState(700);
    const isResizing = useRef(false); // ← useRef로 수정

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

    if (!isOpen || !data) return null;

    const leftScore = data.left.prediction.prediction_result.etch_score.value;
    const rightScore = data.right.prediction.prediction_result.etch_score.value;
    const leftWins = leftScore >= rightScore;

    const SIDES = [
        { label: '조건 A', side: data.left, score: leftScore, isWinner: leftWins },
        { label: '조건 B', side: data.right, score: rightScore, isWinner: !leftWins },
    ];

    const delta = data.difference;

    // ── 물리 분포 ────────────────────────────────────────
    const leftBiasOk = (data.left.parameters.find(p => p.key === 'bias_power')?.value ?? 0) >= 100;
    const rightBiasOk = (data.right.parameters.find(p => p.key === 'bias_power')?.value ?? 0) >= 100;
    const allExcluded = !leftBiasOk && !rightBiasOk;
    const excludedLabels = [...(!leftBiasOk ? ['조건 A'] : []), ...(!rightBiasOk ? ['조건 B'] : [])];

    const LEFT_COLOR = '#6366f1';
    const RIGHT_COLOR = '#f59e0b';

    const toXY = (xs: number[], ys: number[]) => xs.map((x, i) => ({ x, y: ys[i] ?? 0 }));

    const toDistData = (pd: typeof data.left.plasmaDistribution, key: 'cur' | 'iad' | 'ied') => {
        if (!pd) return [];
        if (key === 'cur') return toXY(pd.cur_x_values, pd.cur_y_values);
        if (key === 'iad') return toXY(pd.iad_x_values, pd.iad_y_values);
        return toXY(pd.ied_x_values, pd.ied_y_values);
    };

    // IED xMax 동적 계산
    const avgEnergies = [
        ...(leftBiasOk && data.left.plasmaDistribution ? [data.left.plasmaDistribution.avg_energy] : []),
        ...(rightBiasOk && data.right.plasmaDistribution ? [data.right.plasmaDistribution.avg_energy] : []),
    ];
    const iedXMax = avgEnergies.length > 0
        ? Math.max(100, Math.round((Math.max(...avgEnergies) * 2) / 10) * 10)
        : 150;

    const distGraphs = [
        {
            canvasId: 'cmp-dist-cur', title: 'Current Density (CUR)',
            sub: 'RF 주기 내 전류밀도 시간 변화', xlabel: 'time (rf cycle)', ylabel: 'J (statA/cm²)',
            datasets: [
                ...(leftBiasOk && data.left.plasmaDistribution
                    ? [{ label: '조건 A', color: LEFT_COLOR, data: toDistData(data.left.plasmaDistribution, 'cur') }]
                    : []),
                ...(rightBiasOk && data.right.plasmaDistribution
                    ? [{ label: '조건 B', color: RIGHT_COLOR, data: toDistData(data.right.plasmaDistribution, 'cur') }]
                    : []),
            ],
        },
        {
            canvasId: 'cmp-dist-iad', title: 'Ion Angle Distribution (IAD)',
            sub: '이온 입사 각도 분포', xlabel: 'angle (°)', ylabel: 'IAD (a.u.)',
            datasets: [
                ...(leftBiasOk && data.left.plasmaDistribution
                    ? [{ label: '조건 A', color: LEFT_COLOR, data: toDistData(data.left.plasmaDistribution, 'iad') }]
                    : []),
                ...(rightBiasOk && data.right.plasmaDistribution
                    ? [{ label: '조건 B', color: RIGHT_COLOR, data: toDistData(data.right.plasmaDistribution, 'iad') }]
                    : []),
            ],
        },
        {
            canvasId: 'cmp-dist-ied', title: 'Ion Energy Distribution (IED)',
            sub: '이온 에너지 분포', xlabel: 'energy (eV)', ylabel: 'IED (a.u.)',
            xMax: iedXMax,
            datasets: [
                ...(leftBiasOk && data.left.plasmaDistribution
                    ? [{ label: '조건 A', color: LEFT_COLOR, data: toDistData(data.left.plasmaDistribution, 'ied') }]
                    : []),
                ...(rightBiasOk && data.right.plasmaDistribution
                    ? [{ label: '조건 B', color: RIGHT_COLOR, data: toDistData(data.right.plasmaDistribution, 'ied') }]
                    : []),
            ],
        },
    ];

    return (
        <div style={{
            position: 'relative', width: `${width}px`, height: '100vh',
            flexShrink: 0, borderLeft: `1px solid ${SL[200]}`,
            backgroundColor: colors.surface.white,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
            {/* 드래그 핸들 */}
            <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
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
                        비교 결과
                    </span>
                    <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: 'none', background: 'none', borderRadius: '6px', cursor: 'pointer', color: SL[400], transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = SL[100]; e.currentTarget.style.color = SL[700]; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = SL[400]; }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Etch Score 게이지 */}
                <div style={{ borderBottom: `0.5px solid ${SL[100]}`, flexShrink: 0 }}>
                    <span style={{ ...secLabel, padding: '16px 18px 0' }}>Etch Score</span>
                    <div style={{ display: 'flex' }}>
                        {SIDES.map(({ label, score, isWinner }) => (
                            <div key={label} style={{
                                flex: 1, padding: '12px 18px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            }}>
                                {isWinner ? (
                                    <span style={{ fontSize: '10px', color: PR[600] }}>{label} · 높음</span>
                                ) : (
                                    <span style={{ fontSize: '10px', color: SL[400] }}>{label}</span>
                                )}
                                <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                                    <svg viewBox="0 0 120 120" width="110" height="110">
                                        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke={SL[100]} strokeWidth="8" />
                                        <circle cx="60" cy="60" r={RADIUS} fill="none"
                                            stroke={isWinner ? PR[500] : SL[300]}
                                            strokeWidth="8"
                                            strokeDasharray={CIRCUMFERENCE}
                                            strokeDashoffset={calcDashOffset(score)}
                                            strokeLinecap="round" transform="rotate(-90 60 60)"
                                            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                                        />
                                    </svg>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '26px', fontWeight: typography.weight.medium, color: SL[900], lineHeight: 1 }}>
                                            {Number(score.toFixed(1))}
                                        </span>
                                        <span style={{ fontSize: '10px', color: SL[400], marginTop: '2px' }}>/ 100</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <span style={{ fontSize: '10px', color: SL[400], textAlign: 'center', lineHeight: '1.5', display: 'block', paddingBottom: '12px' }}>
                        * 실제 식각률(ER)이 아닌 공정 조건 간 상대 비교 지표입니다
                    </span>
                </div>

                {/* 공정 조건 */}
                <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${SL[100]}` }}>
                    <span style={secLabel}>공정 조건</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 0 }}>
                        {SIDES.map(({ label, side }, idx) => (
                            <div key={label} style={{
                                minWidth: 0,
                                paddingRight: idx === 0 ? '12px' : '0',
                                paddingLeft: idx === 1 ? '12px' : '0',
                                borderRight: idx === 0 ? `0.5px solid ${SL[200]}` : 'none',
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: typography.weight.medium, color: SL[500], marginBottom: '6px', paddingBottom: '6px', borderBottom: `0.5px solid ${SL[200]}` }}>
                                    {label}
                                </div>
                                {side.parameters.map(p => (
                                    <div key={p.key} style={rowCard}>
                                        <span style={{ fontSize: '11px', color: SL[500], flexShrink: 0 }}>{PARAM_LABEL[p.key] ?? p.key}</span>
                                        <span style={{ fontSize: '11px', fontWeight: typography.weight.medium, color: SL[900], whiteSpace: 'nowrap', marginLeft: '4px' }}>
                                            {p.value ?? '—'} <span style={{ fontSize: '10px', color: SL[400], fontWeight: typography.weight.regular }}>{p.unit}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plasma 상태 변수 */}
                <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${SL[100]}` }}>
                    <span style={secLabel}>Plasma 상태 변수</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 0 }}>
                        {SIDES.map(({ label, side }, idx) => (
                            <div key={label} style={{
                                minWidth: 0,
                                paddingRight: idx === 0 ? '12px' : '0',
                                paddingLeft: idx === 1 ? '12px' : '0',
                                borderRight: idx === 0 ? `0.5px solid ${SL[200]}` : 'none',
                            }}>
                                {(['ion_flux', 'ion_energy'] as const).map(key => {
                                    const field = side.prediction.prediction_result[key];
                                    return (
                                        <div key={key} style={rowCard}>
                                            <span style={{ fontSize: '11px', color: SL[500], flexShrink: 0 }}>{key === 'ion_flux' ? 'Ion Flux' : 'Ion Energy'}</span>
                                            <span style={{ fontSize: '11px', fontWeight: typography.weight.medium, color: SL[900], whiteSpace: 'nowrap', marginLeft: '4px' }}>
                                                {formatValue(field.value)} <span style={{ fontSize: '10px', color: SL[400], fontWeight: typography.weight.regular }}>{field.unit}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 차이 */}
                <div style={{ padding: '16px 18px', borderBottom: `0.5px solid ${SL[100]}` }}>
                    <span style={secLabel}>차이 (B − A)</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                            { name: 'Etch Score', value: delta.etchScoreDelta, unit: delta.etchScoreUnit },
                            { name: 'Ion Flux', value: delta.ionFluxDelta, unit: delta.ionFluxUnit },
                            { name: 'Ion Energy', value: delta.ionEnergyDelta, unit: delta.ionEnergyUnit },
                        ].map(({ name, value, unit }) => (
                            <div key={name} style={{ backgroundColor: SL[50], borderRadius: '8px', padding: '10px 12px' }}>
                                <div style={{ fontSize: '10px', color: SL[400], marginBottom: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{name}</div>
                                <div style={{ fontSize: '15px', fontWeight: typography.weight.medium, color: value >= 0 ? '#059669' : '#dc2626' }}>
                                    {value >= 0 ? '+' : ''}{formatValue(value)}
                                </div>
                                <div style={{ fontSize: '10px', color: SL[400], marginTop: '2px' }}>{unit}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 물리 분포 */}
                <div style={{ padding: '16px 18px' }}>
                    <span style={secLabel}>물리 분포</span>
                    {excludedLabels.length > 0 && (
                        <div style={{ padding: '8px', backgroundColor: SL[100], borderRadius: '8px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', color: SL[500], lineHeight: '2' }}>
                                ※ {excludedLabels.join(', ')} 조건은 Bias Power 100W 미만으로 데이터 신뢰도 확보를 위해 물리 분포 그래프를 제공하지 않습니다.
                            </span>
                        </div>
                    )}
                    {!allExcluded && (
                        <>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                {leftBiasOk && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: SL[500] }}>
                                        <span style={{ width: '10px', height: '3px', borderRadius: '2px', backgroundColor: LEFT_COLOR, display: 'inline-block' }} />
                                        조건 A
                                    </span>
                                )}
                                {rightBiasOk && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: SL[500] }}>
                                        <span style={{ width: '10px', height: '3px', borderRadius: '2px', backgroundColor: RIGHT_COLOR, display: 'inline-block' }} />
                                        조건 B
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {distGraphs.map(g => (
                                    <DistCard key={g.canvasId} {...g} panelWidth={width} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}