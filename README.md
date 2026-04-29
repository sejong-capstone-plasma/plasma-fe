# Plasma AI

대화형 AI 기반 반도체 플라즈마 Etch 공정 수율 예측 및 공정 의사결정 지원 플랫폼

**배포 URL:** https://plasma-ai-gamma.vercel.app/

---

## 프로젝트 개요

아르곤(Ar) 가스 기반 TCP(Planar ICP) + Bias Power 인가 장비 환경에서,  
사용자가 자연어로 입력한 공정 조건을 AI가 해석하여 예측 및 최적화 방향을 제안합니다.

## 기술 스택

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **배포:** Vercel
- **백엔드 연동:** AWS EC2

---

## 입력 파라미터 허용 범위

| 파라미터 | 범위 | 단위 |
|---|---|---|
| 압력 (Pressure) | 2 ~ 10 | mTorr |
| 소스 파워 (Source Power) | 100 ~ 500 | W |
| 바이어스 파워 (Bias Power) | 0 ~ 1000 | W |

---

## 입력 예시

```
압력 8mTorr, 소스 파워 450W, 바이어스 파워 80W 조건 분석해줘
압력 8mTorr, 소스 파워 450W, 바이어스 파워 80W에서 Etch Rate 높이는 방향으로 최적화해줘
```

---

## 로컬 실행

```bash
npm install
npm run dev
```

---

## 주의사항

Etch Score는 ion_flux · ion_energy 기반 상대 지표이며, 실제 Etch Rate와 다를 수 있습니다.  
중요한 공정 결정은 엔지니어의 검토가 필요합니다.
