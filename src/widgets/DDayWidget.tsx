/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Trash2, CalendarCheck, Check } from 'lucide-react';
import { DDay } from '../types/dashboard';
import { getKSTDateString } from '../services/dateService';

interface DDayWidgetProps {
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

export default function DDayWidget({ size, width, height }: DDayWidgetProps) {
  const [ddays, setDdays] = useState<DDay[]>(() => {
    const saved = localStorage.getItem('widget_dday_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      { id: 'dday-1', title: '학기 중간고사 대행진', date: '2026-05-13', isCompleted: false },
      { id: 'dday-2', title: '교육청 스마트 패드 연수회', date: '2026-06-19', isCompleted: false },
      { id: 'dday-3', title: '6월 모의고사 출제의 날', date: '2026-06-04', isCompleted: false }
    ];
  });

  const [inputTitle, setInputTitle] = useState('');
  const [inputDate, setInputDate] = useState(() => getKSTDateString(new Date()));

  useEffect(() => {
    localStorage.setItem('widget_dday_list', JSON.stringify(ddays));
  }, [ddays]);

  const handleAddDDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim() || !inputDate) return;

    const newObj: DDay = {
      id: `dday-${Date.now()}`,
      title: inputTitle.trim(),
      date: inputDate,
      isCompleted: false
    };

    setDdays([...ddays, newObj]);
    setInputTitle('');
  };

  const handleToggleComplete = (id: string) => {
    setDdays(ddays.map(d => d.id === id ? { ...d, isCompleted: !d.isCompleted } : d));
  };

  const handleDeleteDDay = (id: string) => {
    setDdays(ddays.filter(d => d.id !== id));
  };

  const calculateDaysRemain = (targetDateStr: string): { text: string; raw: number; style: string } => {
    const todayStr = getKSTDateString(new Date());
    
    const target = new Date(targetDateStr);
    const today = new Date(todayStr);
    
    // Clear hours to avoid partial counts
    target.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return { text: 'D-Day', raw: 0, style: 'text-[#1E8449] bg-[#EAFAF1] border-[#A9DFBF] dark:text-[#52be80] dark:bg-[#1a3826] dark:border-[#27ae60]/40 animate-pulse font-extrabold' };
    } else if (diffDays < 0) {
      return { text: `D+${Math.abs(diffDays)}`, raw: diffDays, style: 'text-[#CA6F1E] bg-[#FDEBD0] border-[#FADBD8] dark:text-[#e59866] dark:bg-[#3d2d1f] dark:border-[#5c432d]/40' };
    } else if (diffDays < 4) {
      return { text: `D-${diffDays}`, raw: diffDays, style: 'text-[#1A5276] bg-[#D6EAF8] border-[#AED6F1] dark:text-[#649ecc] dark:bg-[#1f303d] dark:border-[#2c475c]/40 font-extrabold shadow-xs' };
    } else {
      return { text: `D-${diffDays}`, raw: diffDays, style: 'text-[#1A5276] bg-[#D6EAF8] border-[#AED6F1] dark:text-[#649ecc] dark:bg-[#1f303d] dark:border-[#2c475c]/40' };
    }
  };

  // Sort: incomplete close deadlines first, then completed/passed
  const sortedDDays = [...ddays].sort((a,b) => {
    const diffA = calculateDaysRemain(a.date).raw;
    const diffB = calculateDaysRemain(b.date).raw;
    
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    // ascending for positive, descending for negative but generally sort by pure chronological comparison
    return a.date.localeCompare(b.date);
  });

  return (
    <div className="flex flex-col h-full justify-between select-none p-0.5">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 dark:border-black/5 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <CalendarClock className="w-4 h-4 text-orange-500" />
          <span>시험 & 행사 D-Day</span>
        </div>
        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded">
          {ddays.filter(d => !d.isCompleted).length}개 작동 중
        </span>
      </div>

      {/* Main D-Day Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2 my-2 max-h-48 pr-1">
        {sortedDDays.length === 0 ? (
          <div className="text-center text-slate-400 text-[11px] py-10">
            <CalendarCheck className="w-6 h-6 mx-auto mb-1 opacity-40 text-slate-400" />
            <span>등록된 D-Day 정보가 없습니다!</span>
          </div>
        ) : (
          sortedDDays.map(dday => {
            const { text, style, raw } = calculateDaysRemain(dday.date);
            return (
              <div
                key={dday.id}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                  dday.isCompleted
                    ? 'bg-slate-100/30 border-slate-200/20 opacity-50'
                    : 'bg-white/40 dark:bg-slate-850/20 border-white/10 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleComplete(dday.id)}
                    className={`cursor-pointer w-4.5 h-4.5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                      dday.isCompleted
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-slate-300 dark:border-slate-650 hover:border-orange-400'
                    }`}
                  >
                    {dday.isCompleted && <Check className="w-3 h-3 stroke-[2.5px]" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className={`text-[11px] font-semibold truncate block text-slate-800 dark:text-slate-200 ${
                      dday.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`} title={dday.title}>
                      {dday.title}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 block">
                      📆 {dday.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 no-drag">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${dday.isCompleted ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-850 dark:text-slate-500 dark:border-slate-800' : style}`}>
                    {dday.isCompleted ? '완료' : text}
                  </span>
                  <button
                    onClick={() => handleDeleteDDay(dday.id)}
                    className="cursor-pointer p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-slate-405 dark:text-slate-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Bottom Inputs */}
      <form onSubmit={handleAddDDay} className="flex flex-col gap-1 mt-auto shrink-0 no-drag pt-1.5 border-t border-slate-200/40 dark:border-slate-800/20">
        <div className="flex gap-1">
          <input
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder="디데이 행사 제목..."
            className="flex-1 text-[11px] bg-white/50 dark:bg-black/30 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-slate-850 dark:text-slate-100 placeholder-slate-450 outline-none focus:ring-1 focus:ring-orange-350 font-semibold"
          />
        </div>
        <div className="flex gap-1">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="flex-1 text-[11px] bg-white/50 dark:bg-black/30 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1 text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-orange-350 font-semibold"
          />
          <button
            type="submit"
            className="cursor-pointer bg-[#D5F5E3] hover:bg-[#A9DFBF] active:bg-[#7DCEA0] text-[#1E8449] border border-[#A9DFBF] dark:bg-[#1a382ca0] dark:text-[#58d68d] dark:border-[#27ae60]/40 hover:dark:bg-[#228b51] active:dark:bg-[#1e7b45] rounded-lg px-2.5 py-1 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 text-[#1E8449] dark:text-[#58d68d]" />
            <span>등록</span>
          </button>
        </div>
      </form>
    </div>
  );
}
