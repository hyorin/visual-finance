import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const RECOMMENDED_EXPENSE_MAN = 250; // 250만원 고정
const RECOMMENDED_CURRENT_ASSET_MAN = 10000; // 1억(만원 단위)
const RECOMMENDED_MONTHLY_CONTRIBUTION_MAN = 150; // 월 추가 불입 추천(만원)

// 배당 포트폴리오 추천값(평균 배당률은 대략치)
// growthPct는 과거 성과 기반 연 환산(총수익률 가정) 값
const RECOMMENDED_DIVIDEND_PORTFOLIO = [
  { ticker: 'SCHD', avgYieldPct: 3.5, growthPct: 13.97, growthLabel: '10Y CAGR', allocationPct: 50 },
  { ticker: 'O', avgYieldPct: 5.5, growthPct: 6.53, growthLabel: '10Y CAGR', allocationPct: 20 },
  { ticker: 'JEPI', avgYieldPct: 8.0, growthPct: 12.14, growthLabel: 'Since 2020-05-21 CAGR', allocationPct: 20 },
  { ticker: 'JEPQ', avgYieldPct: 9.0, growthPct: 15.50, growthLabel: 'Since 2022-05-04 CAGR', allocationPct: 10 },
];

// 시뮬레이션 시작 연도(현재)
const START_YEAR = new Date().getFullYear();
const MAX_FREEDOM_YEARS = 60; // 예상 자유시간 탐색 범위(년)

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round1 = (n) => Math.round(n * 10) / 10;

const formatNumber = (n) => new Intl.NumberFormat('ko-KR').format(n);

