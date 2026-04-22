export const colors = {
    // Primary — 인디고 계열 (메인 액션, AI 요소)
    primary: {
      50:  '#eef2ff',
      100: '#e0e7ff',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
    },
  
    // Secondary — 퍼플 계열 (보조 강조)
    secondary: {
      400: '#c084fc',
      500: '#a855f7',
    },
  
    // Slate — 텍스트, 배경, 테두리
    slate: {
      50:  '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      700: '#334155',
      900: '#0f172a',
    },
  
    // Semantic — 상태별 색상
    semantic: {
      error:        '#ef4444',
      errorBg:      '#fff5f5',
      errorBorder:  '#fecaca',
      warning:      '#f59e0b',
      warningBg:    '#fffbeb',
      warningBorder:'#fde68a',
      success:      '#10b981',
    },
  
    // Surface
    surface: {
      white:      '#ffffff',
      background: '#ffffff',
      card:       '#f8fafc',
    },
  } as const;

  export const typography = {
    size: {
      ti:   '20px',  // 헤더
      xs:   '12px',  // 카운터, 단위, 뱃지
      sm:   '13px',  // 안내 문구, 보조 텍스트
      base: '15px',  // 일반 UI 텍스트
      md:   '16px',  // 메시지 본문
      lg:   '24px',  // 섹션 타이틀
      xl:   '30px',  // 초기 화면 h1
    },
    weight: {
      regular: 300,
      medium:  500,
      bold:    600,
    },
    lineHeight: {
      tight:  '1.4',
      normal: '1.6',
      loose:  '1.8',
    },
  } as const;