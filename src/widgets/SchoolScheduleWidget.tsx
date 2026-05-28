/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Download, FileCode, CheckCircle } from 'lucide-react';
import { ScheduleEvent, NeisConfig } from '../types/dashboard';
import { fetchSchoolSchedule } from '../services/neisService';
import { getKSTDateString, formatKSTFullDate } from '../services/dateService';
import { downloadCSV } from '../services/excelService';

interface SchoolScheduleWidgetProps {
  neisConfig: NeisConfig;
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

const SCHEDULE_COLORS = [
  { bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-350 border-l border-emerald-400' },
  { bg: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-350 border-l border-indigo-400' },
  { bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/45 dark:text-amber-300 border-l border-amber-400' },
  { bg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-l border-rose-400' },
  { bg: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-l border-sky-400' },
  { bg: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-l border-teal-400' },
  { bg: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-350 border-l border-violet-400' },
  { bg: 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-300 border-l border-orange-400' },
  { bg: 'bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 border-l border-fuchsia-400' },
];

const getEventColorClass = (title: string, isAttendanceSync?: boolean) => {
  if (isAttendanceSync) {
    return 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-350 border-l-2 border-red-500 font-extrabold';
  }
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SCHEDULE_COLORS.length;
  return SCHEDULE_COLORS[index].bg;
};

const getEventBulletColor = (title: string, isAttendanceSync?: boolean) => {
  if (isAttendanceSync) {
    return 'bg-red-500';
  }
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500',
    'bg-sky-500', 'bg-teal-500', 'bg-violet-500', 'bg-orange-500', 'bg-fuchsia-500'
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function SchoolScheduleWidget({ neisConfig, size, width, height }: SchoolScheduleWidgetProps) {
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() }; // 0-indexed month
  });

  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('widget_school_schedule_events');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [showEventDialog, setShowEventDialog] = useState(false);

  // Sync state with other widgets via localStorage + window events
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>(() => {
    const saved = localStorage.getItem('school_attendance_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [classes, setClasses] = useState<any[]>(() => {
    const saved = localStorage.getItem('school_classes_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    const handleAttSync = () => {
      const saved = localStorage.getItem('school_attendance_records');
      if (saved) {
        try { setAttendanceRecords(JSON.parse(saved)); } catch (e) {}
      }
    };
    const handleClassSync = () => {
      const saved = localStorage.getItem('school_classes_data');
      if (saved) {
        try { setClasses(JSON.parse(saved)); } catch (e) {}
      }
    };

    window.addEventListener('school_attendance_updated', handleAttSync);
    window.addEventListener('school_classes_updated', handleClassSync);

    return () => {
      window.removeEventListener('school_attendance_updated', handleAttSync);
      window.removeEventListener('school_classes_updated', handleClassSync);
    };
  }, []);

  // Load NEIS Schedules for current year-month
  useEffect(() => {
    let active = true;
    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      const startDay = `${currentYearMonth.year}-${(currentYearMonth.month + 1).toString().padStart(2, '0')}-01`;
      const endDay = `${currentYearMonth.year}-${(currentYearMonth.month + 1).toString().padStart(2, '0')}-31`;
      
      try {
        const neisEvents = await fetchSchoolSchedule(neisConfig, startDay, endDay);
        if (active) {
          // Merge user custom events with fetched NEIS events
          setEvents(prev => {
            const users = prev.filter(e => !e.isNeis);
            // Deduplicate NEIS events by date + title
            const uniqueNeis = neisEvents.filter(ne => !users.some(ue => ue.date === ne.date && ue.title === ne.title));
            return [...users, ...uniqueNeis];
          });
        }
      } catch (e) {
        console.warn('Failed to load school schedule events:', e);
      } finally {
        if (active) setLoadingSchedule(false);
      }
    };

    fetchSchedule();
    return () => { active = false; };
  }, [neisConfig, currentYearMonth]);

  // Persist only non-NEIS custom events
  useEffect(() => {
    const userCustomOnly = events.filter(e => !e.isNeis);
    localStorage.setItem('widget_school_schedule_events', JSON.stringify(userCustomOnly));
  }, [events]);

  const handlePrevMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleAddEvent = () => {
    if (!selectedDate || !newEventTitle.trim()) return;
    
    const newEv: ScheduleEvent = {
      id: `user-event-${Date.now()}`,
      title: newEventTitle.trim(),
      date: selectedDate,
      description: '교사 직접 등록 일정',
      isNeis: false
    };

    setEvents(prev => [newEv, ...prev]);
    setNewEventTitle('');
    setShowEventDialog(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Math for Calendar Days
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonthIndex = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 is Sunday

  const totalDays = getDaysInMonth(currentYearMonth.year, currentYearMonth.month);
  const firstDayIndex = getFirstDayOfMonthIndex(currentYearMonth.year, currentYearMonth.month);
  
  const calendarCells: ({ dateStr: string; dayNo: number; isPadding: boolean })[] = [];

  // Padding from previous month
  const prevMonth = currentYearMonth.month === 0 ? 11 : currentYearMonth.month - 1;
  const prevYear = currentYearMonth.month === 0 ? currentYearMonth.year - 1 : currentYearMonth.year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNo = daysInPrevMonth - i;
    const mStr = (prevMonth + 1).toString().padStart(2, '0');
    calendarCells.push({
      dateStr: `${prevYear}-${mStr}-${dNo.toString().padStart(2, '0')}`,
      dayNo: dNo,
      isPadding: true
    });
  }

  // Current month days
  const currentMonthStr = (currentYearMonth.month + 1).toString().padStart(2, '0');
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push({
      dateStr: `${currentYearMonth.year}-${currentMonthStr}-${d.toString().padStart(2, '0')}`,
      dayNo: d,
      isPadding: false
    });
  }

  // Padding for next month to complete 6-row layout
  const cellsNeeded = 42; // 6 rows * 7 columns standard
  const nextMonth = currentYearMonth.month === 11 ? 0 : currentYearMonth.month + 1;
  const nextYear = currentYearMonth.month === 11 ? currentYearMonth.year + 1 : currentYearMonth.year;
  const nextMonthStr = (nextMonth + 1).toString().padStart(2, '0');
  let nextDayCounter = 1;
  while (calendarCells.length < cellsNeeded) {
    calendarCells.push({
      dateStr: `${nextYear}-${nextMonthStr}-${nextDayCounter.toString().padStart(2, '0')}`,
      dayNo: nextDayCounter,
      isPadding: true
    });
    nextDayCounter++;
  }

  // ics simulated parsing
  const handleIcsImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extremely simple robust regex parser for lines of VEVENT -> SUMMARY & DTSTART
      const evParts = text.split('BEGIN:VEVENT');
      const imported: ScheduleEvent[] = [];
      
      evParts.slice(1).forEach((part, index) => {
        const dtstartMatch = part.match(/DTSTART;?.*:(\d{8})/);
        const summaryMatch = part.match(/SUMMARY:(.*)/);
        
        if (dtstartMatch && summaryMatch) {
          const rawDate = dtstartMatch[1]; // e.g. "20260515"
          const title = summaryMatch[1].trim();
          const pDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
          
          imported.push({
            id: `ics-import-${index}-${Date.now()}`,
            title,
            date: pDate,
            description: '.ics 파일 기반 일정 수입',
            isNeis: false
          });
        }
      });

      if (imported.length > 0) {
        setEvents(prev => [...imported, ...prev]);
        alert(`${imported.length}개의 일정이 파일에서 성공적으로 수집되었습니다.`);
      } else {
        alert('올바른 .ics 파일을 검지하지 못했습니다. standard VEVENT 구조를 확인하십시오.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExportSchedule = () => {
    let csv = `일자,일정 제목,출처,메모\n`;
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach(ev => {
      csv += `${ev.date},"${ev.title}",${ev.isNeis ? 'NEIS 연동' : '교사 수기'},"${ev.description || ''}"\n`;
    });
    downloadCSV(csv, 'academic_school_schedule.csv');
  };

  const getEventsForDate = (dateStr: string) => {
    const baseEvents = events.filter(e => e.date === dateStr);
    const atts = attendanceRecords.filter(r => r.date === dateStr && r.status !== '출석');
    const virtualEvents = atts.map(at => {
      let stName = `학생(ID: ${at.studentId})`;
      for (const cls of classes) {
        const sFound = cls.students?.find((s: any) => s.id === at.studentId);
        if (sFound) {
          stName = sFound.name;
          break;
        }
      }
      return {
        id: `att-virtual-${at.id}`,
        title: `🚨 ${stName} (${at.status})`,
        date: dateStr,
        description: `${stName} 학생 출결 상태: ${at.status}`,
        isNeis: false,
        isAttendanceSync: true
      } as ScheduleEvent;
    });

    return [...baseEvents, ...virtualEvents];
  };

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="flex flex-col h-full select-none p-0.5 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 dark:border-black/5 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <Calendar className="w-4 h-4 text-violet-500" />
          <span className="font-semibold">학사일정 & 월간 달력</span>
        </div>
        <div className="flex items-center gap-1.5 no-drag">
          <label className="cursor-pointer p-1.5 bg-[#D5F5E3] hover:bg-[#A9DFBF] active:bg-[#7DCEA0] text-[#1E8449] border border-[#A9DFBF] rounded-lg text-[10px] flex items-center gap-1.5 transition-all font-extrabold shadow-xs dark:bg-[#1a382ca0] dark:text-[#58d68d] dark:border-[#27ae60]/40 hover:dark:bg-[#228b51] active:dark:bg-[#1e7b45]" title="ICS 파일 업로드">
            <FileCode className="w-3.5 h-3.5 text-[#1E8449] dark:text-[#58d68d]" />
            <span>업로드</span>
            <input type="file" onChange={handleIcsImport} accept=".ics" className="hidden" />
          </label>
          <button
            onClick={handleExportSchedule}
            className="cursor-pointer p-1.5 bg-[#EBF5FB] hover:bg-[#D4E6F1] active:bg-[#A9CCE3] text-[#1A5276] border border-[#AED6F1] rounded-lg text-[10px] flex items-center gap-1.5 transition-all font-extrabold shadow-xs dark:bg-[#1a2c3aa0] dark:text-[#5fa9e6] dark:border-[#2a5573]/40 hover:dark:bg-[#254f6e] active:dark:bg-[#2d628a]"
            title="엑셀/CSV로 출력"
          >
            <Download className="w-3.5 h-3.5 text-[#1A5276] dark:text-[#5fa9e6]" />
            <span>다운로드</span>
          </button>
        </div>
      </div>

      {/* Monthly Navigation and Title */}
      <div className="flex items-center justify-center no-drag mt-2 mb-1.5 shrink-0">
        <div className="flex items-center gap-5 py-1.5 px-5 bg-slate-500/5 dark:bg-white/5 rounded-xl border border-slate-500/5 dark:border-white/5">
          <button
            onClick={handlePrevMonth}
            className="cursor-pointer p-1 hover:bg-white/40 dark:hover:bg-black/30 rounded text-slate-600 dark:text-slate-350 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 min-w-[72px] text-center">
            {currentYearMonth.year}년 {currentYearMonth.month + 1}월
          </span>
          <button
            onClick={handleNextMonth}
            className="cursor-pointer p-1 hover:bg-white/40 dark:hover:bg-black/30 rounded text-slate-600 dark:text-slate-350 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Calendar */}
      <div className="flex-1 min-h-0 my-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-400 mb-1 border-b border-slate-200/50 dark:border-slate-850/10 pb-1">
          <span className="text-red-500">일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span className="text-sky-500">토</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateStr === getKSTDateString(new Date());
            const dayEvents = getEventsForDate(cell.dateStr);
            const isSelected = selectedDate === cell.dateStr;
            const colIdx = idx % 7;
            let tooltipAlignClass = "left-1/2 -translate-x-1/2";
            if (colIdx === 0 || colIdx === 1) {
              tooltipAlignClass = "left-0";
            } else if (colIdx === 5 || colIdx === 6) {
              tooltipAlignClass = "right-0 left-auto";
            }
            
            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDate(cell.dateStr);
                  setShowEventDialog(true);
                }}
                className={`group cursor-pointer min-h-[48px] p-1 rounded-lg border transition-all flex flex-col justify-between items-stretch relative ${
                  cell.isPadding 
                    ? 'text-slate-300 dark:text-slate-700 border-transparent opacity-45' 
                    : 'text-slate-700 dark:text-slate-300 border-slate-100 dark:border-black/5 hover:bg-violet-500/10'
                } ${isToday ? 'bg-indigo-500/15 border-indigo-550/30' : ''} ${
                  isSelected ? 'ring-1 ring-violet-500 bg-violet-500/10 border-violet-500' : ''
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : ''}`}>
                    {cell.dayNo}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[7.5px] leading-none bg-indigo-500/20 text-indigo-700 dark:text-indigo-350 px-1 py-0.5 rounded font-black shrink-0">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                
                {/* Event titles as text inside cell */}
                {dayEvents.length > 0 && (
                  <div className="mt-1 space-y-0.5 w-full flex-1">
                    {dayEvents.slice(0, 2).map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        className={`text-[8px] leading-tight px-1 py-0.5 rounded-xs truncate w-full font-bold text-left select-none ${getEventColorClass(ev.title, ev.isAttendanceSync)}`}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[7px] text-slate-400 dark:text-slate-500 font-extrabold text-left pl-1">
                        외 {dayEvents.length - 2}개 더...
                      </div>
                    )}
                  </div>
                )}

                {/* Hover Tooltip displaying brief schedules */}
                {dayEvents.length > 0 && (
                  <div className={`absolute bottom-full mb-1.5 ${tooltipAlignClass} hidden group-hover:block z-50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg p-2.5 text-[9px] leading-relaxed shadow-xl border border-slate-200 dark:border-white/10 w-44 backdrop-blur-md transition-all duration-200 pointer-events-none`}>
                    <p className="font-extrabold border-b border-slate-100 dark:border-white/10 pb-1 mb-1.5 text-indigo-600 dark:text-indigo-400">{cell.dateStr.replace(/-/g, '.')}. 일정</p>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {dayEvents.map((ev, eIdx) => (
                        <div key={eIdx} className="flex gap-1 items-start">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${getEventBulletColor(ev.title, ev.isAttendanceSync)}`} />
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold block text-slate-800 dark:text-slate-100 select-text truncate">{ev.title}</span>
                            {ev.description && <span className="text-[7.5px] text-slate-500 dark:text-slate-400 block truncate">{ev.description}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialogue and List Events section */}
      {showEventDialog && selectedDate && (
        <div className="z-10 no-drag bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-md mt-1 animate-scale-up">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400">
              📅 {selectedDate} 일정 일람
            </span>
            <button onClick={() => setShowEventDialog(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
              닫기
            </button>
          </div>

          {/* Existing Events on this date */}
          {selectedDayEvents.length > 0 && (
            <div className="max-h-24 overflow-y-auto space-y-1 mb-2 pr-1">
              {selectedDayEvents.map(ev => (
                <div key={ev.id} className="flex justify-between items-center p-1 bg-white dark:bg-black/40 rounded-lg border border-slate-200/50 dark:border-slate-850/10 text-[10px]">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">{ev.title}</span>
                    <span className="text-[8px] text-slate-400 block truncate">{ev.description}</span>
                  </div>
                  {!ev.isNeis && !ev.isAttendanceSync && (
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="cursor-pointer p-0.5 hover:bg-red-500/10 text-red-500 rounded ml-1 text-[8px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add custom Event form */}
          <div className="flex gap-1">
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="학급 행사 기획 추가..."
              className="flex-1 text-[11px] bg-white dark:bg-black border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-violet-400 font-bold"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEvent(); }}
            />
            <button
              onClick={handleAddEvent}
              className="cursor-pointer bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>추가</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
