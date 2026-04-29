import { useState, useEffect } from 'react';
import type { PredictionHistoryItem } from '../App';
import { fetchSessions } from '../api/analysis';
import { colors, typography } from '../styles/tokens';
import { SquarePen } from 'lucide-react';

// ── 타입 ──────────────────────────────────────────────
interface ChatSession {
  sessionId: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

interface SidebarProps {
  onNewChat: () => void;
  onSelectSession?: (sessionId: string) => void;
  predictionHistory?: PredictionHistoryItem[];
  onSelectHistory?: (item: PredictionHistoryItem) => void;
  activeSessionId?: string;
  sessionRefreshTrigger?: number;
}

// ── 상수 ──────────────────────────────────────────────
const BREAKPOINT = 1000;

// ── 아이콘 ─────────────────────────────────────────────
const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const PlusIcon = () => <SquarePen size={20} strokeWidth={1.5} />;

// ── 탭 콘텐츠 ──────────────────────────────────────────
interface TabContentProps {
  tab: 'chat' | 'history';
  activeId: string | null;
  onTabChange: (t: 'chat' | 'history') => void;
  onSelect: (id: string) => void;
  sessions: ChatSession[];
  sessionsLoading: boolean;
  predictionHistory?: PredictionHistoryItem[];
  onSelectHistory?: (item: PredictionHistoryItem) => void;
}

const TabContent = ({ tab, activeId, onTabChange, onSelect, sessions, sessionsLoading, predictionHistory = [], onSelectHistory }: TabContentProps) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    {/* 탭 헤더 */}
    <div style={{
      display: 'flex',
      borderBottom: `1px solid ${colors.slate[200]}`,
      margin: '30px 16px 0',
      flexShrink: 0,
    }}>
      {(['chat', 'history'] as const).map((t) => (
        <button key={t} onClick={() => onTabChange(t)} style={{
          flex: 1, padding: '8px 0',
          background: 'none', border: 'none',
          borderBottom: tab === t ? `2px solid ${colors.slate[900]}` : '2px solid transparent',
          cursor: 'pointer',
          fontSize: typography.size.sm,
          color: tab === t ? colors.slate[900] : colors.slate[400],
          whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}>
          {t === 'chat' ? '채팅' : '분석 히스토리'}
        </button>
      ))}
    </div>

    {/* 채팅 목록 — 실제 API */}
    {tab === 'chat' && (
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {sessionsLoading ? (
          <p style={{ fontSize: typography.size.xs, color: colors.slate[400], padding: '12px 18px' }}>
            불러오는 중...
          </p>
        ) : sessions.length === 0 ? (
          <p style={{ fontSize: typography.size.xs, color: colors.slate[400], padding: '12px 18px' }}>
            대화 내역이 없습니다.
          </p>
        ) : (
          sessions.map((session) => (
            <button
              key={session.sessionId}
              onClick={() => onSelect(session.sessionId)}
              style={{ width: '100%', padding: '1px 8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div
                className={`hover:bg-slate-200 transition-colors rounded-lg ${activeId === session.sessionId ? 'bg-slate-200' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px' }}
              >
                <span style={{
                  fontSize: typography.size.sm, color: colors.slate[700],
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {session.title || session.sessionId}
                </span>

              </div>
            </button>
          ))
        )}
      </div>
    )}

    {/* 히스토리 목록 — 실제 데이터 */}
    {tab === 'history' && (
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {predictionHistory.length === 0 ? (
          <p style={{ fontSize: typography.size.xs, color: colors.slate[400], padding: '12px 18px' }}>
            분석 히스토리가 없습니다.
          </p>
        ) : (
          predictionHistory.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectHistory?.(item)}
              style={{ width: '100%', padding: '1px 8px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div
                className={`hover:bg-slate-200 transition-colors rounded-lg ${activeId === item.id ? 'bg-slate-200' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 10px' }}
              >
                <span style={{
                  fontSize: typography.size.xs, fontWeight: typography.weight.medium,
                  color: colors.primary[600], backgroundColor: colors.primary[50],
                  padding: '1px 6px', borderRadius: '3px',
                  border: `1px solid ${colors.primary[100]}`,
                  alignSelf: 'flex-start',
                }}>
                  예측
                </span>
                <span style={{
                  fontSize: typography.size.sm, color: colors.slate[700],
                  fontWeight: typography.weight.medium,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.label}
                </span>
                <span style={{ fontSize: typography.size.xs, color: colors.slate[400] }}>
                  Score {Number(item.predictionData.prediction_result.etch_score.value.toFixed(1))}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    )}
  </div>
);

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function Sidebar({ onNewChat, onSelectSession, predictionHistory = [], 
  onSelectHistory, activeSessionId, sessionRefreshTrigger }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<'chat' | 'history'>('chat');
  const [isOverlay, setIsOverlay] = useState(window.innerWidth < BREAKPOINT);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 창 크기 감지
  useEffect(() => {
    const handleResize = () => {
      setIsOverlay(window.innerWidth < BREAKPOINT);
      if (window.innerWidth >= BREAKPOINT) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 사이드바 열릴 때 + 채팅 탭 선택 시 세션 목록 갱신
  useEffect(() => {
    if (tab !== 'chat') return;
    if (!isOpen && !isOverlay) return; // 데스크탑 닫힌 상태면 패스
    setSessionsLoading(true);
    fetchSessions().then(data => {
      setSessions(data);
      setSessionsLoading(false);
    });
  }, [isOpen, tab, isOverlay, sessionRefreshTrigger]);

  useEffect(() => {
    if (activeSessionId) setActiveId(activeSessionId);
  }, [activeSessionId]);

  // 새 채팅 후 목록 갱신
  const handleNewChat = () => {
    onNewChat();
    fetchSessions().then(setSessions);
  };

  const tabContentProps = {
    tab,
    activeId,
    onTabChange: setTab,
    onSelect: (id: string) => {
      setActiveId(id);
      if (tab === 'chat') onSelectSession?.(id);
    },
    sessions,
    sessionsLoading,
    predictionHistory,
    onSelectHistory: (item: PredictionHistoryItem) => {
      setActiveId(item.id);
      onSelectHistory?.(item);
    },
  };

  // ── 오버레이 모드 (모바일) ──
  if (isOverlay) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', top: '8px', left: '4px', zIndex: 50,
            border: 'none', background: 'none', cursor: 'pointer',
            color: colors.slate[500], padding: '4px',
          }}
        >
          <div className="hover:bg-slate-200 rounded-lg transition-colors"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }}>
            <HamburgerIcon />
          </div>
        </button>

        {isOpen && (
          <div onClick={() => setIsOpen(false)} style={{
            position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.3)',
          }} />
        )}

        <div style={{
          position: 'fixed', top: 0, left: 0, zIndex: 50,
          width: '75vw', maxWidth: '270px', height: '100vh',
          backgroundColor: colors.slate[50], borderRight: `1px solid ${colors.slate[200]}`,
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          borderTopRightRadius: '8px', borderBottomRightRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px' }}>
            <div
              className="hover:bg-slate-200 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', cursor: 'pointer', color: colors.slate[500] }}
            >
              <HamburgerIcon />
            </div>
          </div>

          <button
            onClick={handleNewChat}
            title="새 채팅"
            style={{ display: 'flex', alignItems: 'center', padding: '0px 12px', border: 'none', background: 'none', cursor: 'pointer', color: colors.slate[500], width: '100%' }}
          >
            <div className="hover:bg-slate-200 rounded-lg transition-colors"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 8px', width: isOpen ? '100%' : '36px', height: '36px', overflow: 'hidden', transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusIcon />
              </div>
              <span style={{ fontSize: typography.size.sm, color: colors.slate[700], whiteSpace: 'nowrap', opacity: isOpen ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: isOpen ? 'auto' : 'none' }}>
                새 채팅
              </span>
            </div>
          </button>

          <TabContent {...tabContentProps} />
        </div>
      </>
    );
  }

  // ── 데스크탑 모드 ──
  return (
    <div style={{
      width: isOpen ? '25vw' : '53px',
      minWidth: isOpen ? '200px' : '53px',
      maxWidth: isOpen ? '270px' : '53px',
      height: '100vh',
      backgroundColor: colors.slate[50],
      borderRight: `1px solid ${colors.slate[200]}`,
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ width: '100%', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px' }}>
          <div
            className="hover:bg-slate-200 rounded-lg transition-colors"
            onClick={() => setIsOpen(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', cursor: 'pointer', color: colors.slate[500] }}
          >
            <HamburgerIcon />
          </div>
        </div>

        <button
          onClick={handleNewChat}
          title="새 채팅"
          style={{ display: 'flex', alignItems: 'center', padding: '0px 8px', border: 'none', background: 'none', cursor: 'pointer', color: colors.slate[500], width: '100%' }}
        >
          <div className="hover:bg-slate-200 rounded-lg transition-colors"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 8px', width: isOpen ? '100%' : '36px', height: '36px', overflow: 'hidden', transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusIcon />
            </div>
            <span style={{ fontSize: typography.size.sm, color: colors.slate[700], whiteSpace: 'nowrap', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease', pointerEvents: isOpen ? 'auto' : 'none' }}>
              새 채팅
            </span>
          </div>
        </button>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        transition: 'opacity 0.2s ease',
        minWidth: '200px',
      }}>
        <TabContent {...tabContentProps} />
      </div>
    </div>
  );
}