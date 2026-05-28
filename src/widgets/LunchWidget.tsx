/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Utensils, ChevronLeft, ChevronRight, AlertCircle, CalendarRange } from 'lucide-react';
import { NeisConfig } from '../types/dashboard';
import { fetchSchoolMeal, interpretAllergens } from '../services/neisService';
import { getKSTDateString, formatKSTFullDate } from '../services/dateService';

interface LunchWidgetProps {
  neisConfig: NeisConfig;
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

export default function LunchWidget({ neisConfig, size, width, height }: LunchWidgetProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [meals, setMeals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAllergens, setShowAllergens] = useState(false);

  const formattedDateString = getKSTDateString(currentDate);

  useEffect(() => {
    let active = true;
    const loadMeals = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const mealList = await fetchSchoolMeal(neisConfig, formattedDateString);
        if (active) {
          setMeals(mealList);
        }
      } catch (err) {
        if (active) {
          setErrorMsg('식단 정보를 불러오는 데 실패했습니다.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMeals();
    return () => { active = false; };
  }, [neisConfig, formattedDateString]);

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 1);
      return next;
    });
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex flex-col h-full justify-between select-none p-0.5">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 dark:border-black/5 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <Utensils className="w-4 h-4 text-rose-500" />
          <span className="font-semibold">오늘의 학교 급식</span>
        </div>
        <div className="flex items-center gap-2 no-drag">
          <button
            onClick={() => setShowAllergens(!showAllergens)}
            className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${
              showAllergens 
                ? 'bg-rose-500 text-white border-rose-500 font-bold' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-rose-300'
            }`}
          >
            알레르기 표시
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between no-drag py-1.5 shrink-0 bg-slate-500/5 dark:bg-white/5 rounded-xl px-2 my-1">
        <button
          onClick={handlePrevDay}
          className="cursor-pointer p-0.5 hover:bg-white/40 dark:hover:bg-black/30 rounded transition-all text-slate-600 dark:text-slate-350"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center min-w-0 flex-1 px-1">
          <span 
            onClick={handleGoToday}
            className="cursor-pointer hover:text-rose-500 text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate block"
            title="오늘 날짜로 이동"
          >
            {formatKSTFullDate(currentDate).replace(/2026년 /g, '')}
          </span>
        </div>
        <button
          onClick={handleNextDay}
          className="cursor-pointer p-0.5 hover:bg-white/40 dark:hover:bg-black/30 rounded transition-all text-slate-600 dark:text-slate-350"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* School Name indicator */}
      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-1 text-center shrink-0">
        📍 {neisConfig.schoolName ? `${neisConfig.schoolName} 식단` : '학교 미등록 (예시 식단 표시 중)'}
      </div>

      {/* Meal Items Box */}
      <div className="flex-1 overflow-y-auto max-h-48 pr-1 my-1.5 flex flex-col justify-center">
        {loading ? (
          <div className="text-center text-[11px] text-slate-400 py-6 animate-pulse">
            식사 메뉴를 조율 중...
          </div>
        ) : errorMsg ? (
          <div className="flex items-center gap-1 bg-red-150 text-red-700 dark:bg-red-950/20 dark:text-red-300 p-2 rounded-xl text-[10px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        ) : meals.length === 0 || meals[0]?.includes('급식이 없습니다') ? (
          <div className="text-center text-[11px] text-slate-400 py-6 font-semibold">
            😋 예정된 급식 식단이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {meals.map((val, idx) => {
              const { name, allergens } = interpretAllergens(val);
              return (
                <div
                  key={idx}
                  className="bg-white/30 dark:bg-slate-850/20 border border-white/20 dark:border-slate-800/20 px-2.5 py-1 rounded-xl flex flex-wrap items-baseline justify-between gap-1.5"
                >
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{name}</span>
                  {showAllergens && allergens.length > 0 && (
                    <span 
                      className="text-[9px] font-medium text-rose-500 dark:text-rose-300 truncate max-w-40"
                      title={allergens.join(', ')}
                    >
                      ({allergens.join(', ')})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert Notice concerning Local Secrets */}
      {neisConfig.apiKey && (
        <div className="text-[8px] opacity-70 text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded text-center truncate shrink-0">
          ⚠️ NEIS API 키가 브라우저에 임시 장착되었습니다.
        </div>
      )}
    </div>
  );
}
