// ── 요청 ──────────────────────────────────────────────
export interface ExtractRequest {
  inputText: string;
}

// ── 백엔드 원본 응답 타입 (/api/test/extract/save) ────
export interface BackendParamField {
  key:    string;
  label:  string;
  value:  number | null;
  unit:   string;
  status: 'VALID' | 'MISSING' | 'UNCONFIRMED' | 'AI_ERROR' | string;
}

export interface BackendValidationResponse {
  validationId:     number;
  requestId:        string;
  messageId:        number;
  attemptNo:        number;
  sourceType:       string;
  validationStatus: string;   // 'VALID' | 'AI_ERROR' | 'UNKNOWN' 등
  processType:      string | null;
  taskType:         string | null;   // 'PREDICTION' | 'OPTIMIZATION'
  parameters:       BackendParamField[];
  currentEr:        BackendParamField | null;
  allValid:         boolean;
  confirmed:        boolean;
  prediction:       PredictionResult | null;
  predictionError:  string | null;
  failureReason:    string | null;
  createdAt:        string;
}

// ── 프론트엔드 내부 타입 (ChatTypes에서 사용) ─────────
export interface ExtractSuccessResponse {
  success:      true;
  code:         'READY_FOR_PREDICTION';
  message:      string;
  request_id:   string;
  process_type: string;
  task_type:    'PREDICTION' | 'OPTIMIZATION';
  process_params: {
      pressure:     ParamField;
      source_power: ParamField;
      bias_power:   ParamField;
  };
}

export interface ParamField {
  value:  number;
  unit:   string;
  status: 'VALID';
}

export interface ExtractValidationError {
  success:              false;
  code:                 'INPUT_VALIDATION_FAILED';
  message:              string;
  missing_fields:       string[];
  ambiguous_fields:     string[];
  out_of_range_fields:  string[];
  ambiguous_details?:   { field: string; raw_text: string }[];
}

export interface ExtractFormatError {
  success: false;
  code:    'INVALID_JSON';
  message: string;
  errors:  { field: string; reason: string; message: string }[];
}

export interface ExtractServerError {
  success: false;
  message: string;
}

export type ExtractResponse =
  | ExtractSuccessResponse
  | ExtractValidationError
  | ExtractFormatError
  | ExtractServerError;
// ── 예측 결과 타입 ─────────────────────────────────────
export interface PredictionResultField {
  value: number;
  unit:  string;
}

export interface PredictionResult {
  request_id:        string;
  process_type:      string;
  prediction_result: {
    ion_flux:   PredictionResultField;
    ion_energy: PredictionResultField;
    etch_score: PredictionResultField;
  };
  explanation: {
    summary: string;
    details: string[];
  };
}

export interface ConfirmResponse {
  validation:      BackendValidationResponse;
  prediction:      PredictionResult | null;
  predictionError: string | null;
}