/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { CalendarDays, Save, FileSpreadsheet, Download, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { TimetableData } from '../types/dashboard';
import { getKSTDayOfWeek } from '../services/dateService';
import { downloadCSV, getTimetableCSVTemplate, parseCSVToTimetable } from '../services/excelService';

interface TimetableWidgetProps {
  type: 'class' | 'teacher';
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

const DAYS = ['월', '화', '수', '목', '금'];
const SUBJECT_SUGGESTIONS = ['국어', '수학', '사회', '과학', '영어', '체육', '음악', '미술', '실과', '도덕', '창체', '동아리', '우주', '자율'];

const DEFAULT_CLASS_GRID: TimetableData = {
  '월': ['국어', '수학', '체육', '영어', '음악', '창체', ''],
  '화': ['영어', '사회', '국어', '과학', '수학', '미술', '미술'],
  '수': ['수학', '과학', '영어', '체육', '도덕', '', ''],
  '목': ['사회', '실과', '실과', '국어', '영어', '자율', ''],
  '금': ['과학', '국어', '수학', '창체', '음악', '동아리', '동아리']
};

const DEFAULT_TEACHER_GRID: TimetableData = {
  '월': ['3-1 수학', '3-2 수학', '공강', '3-1 동아리', '교재연구', '학급상담', ''],
  '화': ['공강', '3-2 수학', '3-1 수학', '교학협의', '3-3 수학', '공재회무', ''],
  '수': ['3-1 수학', '3-3 수학', '교재연구', '3-2 수학', '공강', '', ''],
  '목': ['3-2 수학', '3-1 수학', '공강', '교재연구', '3-3 수학', '기안결재', ''],
  '금': ['3-3 수학', '교재연구', '3-2 수학', '공강', '3-1 수학', '학급조회', '']
};

export default function TimetableWidget({ type, size, width, height }: TimetableWidgetProps) {
  const isClassType = type === 'class';
  const storageKey = `widget_timetable_${type}`;
  
  const [grid, setGrid] = useState<TimetableData>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return isClassType ? DEFAULT_CLASS_GRID : DEFAULT_TEACHER_GRID;
  });

  const [editingCell, setEditingCell] = useState<{ day: string; period: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [todayDay, setTodayDay] = useState('');

  useEffect(() => {
    setTodayDay(getKSTDayOfWeek(new Date()));
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(grid));
  }, [grid, storageKey]);

  const handleCellClick = (day: string, periodIndex: number) => {
    setEditingCell({ day, period: periodIndex });
    setEditValue(grid[day][periodIndex]);
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    const { day, period } = editingCell;
    const updated = { ...grid };
    updated[day][period] = editValue.trim();
    setGrid(updated);
    setEditingCell(null);
  };

  const handleSuggestionClick = (subj: string) => {
    setEditValue(subj);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        if (fileExt === 'xlsx' || fileExt === 'xls') {
          try {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csvText = XLSX.utils.sheet_to_csv(worksheet);

            if (csvText) {
              const parsed = parseCSVToTimetable(csvText);
              setGrid(parsed);
              alert('시간표 엑셀 업로드가 정상적으로 완료되었습니다!');
            }
          } catch (err) {
            console.error(err);
            alert('시간표 엑셀 파일을 읽는 중 오류가 발생했습니다.');
          }
        } else {
          // Robust text decoding for CSV
          let text = '';
          try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            text = decoder.decode(buffer);
          } catch (err) {
            const eucKrDecoder = new TextDecoder('euc-kr');
            text = eucKrDecoder.decode(buffer);
          }

          if (text) {
            const parsed = parseCSVToTimetable(text);
            setGrid(parsed);
            alert('시간표 CSV 가져오기가 성공적으로 완료되었습니다!');
          }
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    let csv = `교시,월,화,수,목,금\n`;
    for (let period = 0; period < 7; period++) {
      const row = [
        `${period + 1}교시`,
        grid['월'][period] || '',
        grid['화'][period] || '',
        grid['수'][period] || '',
        grid['목'][period] || '',
        grid['금'][period] || ''
      ];
      csv += row.map(v => `"${v.replace(/"/g, '""')}"`).join(',') + '\n';
    }
    downloadCSV(csv, `${isClassType ? 'class' : 'teacher'}_timetable.csv`);
  };

  const clearTimetable = () => {
    const cleared: TimetableData = {
      '월': ['', '', '', '', '', '', ''],
      '화': ['', '', '', '', '', '', ''],
      '수': ['', '', '', '', '', '', ''],
      '목': ['', '', '', '', '', '', ''],
      '금': ['', '', '', '', '', '', '']
    };
    setGrid(cleared);
  };

  return (
    <div className="flex flex-col h-full justify-between select-none p-0.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 dark:border-black/5 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <CalendarDays className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold">{isClassType ? '학급 주간 시간표' : '교사 시간표'}</span>
        </div>
        <div className="flex items-center gap-1 font-extrabold no-drag">
          <label className="cursor-pointer bg-[#D5F5E3] hover:bg-[#A9DFBF] active:bg-[#7DCEA0] text-[#1E8449] border border-[#A9DFBF] p-1.5 rounded-lg text-[9.5px] flex items-center gap-1 transition-all font-extrabold shadow-xs dark:bg-[#1a382ca0] dark:text-[#58d68d] dark:border-[#27ae60]/40 hover:dark:bg-[#228b51] active:dark:bg-[#1e7b45]" title="엑셀/CSV 업로드">
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-[#1E8449] dark:text-[#58d68d]" />
            <span>업로드</span>
            <input type="file" onChange={handleCSVImport} accept=".csv, .xlsx, .xls" className="hidden" />
          </label>
          <button
            onClick={handleExport}
            className="cursor-pointer bg-[#EBF5FB] hover:bg-[#D4E6F1] active:bg-[#A9CCE3] text-[#1A5276] border border-[#AED6F1] p-1.5 rounded-lg text-[9.5px] flex items-center gap-1 transition-all font-extrabold shadow-xs dark:bg-[#1a2c3aa0] dark:text-[#5fa9e6] dark:border-[#2a5573]/40 hover:dark:bg-[#254f6e] active:dark:bg-[#2d628a]"
            title="CSV 내보내기"
          >
            <Download className="w-3.5 h-3.5 text-[#1A5276] dark:text-[#5fa9e6]" />
            <span>다운로드</span>
          </button>
          <button
            onClick={clearTimetable}
            className="cursor-pointer bg-[#FDEDEC] hover:bg-[#FADBD8] active:bg-[#F5B7B1] text-[#C0392B] border border-[#FADBD8] p-1.5 rounded-lg transition-all text-[9.5px] shadow-xs flex items-center gap-1 dark:bg-[#3d1a1aa0] dark:text-[#f1948a] dark:border-[#ec7063]/40 hover:dark:bg-[#4d2222] active:dark:bg-[#5e2a2a]"
            title="시간표 전체 지우기"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#C0392B] dark:text-[#f1948a]" />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 my-2 overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="border-b border-slate-350/30 dark:border-slate-800/10">
              <th className="py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 w-12 shrink-0">교시</th>
              {DAYS.map(day => {
                const isToday = day === todayDay;
                return (
                  <th
                    key={day}
                    className={`py-1 text-[10px] font-bold leading-none ${
                      isToday
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 rounded-t-lg font-extrabold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array(7).fill(0).map((_, periodIndex) => (
              <tr key={periodIndex} className="border-b border-slate-200/40 dark:border-slate-850/10">
                <td className="py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 font-mono">
                  {periodIndex + 1}교시
                </td>
                {DAYS.map(day => {
                  const subject = grid[day][periodIndex] || '';
                  const isToday = day === todayDay;
                  const isEmpty = !subject;
                  
                  return (
                    <td
                      key={day}
                      onClick={() => handleCellClick(day, periodIndex)}
                      className={`cursor-pointer py-1.5 px-1 text-[10px] font-semibold transition-all hover:bg-indigo-500/5 ${
                        isToday ? 'bg-indigo-500/5 font-extrabold text-indigo-750 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                      } ${isEmpty ? 'text-slate-300 dark:text-slate-700 italic' : ''}`}
                    >
                      <div className="min-h-5 flex items-center justify-center truncate">
                        {subject || '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline Cell Editor Drawer */}
      {editingCell && (
        <div className="z-10 no-drag bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-md mt-1 animate-scale-up">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Edit2 className="w-3 h-3 text-indigo-500" />
              <span>[{editingCell.day}요일] {editingCell.period + 1}교시 수업 편집</span>
            </span>
            <button
              onClick={() => setEditingCell(null)}
              className="cursor-pointer text-[10px] text-slate-400 hover:text-slate-600 font-bold"
            >
              닫기
            </button>
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 text-[11px] bg-white dark:bg-black border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-400 font-bold"
              placeholder="과목명 또는 활동명"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCell();
              }}
            />
            <button
              onClick={handleSaveCell}
              className="cursor-pointer bg-indigo-500 hover:bg-indigo-600 text-white rounded px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 shadow-sm"
            >
              <Save className="w-3 h-3" />
              <span>저장</span>
            </button>
          </div>

          {/* Subject chips suggestions */}
          <div className="flex flex-wrap gap-1 mt-2 max-h-12 overflow-y-auto">
            {SUBJECT_SUGGESTIONS.map(subj => (
              <button
                key={subj}
                onClick={() => handleSuggestionClick(subj)}
                className="cursor-pointer text-[9px] bg-white dark:bg-black/30 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded hover:border-indigo-400"
              >
                {subj}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