const formatManToKoreanMoney = (man) => {
  const v = Number(man) || 0;
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${formatNumber(Math.round(v))}만`;
};

const toPeriodText = (key, isHalfYearMode) => {
  const t = Number(key);
  if (!Number.isFinite(t)) return String(key);

  const y = Math.floor(t);
  const frac = t - y;

  if (!isHalfYearMode) return `${y}`;

  // 반기 단위 표기: Q1 / Q3 로 구분 (예: 2025/Q3)
  // t가 정수이면 Q1, 0.5이면 Q3로 간주
  return frac >= 0.4 ? `${y}/Q3` : `${y}/Q1`;
};

const getSurvivalMeta = (pct) => {
  if (!Number.isFinite(pct)) return { label: '—', pill: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' };
  if (pct < 70) return { label: '위험', pill: 'bg-red-100 text-red-700', bar: 'bg-red-500' };
  if (pct < 100) return { label: '주의', pill: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' };
  if (pct < 130) return { label: '안정', pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' };
  return { label: '여유', pill: 'bg-teal-100 text-teal-700', bar: 'bg-teal-600' };
};

const HalfYearTick = ({ x, y, payload }) => {
  const label = toPeriodText(payload?.value, true); // e.g. 2026/Q1
  const parts = String(label).split('/');
  const year = parts[0] ?? '';
  const q = parts[1] ?? '';

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748b" fontSize={10}>
        <tspan x={0} dy={0}>{`${year}/`}</tspan>
        <tspan x={0} dy={12}>{q}</tspan>
      </text>
    </g>
  );
};

const AddTickerCard = ({ onAdd }) => {
  const [ticker, setTicker] = useState('');
  const [growthPct, setGrowthPct] = useState('');
  const [avgYieldPct, setAvgYieldPct] = useState('');
  const [allocationPct, setAllocationPct] = useState(10);

  const normalizedTicker = (ticker || '').trim().toUpperCase();

  const recommended = useMemo(
    () => RECOMMENDED_DIVIDEND_PORTFOLIO.find((r) => r.ticker.toUpperCase() === normalizedTicker) ?? null,
    [normalizedTicker],
  );

  const canAdd = normalizedTicker.length > 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="w-16">
        <p className="text-[10px] text-slate-400 font-bold">티커</p>
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9.-]/g, ''))}
          className="w-full text-sm font-black text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
          placeholder="ex) VTI"
          aria-label="추가할 티커"
          list="ticker-suggestions"
        />
        <datalist id="ticker-suggestions">
          {RECOMMENDED_DIVIDEND_PORTFOLIO.map((r) => (
            <option key={r.ticker} value={r.ticker} />
          ))}
        </datalist>
      </div>

      <div className="w-28">
        <p className="text-[10px] text-slate-400 font-bold">CAGR(연 %)</p>
        <input
          type="number"
          inputMode="decimal"
          step={0.01}
          value={growthPct}
          onChange={(e) => setGrowthPct(e.target.value)}
          className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
          placeholder="ex) 9.50"
          aria-label="추가 티커 CAGR(연 %)"
        />
      </div>

      <div className="w-28">
        <p className="text-[10px] text-slate-400 font-bold">배당률(연 %)</p>
        <input
          type="number"
          inputMode="decimal"
          step={0.01}
          value={avgYieldPct}
          onChange={(e) => setAvgYieldPct(e.target.value)}
          className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
          placeholder="ex) 1.60"
          aria-label="추가 티커 배당률(연 %)"
        />
      </div>

      <div className="w-24">
        <p className="text-[10px] text-slate-400 font-bold">배분(%)</p>
        <input
          type="number"
          inputMode="decimal"
          step={0.1}
          value={allocationPct}
          onChange={(e) => setAllocationPct(Number(e.target.value))}
          className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
          aria-label="추가 티커 자산 배분(%)"
        />
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="text-xs font-black text-slate-600 hover:underline text-left"
          disabled={!normalizedTicker}
          onClick={() => {
            if (!normalizedTicker) return;
            const q1 = `${normalizedTicker} 10 year CAGR`;
            const q2 = `${normalizedTicker} dividend yield`;
            window.open(`https://www.google.com/search?q=${encodeURIComponent(q1)}`, '_blank', 'noopener,noreferrer');
            window.open(`https://www.google.com/search?q=${encodeURIComponent(q2)}`, '_blank', 'noopener,noreferrer');
          }}
        >
          웹 검색
        </button>

        <button
          type="button"
          className="text-xs font-black text-indigo-600 hover:underline text-left"
          disabled={!recommended}
          onClick={() => {
            if (!recommended) return;
            setGrowthPct(String(recommended.growthPct ?? ''));
            setAvgYieldPct(String(recommended.avgYieldPct ?? ''));
          }}
        >
          추천값 채우기
        </button>

        <button
          type="button"
          className={`text-xs font-black ${canAdd ? 'text-emerald-600 hover:underline' : 'text-slate-300'} text-left`}
          disabled={!canAdd}
          onClick={() => {
            const g = Number(growthPct);
            const y = Number(avgYieldPct);

            onAdd({
              ticker: normalizedTicker,
              growthPct: Number.isFinite(g) ? g : 0,
              growthLabel: recommended?.growthLabel ?? 'Manual',
              avgYieldPct: Number.isFinite(y) ? y : 0,
              allocationPct,
            });

            // keep ticker, clear numeric fields for rapid entry
            setGrowthPct('');
            setAvgYieldPct('');
            setAllocationPct(10);
          }}
        >
          추가
        </button>
      </div>
    </div>
  );
};

