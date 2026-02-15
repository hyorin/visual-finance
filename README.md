# Visual Finance

배당 포트폴리오 기반 재정 자유 시뮬레이터. 현재 자산, 월 생활비, 추가 불입액과 배당 포트폴리오 구성을 입력하면, 배당 수익이 생활비를 넘어서는 **생존능선 돌파 시점**을 시각적으로 보여줍니다.

## 주요 기능

- **재정 시뮬레이션 차트** - 연도별 총 자산(Bar)과 월 배당금/생활비(Line)를 ComposedChart로 시각화
- **생존지수 실시간 표시** - 차트 호버/클릭으로 특정 연도의 배당 대비 생활비 비율(생존지수) 확인
- **배당 포트폴리오 편집** - SCHD, O, JEPI, JEPQ 등 티커별 CAGR, 배당률, 배분 비중을 자유롭게 조정
- **티커 추가/삭제** - 커스텀 티커를 추가하고 비중을 자동 정규화
- **목표 달성 시점 계산** - 배당금이 목표 생활비를 초과하는 연도(D-Year)를 자동 산출

## 기술 스택

- **React 19** + **Vite 8**
- **Recharts** - 차트 시각화
- **Tailwind CSS 3** - 스타일링

## 시작하기

```bash
npm install
npm run dev
```

## 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 검사 |

## 프로젝트 구조

```
src/
├── components/
│   └── FinancialDashboard.jsx   # 메인 대시보드 컴포넌트
├── App.jsx
├── main.jsx
└── index.css
```

## 라이선스

MIT
