import type {
  BackendValidationResponse,
  ConfirmResponse,
  ExtractResponse,
  ExtractSuccessResponse,
  ExtractValidationError,
} from '../types/api';

export interface BackendChatMessageResponse {
  messageId: number;
  sessionId: string;
  role: string;
  inputText: string;
  createdAt: string;
  validations: BackendValidationResponse[];
}

export function adaptResponse(backend: BackendValidationResponse): ExtractResponse {
  if (backend.validationStatus === 'AI_ERROR') {
    return { success: false, message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  if (backend.allValid) {
    const getParam = (key: string) => {
      const p = backend.parameters.find(p => p.key === key);
      return { value: p?.value ?? 0, unit: p?.unit ?? '', status: 'VALID' as const };
    };
    const result: ExtractSuccessResponse = {
      success: true,
      code: 'READY_FOR_PREDICTION',
      message: '파라미터가 정상적으로 추출되었습니다. 아래 조건으로 분석을 진행할까요?',
      request_id: backend.requestId,
      process_type: backend.processType ?? '',
      task_type: (backend.taskType as 'PREDICTION' | 'OPTIMIZATION') ?? 'PREDICTION',
      process_params: {
        pressure: getParam('pressure'),
        source_power: getParam('source_power'),
        bias_power: getParam('bias_power'),
      },
    };
    return result;
  }

  const missing = backend.parameters.filter(p => p.status === 'MISSING').map(p => p.key);
  const ambiguous = backend.parameters.filter(p => p.status === 'UNCONFIRMED' || p.status === 'AMBIGUOUS').map(p => p.key);
  const outOfRange = backend.parameters.filter(
    p => !['VALID', 'MISSING', 'UNCONFIRMED', 'AMBIGUOUS', 'AI_ERROR'].includes(p.status)
  ).map(p => p.key);

  const result: ExtractValidationError = {
    success: false,
    code: 'INPUT_VALIDATION_FAILED',
    message: '누락되거나 모호한 항목의 수치를 추가로 입력해 주세요.',
    missing_fields: missing,
    ambiguous_fields: ambiguous,
    out_of_range_fields: outOfRange,
  };
  return result;
}

// ── sessionId 관리 ────────────────────────────────────
let currentSessionId: string = generateSessionId();

function generateSessionId(): string {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

export function resetSession(): void {
  currentSessionId = generateSessionId();
}

export function setSession(sessionId: string): void {
  currentSessionId = sessionId;
}

export function getCurrentSessionId(): string {
  return currentSessionId;
}

// ── 공통 fetch 옵션 (쿠키 포함) ──────────────────────
const FETCH_OPTS = {
  credentials: 'include' as const,
};

// ── 세션 목록 조회 ────────────────────────────────────
export async function fetchSessions(): Promise<{ sessionId: string; title: string; lastMessageAt: string; messageCount: number }[]> {
  try {
    const res = await fetch('/api/chat/messages/sessions', { ...FETCH_OPTS });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ── 세션 메시지 조회 ──────────────────────────────────
export async function fetchSessionMessages(sessionId: string): Promise<BackendChatMessageResponse[]> {
  try {
    const res = await fetch(`/api/chat/messages/sessions/${sessionId}`, { ...FETCH_OPTS });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ── 메시지 전송 ───────────────────────────────────────
export interface ExtractResult {
  messageId: number;
  validationId: number;
  response: ExtractResponse;
  allParams: Record<string, number>; // VALID 포함 전체 파라미터 값
}

export async function extractParams(inputText: string, signal?: AbortSignal): Promise<ExtractResult> {
  try {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, inputText }),
      signal,
      ...FETCH_OPTS,
    });

    if (!res.ok) {
      if (res.status >= 500) return { messageId: -1, validationId: -1, response: { success: false, message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, allParams: {} };
      return { messageId: -1, validationId: -1, response: { success: false, code: 'INVALID_JSON', message: '입력을 처리하지 못했습니다. 다시 입력해 주세요.', errors: [] }, allParams: {} };
    }

    const data: BackendChatMessageResponse = await res.json();
    const validation = data.validations?.[0];
    if (!validation) return { messageId: data.messageId, validationId: -1, response: { success: false, message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, allParams: {} };

    // value가 존재하는 파라미터 전체 수집 (VALID뿐 아니라 추출된 모든 값 포함)
    const allParams: Record<string, number> = {};
    validation.parameters.forEach(p => {
      if (p.value != null) allParams[p.key] = p.value as number;
    });

    return {
      messageId: data.messageId,
      validationId: validation.validationId,
      response: adaptResponse(validation),
      allParams,
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { messageId: -1, validationId: -1, response: { success: false, message: '__CANCELLED__' }, allParams: {} };
    }
    return { messageId: -1, validationId: -1, response: { success: false, message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, allParams: {} };
  }
}

// ── 재검증 ────────────────────────────────────────────
export interface RevalidateResult {
  validationId: number;
  response: ExtractResponse;
}

const UNIT_MAP: Record<string, string> = {
  pressure: 'mTorr',
  source_power: 'W',
  bias_power: 'W',
};

export async function revalidateParams(
  messageId: number,
  values: Record<string, number>,
  signal?: AbortSignal,
): Promise<RevalidateResult> {
  try {
    const parameters = Object.entries(values).map(([key, value]) => ({
      key,
      value,
      unit: UNIT_MAP[key] ?? null
    }));
    const res = await fetch(`/api/chat/messages/${messageId}/validations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters }),
      signal,
      ...FETCH_OPTS,
    });

    if (!res.ok) return { validationId: -1, response: { success: false, message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' } };

    const data: BackendValidationResponse = await res.json();
    return { validationId: data.validationId, response: adaptResponse(data) };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { validationId: -1, response: { success: false, message: '__CANCELLED__' } };
    }
    return { validationId: -1, response: { success: false, message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' } };
  }
}

// ── 분석 실행 확정 ────────────────────────────────────
export async function confirmValidation(
  messageId: number,
  validationId: number,
  requestedTaskType?: 'PREDICTION' | 'OPTIMIZATION')
  : Promise<ConfirmResponse | null> {
  try {
    const res = await fetch(`/api/chat/messages/${messageId}/validations/${validationId}/confirm`, {
      method: 'POST',
      headers: requestedTaskType ? { 'Content-Type': 'application/json' } : undefined,
      body: requestedTaskType ? JSON.stringify({ requestedTaskType }) : undefined,
      ...FETCH_OPTS,
    });
    if (!res.ok) return null;
    return await res.json() as ConfirmResponse;
  } catch {
    return null;
  }
}