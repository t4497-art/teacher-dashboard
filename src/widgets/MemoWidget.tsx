/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { StickyNote, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Memo } from '../types/dashboard';

interface MemoWidgetProps {
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

const PASTEL_COLORS = [
  { name: '옐로우', bgClass: 'bg-amber-100 border-amber-200/60 text-amber-900', colorCode: '#FEF3C7', dotClass: 'bg-amber-400' },
  { name: '코랄', bgClass: 'bg-rose-100 border-rose-200/60 text-rose-900', colorCode: '#FFE4E6', dotClass: 'bg-rose-400' },
  { name: '그린', bgClass: 'bg-emerald-100 border-emerald-200/60 text-emerald-900', colorCode: '#D1FAE5', dotClass: 'bg-emerald-400' },
  { name: '블루', bgClass: 'bg-sky-100 border-sky-200/60 text-sky-900', colorCode: '#E0F2FE', dotClass: 'bg-sky-400' },
  { name: '퍼플', bgClass: 'bg-indigo-100 border-indigo-200/60 text-indigo-900', colorCode: '#E0E7FF', dotClass: 'bg-indigo-400' }
];

export default function MemoWidget({ size, width, height }: MemoWidgetProps) {
  const [memos, setMemos] = useState<Memo[]>(() => {
    const saved = localStorage.getItem('widget_memos_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      { id: 'memo-1', content: '★ 교직원 회의 안건 회람\n- 6월 현장체험학습 버스 계약 현황 제출\n- 방과후 강사 모집 공고 결재 필요\n- 학교 축제 기획안 29일까지 기안문 작성', color: '옐로우', updatedAt: new Date().toISOString() },
      { id: 'memo-2', content: '학부모 상담 시 유의사항:\n- 지훈이 어머님: 수학 학습량 증가 필요 전하기\n- 예림이 아버님: 교우 관계 칭찬하기', color: '코랄', updatedAt: new Date().toISOString() }
    ];
  });

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem('widget_memos_list', JSON.stringify(memos));
  }, [memos]);

  const activeMemo = memos[activeIndex] || memos[0] || null;

  const handleContentChange = (val: string) => {
    if (!activeMemo) return;
    setMemos(memos.map((m, idx) => idx === activeIndex ? { ...m, content: val, updatedAt: new Date().toISOString() } : m));
  };

  const handleColorChange = (colorName: string) => {
    if (!activeMemo) return;
    setMemos(memos.map((m, idx) => idx === activeIndex ? { ...m, color: colorName } : m));
  };

  const handleAddNew = () => {
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      content: '새 매모 작성...',
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)].name,
      updatedAt: new Date().toISOString()
    };
    setMemos([...memos, newMemo]);
    setActiveIndex(memos.length); // focus the newly added memo
  };

  const handleDelete = () => {
    if (memos.length <= 1) {
      // Just clear content instead of deleting last remaining memo
      handleContentChange('새 메모 작성...');
      return;
    }
    
    const nextList = memos.filter((_, idx) => idx !== activeIndex);
    setMemos(nextList);
    setActiveIndex(prev => Math.max(0, prev - 1));
  };

  const currentStyle = PASTEL_COLORS.find(c => c.name === (activeMemo?.color || '옐로우')) || PASTEL_COLORS[0];

  return (
    <div className="flex flex-col h-full justify-between select-none p-0.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 dark:border-black/5 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <StickyNote className="w-4 h-4 text-amber-500" />
          <span>포스트잇 메모</span>
        </div>
        <div className="flex items-center gap-1.5 no-drag">
          {memos.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded-md text-[10px] font-bold">
              <button
                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                disabled={activeIndex === 0}
                className="hover:text-amber-500 disabled:opacity-40 disabled:hover:text-inherit cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>{activeIndex + 1}/{memos.length}</span>
              <button
                onClick={() => setActiveIndex(prev => Math.min(memos.length - 1, prev + 1))}
                disabled={activeIndex === memos.length - 1}
                className="hover:text-amber-500 disabled:opacity-40 disabled:hover:text-inherit cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={handleAddNew}
            className="cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all text-emerald-600"
            title="새 메모 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDelete}
            className="cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all text-red-500"
            title="메모 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sticky Note Canvas */}
      {activeMemo && (
        <div className={`mt-2 flex-1 p-2 rounded-2xl flex flex-col border ${currentStyle.bgClass} shadow-inner`}>
          <textarea
            value={activeMemo.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full flex-1 bg-transparent border-none outline-none font-sans font-medium text-[11px] leading-relaxed resize-none h-32 focus:ring-0 text-slate-800"
            placeholder="여기에 자유롭게 메모 내용을 입력하세요..."
          />
          
          {/* Pastel Dot Palette Selector */}
          <div className="flex items-center justify-between no-drag border-t border-black/5 mt-1 pt-1.5">
            <span className="text-[8px] opacity-75 font-mono tracking-tighter">
              KST {new Date(activeMemo.updatedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <div className="flex gap-1.5">
              {PASTEL_COLORS.map(color => (
                <button
                  key={color.name}
                  onClick={() => handleColorChange(color.name)}
                  className={`cursor-pointer w-3.5 h-3.5 rounded-full ${color.dotClass} border hover:scale-110 active:scale-95 transition-all ${
                    activeMemo.color === color.name ? 'border-slate-800 ring-2 ring-white/50 ring-offset-0' : 'border-transparent'
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
