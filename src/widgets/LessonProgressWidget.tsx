/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { BookOpen, Plus, Trash2, ArrowUp, ArrowDown, ClipboardList, Sparkles, AlertCircle } from 'lucide-react';
import { LessonProgressRecord } from '../types/dashboard';

interface LessonProgressWidgetProps {
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

const STORAGE_KEY = 'teacher-widget-dashboard:lesson-progress:v1';

// Default mock/initial records in case storage is empty
const INITIAL_RECORDS: LessonProgressRecord[] = [
  {
    id: 'lesson-1',
    subject: '국어',
    grade: '3',
    className: '1',
    unitName: '1. 문학의 향기',
    page: 'p.12~17',
    lessonSummary: '시의 은유적 표현과 운율의 개념 학습하고, 자신만의 짧은 행시 짓기 활동 진행',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() // 3 hours ago
  },
  {
    id: 'lesson-2',
    subject: '수학',
    grade: '3',
    className: '1',
    unitName: '2. 분수의 나눗셈',
    page: '교과서 34~36쪽',
    lessonSummary: '대분수의 나눗셈 계산 원리를 시각 자료를 통해 탐구하고 익힘책 오답 풀이 완수',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
  }
];

export default function LessonProgressWidget({ size, width, height }: LessonProgressWidgetProps) {
  const [records, setRecords] = useState<LessonProgressRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse lesson progress records:', e);
    }
    return INITIAL_RECORDS;
  });

  // Form states
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('3'); // Default to 3 for friendly teacher default
  const [className, setClassName] = useState('1'); // Default to 1
  const [unitName, setUnitName] = useState('');
  const [page, setPage] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Deletion confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save lesson progress records:', e);
    }
  }, [records]);

  // Handle addition
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setConfirmDeleteId(null);

    // Validate essential fields
    if (!subject.trim() || !grade.trim() || !className.trim() || !unitName.trim() || !page.trim()) {
      setErrorMessage('과목, 학년, 반, 단원명, 페이지를 입력해 주세요.');
      return;
    }

    const newRecord: LessonProgressRecord = {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      subject: subject.trim(),
      grade: grade.trim(),
      className: className.trim(),
      unitName: unitName.trim(),
      page: page.trim(),
      lessonSummary: lessonSummary.trim(),
      createdAt: new Date().toISOString()
    };

    setRecords([newRecord, ...records]); // Pushed to top (newest first)
    
    // Reset fields except grade, class and subject if user is doing repetitive entries
    setUnitName('');
    setPage('');
    setLessonSummary('');
    setValidationSuccess(true);
    setTimeout(() => setValidationSuccess(false), 2000);
  };

  // Move Record Up (closer to first / top)
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRecords = [...records];
    const target = newRecords[index];
    newRecords[index] = newRecords[index - 1];
    newRecords[index - 1] = target;
    setRecords(newRecords);
  };

  // Move Record Down (closer to end / bottom)
  const handleMoveDown = (index: number) => {
    if (index === records.length - 1) return;
    const newRecords = [...records];
    const target = newRecords[index];
    newRecords[index] = newRecords[index + 1];
    newRecords[index + 1] = target;
    setRecords(newRecords);
  };

  // Safe delete
  const handleDeleteRecord = (id: string) => {
    try {
      setRecords(records.filter(r => r.id !== id));
      setConfirmDeleteId(null);
    } catch (e) {
      setErrorMessage('삭제 과정에서 예기치 못한 실패가 발생했습니다.');
    }
  };

  // Quick fill functions
  const fillSubject = (sub: string) => setSubject(sub);
  const fillGrade = (gr: string) => setGrade(gr);
  const fillClass = (cl: string) => setClassName(cl);

  // Detect visual width partitioning
  const isWideLayout = size === 'wide' || size === 'large' || (width ? width >= 500 : false);

  return (
    <div className="flex flex-col h-full justify-between select-none p-1 font-sans text-slate-800 dark:text-slate-150">
      {/* Widget Core Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-450">
            <BookOpen className="w-4 h-4" />
          </div>
          <span>진도 체크</span>
          <span className="text-[10px] font-normal text-slate-400">학급별 수업 진행도</span>
        </div>
        {records.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-extrabold">
            총 {records.length}건
          </span>
        )}
      </div>

      {/* Main Container Workspace */}
      <div className={`mt-2 flex-1 min-h-0 min-w-0 ${isWideLayout ? 'grid grid-cols-12 gap-3' : 'flex flex-col gap-3'}`}>
        
        {/* Left Side: Input Form Canvas */}
        <form 
          onSubmit={handleCreateRecord} 
          className={`no-drag flex flex-col justify-between border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 rounded-2xl ${isWideLayout ? 'col-span-5' : 'w-full'}`}
        >
          <div className="space-y-2">
            {/* Subject and Grade Quick Input Sector */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">학년</label>
                <input 
                  type="text" 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="예) 3"
                  className="w-full text-xs text-center border border-slate-200/80 dark:border-slate-750 bg-white/70 dark:bg-slate-950/40 rounded-lg py-1 px-1.5 focus:border-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">반</label>
                <input 
                  type="text" 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="예) 1"
                  className="w-full text-xs text-center border border-slate-200/80 dark:border-slate-750 bg-white/70 dark:bg-slate-950/40 rounded-lg py-1 px-1.5 focus:border-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">과목</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="과목명"
                  className="w-full text-xs text-center border border-slate-200/80 dark:border-slate-750 bg-white/70 dark:bg-slate-950/40 rounded-lg py-1 px-1.5 focus:border-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            {/* Unit Name and Page Line */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">단원명 *</label>
                <input 
                  type="text" 
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="예) 1. 문학의 향기"
                  className="w-full text-xs border border-slate-200/80 dark:border-slate-750 bg-white/70 dark:bg-slate-950/40 rounded-lg py-1 px-2 focus:border-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">페이지 *</label>
                <input 
                  type="text" 
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="예) p.32 또는 5~8쪽"
                  className="w-full text-xs border border-slate-200/80 dark:border-slate-750 bg-white/70 dark:bg-slate-950/40 rounded-lg py-1 px-2 focus:border-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            {/* Lesson Summary (Optional but encouraged UI) */}
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500">수업 메모</label>
                <span className="text-[8px] text-indigo-500 dark:text-indigo-400 px-1 rounded-md bg-indigo-500/5 select-none font-bold animate-pulse">입력 권장</span>
              </div>
              <textarea 
                value={lessonSummary}
                onChange={(e) => setLessonSummary(e.target.value)}
                placeholder="간단한 수업 활동, 피드백 등 기록"
                rows={1}
                className="w-full text-xs border border-slate-200/80 dark:border-slate-750 bg-white/70 dark:bg-slate-950/40 rounded-lg py-1.5 px-2 focus:border-emerald-500 focus:outline-none dark:text-white resize-none max-h-16"
              />
            </div>
          </div>

          {/* Validation indicators or action logs */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-800">
            {errorMessage && (
              <div className="flex items-center gap-1 text-[10px] text-red-500 mb-2 font-bold bg-red-500/5 p-1 rounded-md">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            {validationSuccess && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mb-2 font-bold bg-emerald-500/5 p-1 rounded-md">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>성공적으로 저장되었습니다!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full cursor-pointer py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-95 transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>진도 기록 생성</span>
            </button>
          </div>
        </form>

        {/* Right Side: List of Lesson Progress Records */}
        <div className={`flex flex-col min-h-0 min-w-0 ${isWideLayout ? 'col-span-7 h-full' : 'w-full'}`}>
          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400 mb-2.5 px-1 shrink-0">
            <span>최근 등록 진도 기록 목록</span>
            <div className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-drag space-y-1.5 pr-0.5 max-h-[250px] lg:max-h-full">
            {records.length === 0 ? (
              <div className="h-full min-h-[90px] flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center p-4">
                <p className="text-xs text-slate-400 font-bold">아직 기록된 진도가 없습니다.</p>
                <p className="text-[10px] text-slate-350 dark:text-slate-500 mt-1">좌측 서식에 새 성취 단원을 채워 기록하십시오.</p>
              </div>
            ) : (
              records.map((record, index) => (
                <div 
                  key={record.id}
                  className={`relative p-2 rounded-2xl border bg-white/70 dark:bg-slate-900/60 transition-all flex items-start gap-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/85 group ${
                    confirmDeleteId === record.id 
                      ? 'border-red-400 bg-red-500/5 dark:bg-red-950/10' 
                      : 'border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  {/* Left Label Badge Accent Column */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 min-w-[42px] text-center">
                      {record.subject}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-none">
                      {record.grade}학년 {record.className}반
                    </span>
                  </div>

                  {/* Mid Segment Info Text */}
                  <div className="flex-1 min-w-0 pr-12 text-left">
                    <div className="flex items-baseline flex-wrap gap-x-1.5">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[140px] md:max-w-xs">{record.unitName}</span>
                      <span className="text-[10px] font-extrabold text-orange-500 select-all font-mono">{record.page}</span>
                    </div>
                    {record.lessonSummary ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 break-all select-text">
                        {record.lessonSummary}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 italic mt-0.5">수업 메모 없음</p>
                    )}
                    <span className="text-[8px] text-slate-400/80 font-mono block mt-1">
                      등록: {new Date(record.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Absolute Floating Button Actions on Right */}
                  <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* CONFIRM DELETE CONTROL SHIFT */}
                    {confirmDeleteId === record.id ? (
                      <div className="flex items-center gap-1 bg-red-100 dark:bg-red-950/60 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[8px] font-bold cursor-pointer"
                        >
                          삭제
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded text-[8px] font-bold cursor-pointer"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {/* Order Re-Shuffler Buttons */}
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === records.length - 1}
                          className="cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(record.id)}
                          className="cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-red-500 ml-1"
                          title="삭제하기"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
