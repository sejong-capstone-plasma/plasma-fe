# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plasma AI is a Korean-language conversational AI platform for semiconductor plasma Etch process yield prediction and optimization. Users describe process conditions in natural language; the AI extracts parameters, validates them, then calls a backend to predict or optimize Etch outcomes.

Target equipment: Argon (Ar) gas-based TCP (Planar ICP) + Bias Power.

Deployed at: https://plasma-ai-gamma.vercel.app/  
Backend: AWS EC2 at `http://13.209.213.24`

## Commands

```bash
npm run dev      # Start dev server (proxies /api/* to the EC2 backend)
npm run build    # Type-check + production build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

There are no tests in this project.

## Architecture

**Stack:** React 19, TypeScript, Vite, Tailwind CSS v4 (via `@tailwindcss/vite` plugin), Chart.js, Framer Motion, Lucide React.

**API proxy:** `vite.config.ts` proxies `/api/*` to the EC2 backend in dev. `vercel.json` does the same in production via rewrites.

### Data flow

1. User types a natural-language process condition into `InputArea`.
2. `App.tsx` calls `extractParams()` (`src/api/analysis.ts`) → `POST /api/chat/messages` with `{ sessionId, inputText }`.
3. Backend returns a `BackendChatMessageResponse` with a `validations[]` array. `adaptResponse()` converts the first validation into a frontend `ExtractResponse` union type.
4. If params are fully valid (`allValid: true`) → `App` pushes a `param-confirm` message; `ChatArea` renders a `ParamConfirmCard` (editable sliders for pressure / source_power / bias_power).
5. If params are incomplete → `param-error` message; `ParamErrorCard` lets the user fill in missing/ambiguous fields and calls `revalidateParams()` → `POST /api/chat/messages/:id/validations`.
6. User clicks "예측" or "최적화" → `handleConfirm()` calls `confirmValidation()` → `POST /api/chat/messages/:id/validations/:vId/confirm` with `{ requestedTaskType }`.
7. Prediction result opens `PredictionPanel`; optimization result opens `OptimizationPanel` (both are slide-in panels from the right side of the layout).

### Session management

Session IDs are generated client-side in `src/api/analysis.ts` (`session-<timestamp>-<random>`). The active session is stored in a module-level variable (`currentSessionId`). `Sidebar` fetches all sessions from `GET /api/chat/messages/sessions` and lets users switch sessions, which triggers `fetchSessionMessages()` to restore the full message history.

### Key types (`src/types/api.ts`)

- `ExtractSuccessResponse` — all three params are VALID, ready for prediction/optimization.
- `ExtractValidationError` — one or more params are MISSING, AMBIGUOUS, or out of range.
- `PredictionResult` — contains `process_params`, `prediction_result` (ion_flux, ion_energy, etch_score), and `graphs` (cur, iad, ied data series).
- `OptimizationResult` — `current` baseline + up to 3 `candidates` sorted by etch_score.
- `ConfirmResponse` — wraps the final backend response including `prediction`, `optimization`, and error fields.

### Message types in chat

Each message in the `messages` array has a `type` field that controls rendering in `ChatTypes`:

| type | rendered as |
|---|---|
| `default` | plain text (markdown `**bold**` supported) |
| `param-confirm` | `ParamConfirmCard` — editable param values + 예측/최적화 buttons |
| `param-error` | `ParamErrorCard` — input fields for missing/invalid params |
| `prediction-result` | Summary card with Etch Score + "결과 보기" button |
| `optimization-result` | Summary card with "결과 보기" button |
| `error-retry` | Error text + retry button |

### Design tokens

All colors, font sizes, and weights are centralized in `src/styles/tokens.ts`. Use `colors.*` and `typography.*` from there instead of raw CSS values. Tailwind is used mainly for layout utilities; component-level styling uses inline styles referencing the tokens.

### Parameter ranges

| Parameter | Range | Unit |
|---|---|---|
| pressure | 2 – 10 | mTorr |
| source_power | 100 – 500 | W |
| bias_power | 0 – 1000 | W |
