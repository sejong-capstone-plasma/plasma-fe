// ── 요청 ──────────────────────────────────────────
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
  validationStatus: string;   
  processType:      string | null;
  taskType:         string | null;   
  parameters:       BackendParamField[];
  currentEr:        BackendParamField | null;
  allValid:         boolean;
  confirmed:        boolean;
  prediction:       PredictionResult | null;
  predictionError:  string | null;
  failureReason:    string | null;
  createdAt:        string;
  conditionA: {
    label: string;
    parameters: BackendParamField[];
  } | null;
  conditionB: {
    label: string;
    parameters: BackendParamField[];
  } | null;
}

// ── 프론트엔드 내부 타입 (ChatTypes에서 사용) ─────────
export type ExtractResponse =
  | ExtractSuccessResponse
  | ExtractComparisonResponse
  | ExtractValidationError
  | ExtractFormatError
  | ExtractServerError;

export interface ExtractSuccessResponse {
  success:      true;
  code:         'READY_FOR_PREDICTION';
  message:      string;
  request_id:   string;
  process_type: string;
  task_type:    'PREDICTION' | 'OPTIMIZATION' | 'COMPARISON' | 'UNSUPPORTED';
  process_params: {
      pressure:     ParamField;
      source_power: ParamField;
      bias_power:   ParamField;
  };
}

export interface ExtractComparisonResponse {
  success:   true;
  code:      'READY_FOR_COMPARISON';
  message:   string;
  task_type: 'COMPARISON';
  conditionA: { label: string; parameters: BackendParamField[] } | null;
  conditionB: { label: string; parameters: BackendParamField[] } | null;
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

export interface PredictionResult {
  process_params: {
    pressure:     { value: number, unit: string }
    source_power: { value: number, unit: string }
    bias_power:   { value: number, unit: string }
  };
  prediction_result: {
    ion_flux:   { value: number, unit: string }
    ion_energy: { value: number, unit: string }
    etch_score: { value: number, unit: string }
  };
  explanation?: {
    summary: string;
  };
  graphs: {
    cur: { x: number; y: number }[]; 
    iad: { x: number; y: number }[]; 
    ied: { x: number; y: number }[]; 
  } | null;
}

export interface PlasmaDistribution {
  matched_pressure:     number;
  matched_source_power: number;
  matched_bias_power:   number;
  ion_flux:             number;
  avg_energy:           number;
  ied_energy_min:       number;
  ied_x_values:         number[];
  ied_y_values:         number[];
  iad_x_values:         number[];
  iad_y_values:         number[];
  cur_x_values:         number[];
  cur_y_values:         number[];
}

export interface ConditionParams {
  pressure:     { value: number; unit: string };
  source_power: { value: number; unit: string };
  bias_power:   { value: number; unit: string };
}

export interface OptimizationCandidate {
  candidate_id: number;
  process_params: {
    pressure:     { value: number; unit: string };
    source_power: { value: number; unit: string };
    bias_power:   { value: number; unit: string };
  };
  prediction_result: {
    ion_flux:   { value: number; unit: string };
    ion_energy: { value: number; unit: string };
    etch_score: { value: number; unit: string };
  };
  parameter_impact: {
    pressure:     { x: number; y: number }[];
    source_power: { x: number; y: number }[];
    bias_power:   { x: number; y: number }[];
  };
  plasmaDistribution: PlasmaDistribution | null;
}

export interface OptimizationCurrent {
  process_params: {
    pressure:     { value: number; unit: string };
    source_power: { value: number; unit: string };
    bias_power:   { value: number; unit: string };
  };
  prediction_result: {
    ion_flux:   { value: number; unit: string };
    ion_energy: { value: number; unit: string };
    etch_score: { value: number; unit: string };
  };
  plasmaDistribution: PlasmaDistribution | null; 
}

export interface OptimizationResult {
  current:      OptimizationCurrent;
  candidates:   OptimizationCandidate[];  // etch_score 내림차순, 최대 3개
  explanation?: {
    summary: string;
  };
}

export interface ConfirmResponse {
  validation:      BackendValidationResponse;
  prediction:      PredictionResult | null;
  optimization:    OptimizationResult | null;  
  comparison:      ComparisonResult | null;
  plasmaDistribution: PlasmaDistribution | null;
  question:        unknown | null;
  executionError:  string | null;
  predictionError: string | null;
}

export interface ComparisonSide {
  label: string;
  processType: string;
  parameters: BackendParamField[];
  prediction: {
    prediction_result: {
      ion_flux:   { value: number; unit: string };
      ion_energy: { value: number; unit: string };
      etch_score: { value: number; unit: string };
    };
  };
  plasmaDistribution: PlasmaDistribution | null; 
}

export interface ComparisonResult {
  left:  ComparisonSide;
  right: ComparisonSide;
  difference: {
    ionFluxDelta:    number;
    ionFluxUnit:     string;
    ionEnergyDelta:  number;
    ionEnergyUnit:   string;
    etchScoreDelta:  number;
    etchScoreUnit:   string;
  };
  explanation?: {
    summary: string;
  };
}