const FinancialDashboard = () => {
  const [currentAssetMan, setCurrentAssetMan] = useState(RECOMMENDED_CURRENT_ASSET_MAN);
  const [targetExpenseMan, setTargetExpenseMan] = useState(RECOMMENDED_EXPENSE_MAN);
  const [monthlyContributionMan, setMonthlyContributionMan] = useState(RECOMMENDED_MONTHLY_CONTRIBUTION_MAN);

  const [dividendPortfolio, setDividendPortfolio] = useState(RECOMMENDED_DIVIDEND_PORTFOLIO);
  const [portfolioOpen, setPortfolioOpen] = useState(true);

  const applyAllocationNormalized = (items, idx, allocationPct) => {
    const next = items.map((p) => ({ ...p }));
    const v = clamp(Number.isFinite(allocationPct) ? allocationPct : 0, 0, 100);

    const remaining = 100 - v;
    const otherIdxs = next.map((_, i) => i).filter((i) => i !== idx);

    if (remaining <= 0) {
      next[idx].allocationPct = 100;
      otherIdxs.forEach((i) => {
        next[i].allocationPct = 0;
      });
      return next;
    }

    const othersSum = otherIdxs.reduce(
      (acc, i) => acc + (Number.isFinite(next[i].allocationPct) ? next[i].allocationPct : 0),
      0,
    );

    next[idx].allocationPct = round1(v);

    if (othersSum > 0) {
      const factor = remaining / othersSum;
      otherIdxs.forEach((i) => {
        const base = Number.isFinite(next[i].allocationPct) ? next[i].allocationPct : 0;
        next[i].allocationPct = round1(base * factor);
      });
    } else {
      const each = round1(remaining / Math.max(1, otherIdxs.length));
      otherIdxs.forEach((i) => {
        next[i].allocationPct = each;
      });
    }

    // 반올림 오차 보정: 마지막(변경된 idx가 아닌) 항목에 diff를 몰아주기
    const sum = next.reduce((acc, row) => acc + (Number.isFinite(row.allocationPct) ? row.allocationPct : 0), 0);
    const diff = round1(100 - sum);
    const adjustIdx = idx === next.length - 1 ? next.length - 2 : next.length - 1;
    if (adjustIdx >= 0 && adjustIdx !== idx) {
      next[adjustIdx].allocationPct = round1(clamp((next[adjustIdx].allocationPct ?? 0) + diff, 0, 100));
    }

    return next;
  };

  const setAllocationNormalized = (idx, allocationPct) => {
    setDividendPortfolio((prev) => applyAllocationNormalized(prev, idx, allocationPct));
  };

  const normalizeAfterRemove = (items) => {
    const sum = items.reduce((acc, row) => acc + (Number.isFinite(row.allocationPct) ? row.allocationPct : 0), 0);
    if (!items.length) return items;

    if (!sum) {
      const each = round1(100 / items.length);
      const next = items.map((p) => ({ ...p, allocationPct: each }));
      const diff = round1(100 - next.reduce((acc, r) => acc + r.allocationPct, 0));
      next[next.length - 1].allocationPct = round1(clamp(next[next.length - 1].allocationPct + diff, 0, 100));
      return next;
    }

    const factor = 100 / sum;
    const next = items.map((p) => ({ ...p, allocationPct: round1((p.allocationPct ?? 0) * factor) }));
    const diff = round1(100 - next.reduce((acc, r) => acc + (r.allocationPct ?? 0), 0));
    next[next.length - 1].allocationPct = round1(clamp((next[next.length - 1].allocationPct ?? 0) + diff, 0, 100));
    return next;
  };

  const removeTickerAt = (idx) => {
    setDividendPortfolio((prev) => normalizeAfterRemove(prev.filter((_, i) => i !== idx)));
  };

  const allocationSum = useMemo(
    () => dividendPortfolio.reduce((acc, row) => acc + (Number.isFinite(row.allocationPct) ? row.allocationPct : 0), 0),
    [dividendPortfolio],
  );

  const portfolioDividendYieldPct = useMemo(() => {
    const sum = allocationSum;
    if (!sum) return 0;

    // 합계가 100이 아니어도, 입력한 비중의 상대값으로 평균 배당률을 계산
    const weighted = dividendPortfolio.reduce((acc, row) => {
      const w = Number.isFinite(row.allocationPct) ? row.allocationPct : 0;
      const y = Number.isFinite(row.avgYieldPct) ? row.avgYieldPct : 0;
      return acc + w * y;
    }, 0);

    return weighted / sum;
  }, [allocationSum, dividendPortfolio]);

  const portfolioGrowthPct = useMemo(() => {
    const sum = allocationSum;
    if (!sum) return 0;

    const weighted = dividendPortfolio.reduce((acc, row) => {
      const w = Number.isFinite(row.allocationPct) ? row.allocationPct : 0;
      const g = Number.isFinite(row.growthPct) ? row.growthPct : 0;
      return acc + w * g;
    }, 0);

    return weighted / sum;
  }, [allocationSum, dividendPortfolio]);

  const freedom = (() => {
    const safeCurrentAsset = Number.isFinite(currentAssetMan) && currentAssetMan > 0 ? currentAssetMan : 0;
    const safeExpense = Number.isFinite(targetExpenseMan) && targetExpenseMan > 0 ? targetExpenseMan : 0;
    const safeMonthlyContribution =
      Number.isFinite(monthlyContributionMan) && monthlyContributionMan > 0 ? monthlyContributionMan : 0;
    const safeGrowthReturn = Number.isFinite(portfolioGrowthPct) ? portfolioGrowthPct : 0;
    const safeDividendYield = Number.isFinite(portfolioDividendYieldPct) ? portfolioDividendYieldPct : 0;

    if (!safeExpense || !safeDividendYield) {
      return {
        computable: false,
        reached: false,
        year: null,
        horizonYear: START_YEAR + MAX_FREEDOM_YEARS,
      };
    }

    const r = safeGrowthReturn / 100;
    const annualContribution = safeMonthlyContribution * 12;

    const assetAtYearIndex = (i) => {
      const growth = Math.pow(1 + r, i);
      const contribGrowth = r === 0 ? annualContribution * i : annualContribution * ((growth - 1) / r);
      return safeCurrentAsset * growth + contribGrowth;
    };

    for (let i = 0; i <= MAX_FREEDOM_YEARS; i += 1) {
      const asset = assetAtYearIndex(i);
      const dividend = (asset * (safeDividendYield / 100)) / 12;
      if (dividend >= safeExpense) {
        return {
          computable: true,
          reached: true,
          year: START_YEAR + i,
          horizonYear: START_YEAR + MAX_FREEDOM_YEARS,
        };
      }
    }

    return {
      computable: true,
      reached: false,
      year: null,
      horizonYear: START_YEAR + MAX_FREEDOM_YEARS,
    };
  })();

  const data = useMemo(() => {
    const safeCurrentAsset = Number.isFinite(currentAssetMan) && currentAssetMan > 0 ? currentAssetMan : 0;
    const safeExpense = Number.isFinite(targetExpenseMan) && targetExpenseMan > 0 ? targetExpenseMan : 0;
    const safeMonthlyContribution =
      Number.isFinite(monthlyContributionMan) && monthlyContributionMan > 0 ? monthlyContributionMan : 0;
    const safeGrowthReturn = Number.isFinite(portfolioGrowthPct) ? portfolioGrowthPct : 0;
    const safeDividendYield = Number.isFinite(portfolioDividendYieldPct) ? portfolioDividendYieldPct : 0;

    const endYear = freedom.reached && freedom.year ? freedom.year : freedom.horizonYear;
    const durationYears = endYear - START_YEAR;
    const dt = durationYears <= 10 ? 0.5 : 1;

    const r = safeGrowthReturn / 100;
    const g = Math.pow(1 + r, dt);
    const contribStep = safeMonthlyContribution * 12 * dt;

    const almostEqual = (a, b) => Math.abs(a - b) < 1e-9;

    const assetAtStep = (i) => {
      if (almostEqual(g, 1)) return safeCurrentAsset + contribStep * i;

      const gi = Math.pow(g, i);
      return safeCurrentAsset * gi + contribStep * ((gi - 1) / (g - 1));
    };

    const steps = Math.round(durationYears / dt);

    const formatKey = (t) => {
      const rounded = Math.round(t * 10) / 10;
      return almostEqual(rounded % 1, 0) ? String(Math.round(rounded)) : String(rounded);
    };

    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = START_YEAR + i * dt;
      const asset = assetAtStep(i);
      const dividend = Math.round((asset * (safeDividendYield / 100)) / 12);

      return {
        year: formatKey(t),
        asset: Math.round(asset),
        dividend,
        expense: safeExpense,
      };
    });
  }, [currentAssetMan, targetExpenseMan, monthlyContributionMan, portfolioDividendYieldPct, portfolioGrowthPct, freedom.horizonYear, freedom.reached, freedom.year]);

  const [selectedYear, setSelectedYear] = useState(String(START_YEAR));
  const [isYearLocked, setIsYearLocked] = useState(false);

  const current = data[0];
  const effectiveSelectedYear = data.some((row) => row.year === selectedYear) ? selectedYear : (current?.year ?? String(START_YEAR));
  const selectedRow = data.find((row) => row.year === effectiveSelectedYear) ?? current;

  const survivalIndex = (() => {
    if (!selectedRow?.expense) return 0;
    const raw = (selectedRow.dividend / selectedRow.expense) * 100;
    return Math.max(0, Math.min(999, raw));
  })();

  const gapMan = (selectedRow?.dividend ?? 0) - (selectedRow?.expense ?? 0);
  const meta = getSurvivalMeta(survivalIndex);

  const firstCrossingYear = freedom.reached ? freedom.year : null;
  const isBeyondHorizon = freedom.computable && !freedom.reached;

  const currentYear = Number(current?.year);
  const dYear = Number.isFinite(currentYear) && firstCrossingYear ? firstCrossingYear - currentYear : null;

  const isHalfYearMode = useMemo(() => {
    if (data.length < 2) return false;
    const a = Number(data[0]?.year);
    const b = Number(data[1]?.year);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(b - a - 0.5) < 1e-6;
  }, [data]);

  const startYearInt = useMemo(() => Math.floor(Number(data[0]?.year ?? START_YEAR)), [data]);
  const endYearInt = useMemo(() => Math.ceil(Number(data[data.length - 1]?.year ?? START_YEAR)), [data]);

  const xAxisInterval = useMemo(() => 0, []);

  const xMarks = useMemo(() => {
    const years = [];

    if (isHalfYearMode) {
      for (let y = startYearInt; y <= endYearInt; y += 1) years.push(y);
      return years;
    }

    for (let y = startYearInt; y <= endYearInt; y += 1) {
      if (y % 5 === 0 || y === startYearInt || y === endYearInt) years.push(y);
    }
    return years;
  }, [endYearInt, isHalfYearMode, startYearInt]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">VISUAL FINANCE</h1>
          <p className="text-slate-500 mt-2">생존능선 돌파 및 자산 자유도 대시보드</p>
        </header>
        
        {/* 입력값 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">현재 자산</p>
            <div className="flex items-end gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={Number.isFinite(currentAssetMan) ? currentAssetMan : ''}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setCurrentAssetMan(Number.isFinite(next) ? next : 0);
                }}
                className="w-full text-2xl font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
                aria-label="현재 자산(만원)"
              />
              <span className="text-sm font-normal text-slate-400 whitespace-nowrap">만 원</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>기본 {formatNumber(RECOMMENDED_CURRENT_ASSET_MAN)}만원</span>
              <button
                type="button"
                className="text-indigo-600 font-bold hover:underline"
                onClick={() => setCurrentAssetMan(RECOMMENDED_CURRENT_ASSET_MAN)}
              >
                기본 적용
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">목표 생활비</p>
            <div className="flex items-end gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={Number.isFinite(targetExpenseMan) ? targetExpenseMan : ''}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setTargetExpenseMan(Number.isFinite(next) ? next : 0);
                }}
                className="w-full text-2xl font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
                aria-label="목표 생활비(만원)"
              />
              <span className="text-sm font-normal text-slate-400 whitespace-nowrap">만 원</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>추천 {formatNumber(RECOMMENDED_EXPENSE_MAN)}만원 (고정)</span>
              <button
                type="button"
                className="text-indigo-600 font-bold hover:underline"
                onClick={() => setTargetExpenseMan(RECOMMENDED_EXPENSE_MAN)}
              >
                추천 적용
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">월 추가 불입</p>
            <div className="flex items-end gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={Number.isFinite(monthlyContributionMan) ? monthlyContributionMan : ''}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setMonthlyContributionMan(Number.isFinite(next) ? next : 0);
                }}
                className="w-full text-2xl font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
                aria-label="월 추가 불입(만원)"
              />
              <span className="text-sm font-normal text-slate-400 whitespace-nowrap">만 원</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>추천 {formatNumber(RECOMMENDED_MONTHLY_CONTRIBUTION_MAN)}만원</span>
              <button
                type="button"
                className="text-indigo-600 font-bold hover:underline"
                onClick={() => setMonthlyContributionMan(RECOMMENDED_MONTHLY_CONTRIBUTION_MAN)}
              >
                추천 적용
              </button>
            </div>
          </div>

        </div>

        {/* 배당 포트폴리오 설정 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">배당 포트폴리오</p>
              <p className="mt-1 text-sm text-slate-600">
                전체 배당수익률: <span className="font-extrabold text-slate-800">{portfolioDividendYieldPct.toFixed(2)}%</span>
                {portfolioOpen ? (
                  <>
                    <span className="text-slate-400"> · 기대성장률(총수익률): </span>
                    <span className="font-extrabold text-slate-800">{portfolioGrowthPct.toFixed(2)}%</span>
                    <span className="text-slate-400"> (비중합 {allocationSum.toFixed(0)}%)</span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-slate-600 font-bold hover:underline text-sm"
                onClick={() => setPortfolioOpen((v) => !v)}
              >
                {portfolioOpen ? '접기' : '펼치기'}
              </button>
              <button
                type="button"
                className="text-indigo-600 font-bold hover:underline text-sm"
                onClick={() => setDividendPortfolio(RECOMMENDED_DIVIDEND_PORTFOLIO)}
              >
                티커 추천값 적용
              </button>
            </div>
          </div>

          {portfolioOpen ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {dividendPortfolio.map((row, idx) => (
                <div key={row.ticker} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="w-16">
                    <p className="text-sm font-black text-slate-800">{row.ticker}</p>
                    <p className="text-[10px] text-slate-400">ticker</p>
                  </div>

                  <div className="w-28">
                    <p className="text-[10px] text-slate-400 font-bold">기대성장률(연 %)</p>
                    <p className="text-sm font-black text-slate-800">
                      {Number.isFinite(row.growthPct) ? row.growthPct.toFixed(2) : '—'}%
                    </p>
                    <p className="text-[10px] text-slate-400">{row.growthLabel ?? ''}</p>
                  </div>

                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-bold">평균 배당률(연 %)</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      value={Number.isFinite(row.avgYieldPct) ? row.avgYieldPct : ''}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setDividendPortfolio((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, avgYieldPct: Number.isFinite(next) ? next : 0 } : p)),
                        );
                      }}
                      className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
                      aria-label={`${row.ticker} 평균 배당률(%)`}
                    />
                  </div>

                  <div className="w-24">
                    <p className="text-[10px] text-slate-400 font-bold">자산 배분(%)</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      value={Number.isFinite(row.allocationPct) ? row.allocationPct : ''}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setAllocationNormalized(idx, next);
                      }}
                      className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-500 pb-1"
                      aria-label={`${row.ticker} 자산 배분(%)`}
                    />
                  </div>

                  <button
                    type="button"
                    className="ml-1 text-xs font-black text-slate-400 hover:text-red-600"
                    onClick={() => removeTickerAt(idx)}
                    aria-label={`${row.ticker} 삭제`}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* 티커 추가 */}
              <AddTickerCard
                onAdd={(item) => {
                  setDividendPortfolio((prev) => {
                    const ticker = item.ticker.toUpperCase();
                    const existingIdx = prev.findIndex((p) => p.ticker.toUpperCase() === ticker);

                    if (existingIdx >= 0) {
                      const updated = prev.map((p, i) => (i === existingIdx ? { ...p, ...item, ticker } : p));
                      return applyAllocationNormalized(updated, existingIdx, item.allocationPct);
                    }

                    const next = [...prev, { ...item, ticker }];
                    return applyAllocationNormalized(next, next.length - 1, item.allocationPct);
                  });
                }}
              />
            </div>
          ) : null}
        </div>

        {/* 요약 지표 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white">
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">목표 달성까지</p>
            <p className="text-2xl font-bold">
              {!freedom.computable ? (
                '—'
              ) : isBeyondHorizon ? (
                `D-${MAX_FREEDOM_YEARS}+`
              ) : (
                `D-${dYear ?? 0}`
              )}{' '}
              <span className="text-sm font-normal opacity-80">Year</span>
            </p>
            <p className="mt-2 text-xs text-indigo-100/90">
              {!freedom.computable
                ? '배당/생활비 값을 확인해주세요'
                : firstCrossingYear
                  ? `${firstCrossingYear}년 배당 ≥ 생활비`
                  : `${MAX_FREEDOM_YEARS}년 내 달성 불가 (탐색범위 초과)`}
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">달성 시점 자산</p>
            <p className="text-2xl font-bold text-emerald-500">
              {(() => {
                const year = freedom.reached && freedom.year ? String(freedom.year) : null;
                const row = year ? data.find((r) => r.year === year) : null;
                const asset = row?.asset ?? data[data.length - 1]?.asset ?? 0;
                return formatManToKoreanMoney(asset);
              })()}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {freedom.reached && freedom.year ? `${freedom.year}년 기준` : `${MAX_FREEDOM_YEARS}년 시뮬레이션 끝 기준`}
            </p>
          </div>
        </div>

        {/* 메인 차트: 자산 성장(Bar) + 배당/지출(Line) */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">연도별 재정 시뮬레이션</h2>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1 text-slate-500"><div className="w-3 h-3 bg-slate-200 rounded-sm"></div> 총 자산</span>
              <span className="flex items-center gap-1 text-slate-500"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> 월 배당금</span>
              <span className="flex items-center gap-1 text-slate-500"><div className="w-3 h-3 border-t-2 border-dashed border-red-400"></div> 생존능선</span>
            </div>
          </div>
          {/* 생존지수(고정 카드): 그래프 위 */}
          <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isYearLocked ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isYearLocked ? 'LOCK' : 'LIVE'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${meta.pill}`}>{meta.label}</span>
                <span className="text-sm font-black text-slate-800">{toPeriodText(effectiveSelectedYear, isHalfYearMode)}</span>
                <span className="text-sm font-black text-indigo-600">{survivalIndex.toFixed(1)}%</span>
                <span className={`text-xs font-black ${gapMan >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {gapMan >= 0 ? '+' : ''}
                  {formatNumber(Math.round(gapMan))}만원 {gapMan >= 0 ? '초과' : '부족'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-black text-slate-600 hover:text-slate-900"
                  onClick={() => {
                    setSelectedYear(String(START_YEAR));
                    setIsYearLocked(false);
                  }}
                >
                  현재로
                </button>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">호버: 미리보기 · 클릭: 고정/해제</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden relative">
              <div className="absolute left-1/2 top-0 h-full w-px bg-slate-400/40" />
              <div className={`h-full ${meta.bar}`} style={{ width: `${Math.min(100, survivalIndex)}%` }} />
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              배당 {formatNumber(selectedRow?.dividend ?? 0)}만원 · 생활비 {formatNumber(targetExpenseMan)}만원 · 총자산 {formatManToKoreanMoney(selectedRow?.asset ?? 0)}
            </div>
          </div>

          <div className="relative h-[450px] w-full" style={{ width: '100%', height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 60, bottom: isHalfYearMode ? 80 : 60, left: 20 }}
                onMouseMove={(e) => {
                  if (isYearLocked) return;
                  const label = e?.activeLabel;
                  if (!label) return;
                  const next = String(label);
                  if (next !== selectedYear) setSelectedYear(next);
                }}
                onMouseLeave={() => {
                  if (isYearLocked) return;
                  const next = String(data[0]?.year ?? START_YEAR);
                  if (next !== selectedYear) setSelectedYear(next);
                }}
                onClick={(e) => {
                  if (isYearLocked) {
                    setIsYearLocked(false);
                    return;
                  }

                  const label = e?.activeLabel;
                  if (label) {
                    const next = String(label);
                    if (next !== selectedYear) setSelectedYear(next);
                  }
                  setIsYearLocked(true);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical stroke="#f1f5f9" />

                {/* 5/10년 기준선 */}
                {xMarks.map((y) => (
                  <ReferenceLine
                    key={y}
                    x={String(y)}
                    stroke={!isHalfYearMode && y % 10 === 0 ? '#cbd5e1' : '#e2e8f0'}
                    strokeWidth={!isHalfYearMode && y % 10 === 0 ? 1.5 : 1}
                    strokeDasharray={!isHalfYearMode && y % 10 === 0 ? undefined : '4 4'}
                  />
                ))}

                {/* 선택 연도 하이라이트 */}
                {effectiveSelectedYear ? (
                  <ReferenceLine x={String(effectiveSelectedYear)} stroke="#6366f1" strokeWidth={isYearLocked ? 3 : 2} />
                ) : null}

                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={isHalfYearMode ? <HalfYearTick /> : { fill: '#64748b', fontSize: 12 }}
                  dy={10}
                  interval={xAxisInterval}
                  tickFormatter={(v) => {
                    if (isHalfYearMode) return '';

                    const y = Number(v);
                    if (!Number.isFinite(y)) return '';

                    if (y === startYearInt || y === endYearInt || y % 5 === 0) return String(y);
                    return '';
                  }}
                />

                {/* 총 자산 축 */}
                <YAxis
                  yAxisId="asset"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => {
                    if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}억`;
                    return `${Math.round(v)}`;
                  }}
                />

                {/* 현금흐름(월 배당/생활비) 축 */}
                <YAxis
                  yAxisId="cash"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `${Math.round(v)}만`}
                />

                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    labelFormatter={(label) => toPeriodText(label, isHalfYearMode)}
                    formatter={(value, name) => {
                      if (name === '총 자산') return [formatManToKoreanMoney(value), name];
                      return [`${formatNumber(value)}만`, name];
                    }}
                  />

                <Bar yAxisId="asset" dataKey="asset" name="총 자산" fill="#e2e8f0" radius={[10, 10, 0, 0]} barSize={60} />
                <Line
                  yAxisId="cash"
                  type="monotone"
                  dataKey="dividend"
                  name="월 배당금"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  yAxisId="cash"
                  type="monotone"
                  dataKey="expense"
                  name="생존능선(생활비)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="8 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-slate-600 text-sm leading-relaxed">
              💡 <span className="font-bold text-slate-800">분석 결과:</span>{' '}
              {firstCrossingYear ? (
                <> {firstCrossingYear}년경 배당금이 목표 생활비를 추월합니다.</>
              ) : isBeyondHorizon ? (
                <> {MAX_FREEDOM_YEARS}년 탐색 범위 내에서는 목표 생활비를 아직 추월하지 못합니다.</>
              ) : (
                <> 현재 설정값으로는 달성 시점을 계산할 수 없습니다.</>
              )}{' '}
              현재 목표 생활비는 <span className="font-bold text-slate-800">월 {formatNumber(targetExpenseMan)}만원</span> 입니다.
              <span className="text-slate-400"> (가정: 배당수익률 {portfolioDividendYieldPct.toFixed(2)}%, 기대성장률(총수익률) {portfolioGrowthPct.toFixed(2)}%, 배당금 전액 재투자, 월 {formatNumber(monthlyContributionMan)}만원 추가 불입)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;