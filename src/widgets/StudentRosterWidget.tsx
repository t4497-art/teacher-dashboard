/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, Plus, Trash2, Sticker, Award, LogIn, Download, 
  FileSpreadsheet, PlusCircle, ClipboardEdit, BarChart3, HelpCircle, X,
  MessageSquare, Info, Settings, ArrowLeft
} from 'lucide-react';
import { ClassInfo, Student, AttendanceStatus, AttendanceRecord, CounselingLog } from '../types/dashboard';
import { getKSTDateString } from '../services/dateService';
import { downloadCSV, exportRosterToCSV, exportCounselingToCSV, parseCSVToStudents, getRosterCSVTemplate } from '../services/excelService';

interface StudentRosterWidgetProps {
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

const ATTENDANCE_STATUS_LIST: AttendanceStatus[] = [
  '출석', '질병결석', '질병조퇴', '질병지각', 
  '미인정결석', '미인정지각', '미인정조퇴', 
  '인정결석', '인정지각', '인정조퇴', '결과', '미인정결과'
];

const DEFAULT_CLASSES: ClassInfo[] = [
  {
    id: 'class-default',
    className: '3학년 1반',
    students: [
      { id: 'st-1', number: 1, name: '강재희', memo: '학급 반장, 성실함', stickers: 3 },
      { id: 'st-2', number: 2, name: '김민수', memo: '수학 부장, 영재반 활동', stickers: 5 },
      { id: 'st-3', number: 3, name: '박서하', memo: '미술 도우미, 감수성 우수', stickers: 2 },
      { id: 'st-4', number: 4, name: '안지환', memo: '체육 부장, 축구 대표', stickers: 4 },
      { id: 'st-5', number: 5, name: '이윤서', memo: '독서왕, 작문실력 뛰어남', stickers: 6 },
      { id: 'st-6', number: 6, name: '최주원', memo: '컴퓨터 정보 부서 부대표', stickers: 1 }
    ]
  }
];

export default function StudentRosterWidget({ size, width, height }: StudentRosterWidgetProps) {
  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const saved = localStorage.getItem('school_classes_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return DEFAULT_CLASSES;
  });

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    return classes[0]?.id || 'class-default';
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('school_attendance_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [counselingLogs, setCounselingLogs] = useState<CounselingLog[]>(() => {
    const saved = localStorage.getItem('school_counseling_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  // UI state managers
  const [newClassName, setNewClassName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState<number | ''>('');
  const [newStudentClass, setNewStudentClass] = useState<number | ''>('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNum, setNewStudentNum] = useState<number | ''>('');
  const [newStudentMemo, setNewStudentMemo] = useState('');
  const [selectedAttendDate, setSelectedAttendDate] = useState(() => getKSTDateString(new Date()));

  // Inline edit state variables
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingGrade, setEditingGrade] = useState<number | ''>('');
  const [editingClass, setEditingClass] = useState<number | ''>('');
  const [editingNum, setEditingNum] = useState<number | ''>('');
  const [editingName, setEditingName] = useState('');

  // Toast / Confirmation States
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };
  const [deleteStudentConfirmId, setDeleteStudentConfirmId] = useState<string | null>(null);
  const [deleteClassConfirmId, setDeleteClassConfirmId] = useState<string | null>(null);

  // Counsel form
  const [counselStudentId, setCounselStudentId] = useState('');
  const [counselContent, setCounselContent] = useState('');
  const [counselTag, setCounselTag] = useState('학습태도');

  // Counsel modal speech balloon double click state variables
  const [editingCounselLogId, setEditingCounselLogId] = useState<string | null>(null);
  const [editingCounselLogTextId, setEditingCounselLogTextId] = useState<string>('');
  const [editingCounselLogText, setEditingCounselLogText] = useState<string>('');

  // Show stats overlay
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Show config panel switch (True: excel upload & description screen)
  const [showRosterConfig, setShowRosterConfig] = useState(false);

  // Trigger LocalStorage saves and trigger sync event across window
  useEffect(() => {
    const serialized = JSON.stringify(classes);
    const existing = localStorage.getItem('school_classes_data');
    if (existing !== serialized) {
      localStorage.setItem('school_classes_data', serialized);
      // Dispatch custom event to notify all other widgets in the same window
      window.dispatchEvent(new Event('school_classes_updated'));
    }
  }, [classes]);

  useEffect(() => {
    const serialized = JSON.stringify(attendanceRecords);
    const existing = localStorage.getItem('school_attendance_records');
    if (existing !== serialized) {
      localStorage.setItem('school_attendance_records', serialized);
      // Dispatch custom event to notify other widgets
      window.dispatchEvent(new Event('school_attendance_updated'));
    }
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('school_counseling_logs', JSON.stringify(counselingLogs));
  }, [counselingLogs]);

  // Handle cross-widget sync from custom window event
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('school_classes_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setClasses(prev => {
            if (JSON.stringify(prev) === saved) {
              return prev;
            }
            return parsed;
          });
        } catch (e) { /* ignore */ }
      }
    };
    window.addEventListener('school_classes_updated', handleSync);
    return () => window.removeEventListener('school_classes_updated', handleSync);
  }, []);

  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];

  // Auto-detect Grade & Class based on class room name for entry comfort
  useEffect(() => {
    if (activeClass) {
      const match = activeClass.className.match(/(\d+)\s*학년\s*(\d+)/);
      if (match) {
        setNewStudentGrade(parseInt(match[1]));
        setNewStudentClass(parseInt(match[2]));
      } else {
        const matchSimple = activeClass.className.match(/(\d+)\s*-\s*(\d+)/);
        if (matchSimple) {
          setNewStudentGrade(parseInt(matchSimple[1]));
          setNewStudentClass(parseInt(matchSimple[2]));
        } else {
          setNewStudentGrade('');
          setNewStudentClass('');
        }
      }
    }
  }, [activeClassId, classes]);

  // Classroom roster additions
  const handleCreateClass = () => {
    if (!newClassName.trim()) return;
    const newClass: ClassInfo = {
      id: `class-${Date.now()}`,
      className: newClassName.trim(),
      students: []
    };
    setClasses([...classes, newClass]);
    setActiveClassId(newClass.id);
    setNewClassName('');
  };

  const handleDeleteClass = (id: string) => {
    if (deleteClassConfirmId !== id) {
      setDeleteClassConfirmId(id);
      showToast('⚠️ 한번 더 누르면 학급과 명단이 영구 삭제됩니다.');
      setTimeout(() => setDeleteClassConfirmId(null), 3000);
      return;
    }

    if (classes.length <= 1) {
      const updated = classes.map(c => {
        if (c.id === id) {
          return {
            ...c,
            className: '새 학급',
            students: []
          };
        }
        return c;
      });
      setClasses(updated);
      setDeleteClassConfirmId(null);
      showToast('마지막 학급의 학생 명렬이 초기화되었습니다.');
      return;
    }

    const remaining = classes.filter(c => c.id !== id);
    setClasses(remaining);
    setActiveClassId(remaining[0].id);
    setDeleteClassConfirmId(null);
    showToast('선택한 학급이 완벽하게 삭제되었습니다.');
  };

  const handleAddStudent = () => {
    if (!activeClass || !newStudentName.trim()) return;
    
    const num = typeof newStudentNum === 'number' 
      ? newStudentNum 
      : activeClass.students.length > 0 
        ? Math.max(...activeClass.students.map(s => s.number)) + 1 
        : 1;

    const newStudent: Student = {
      id: `st-${Date.now()}`,
      grade: typeof newStudentGrade === 'number' ? newStudentGrade : undefined,
      groupClass: typeof newStudentClass === 'number' ? newStudentClass : undefined,
      number: num,
      name: newStudentName.trim(),
      memo: newStudentMemo.trim(),
      stickers: 0
    };

    const updated = classes.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          students: [...c.students, newStudent].sort((a,b) => a.number - b.number)
        };
      }
      return c;
    });

    setClasses(updated);
    setNewStudentName('');
    setNewStudentNum('');
    setNewStudentMemo('');
  };

  const handleDeleteStudent = (stId: string) => {
    if (!activeClass) return;
    if (deleteStudentConfirmId !== stId) {
      setDeleteStudentConfirmId(stId);
      setTimeout(() => setDeleteStudentConfirmId(null), 3050);
      return;
    }
    const updated = classes.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          students: c.students.filter(s => s.id !== stId)
        };
      }
      return c;
    });
    setClasses(updated);
    setCounselStudentId('');
    setDeleteStudentConfirmId(null);
    showToast('학생이 정상적으로 명부에서 삭제되었습니다.');
  };

  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const handleClearAllStudents = () => {
    if (!activeClass) return;
    if (!clearAllConfirm) {
      setClearAllConfirm(true);
      setTimeout(() => setClearAllConfirm(false), 3000);
      return;
    }
    const updated = classes.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          students: []
        };
      }
      return c;
    });
    setClasses(updated);
    showToast('현재 학급의 모든 학생이 삭제되었습니다.');
    setClearAllConfirm(false);
  };

  const handleStartEdit = (st: Student) => {
    setEditingStudentId(st.id);
    setEditingGrade(st.grade !== undefined ? st.grade : '');
    setEditingClass(st.groupClass !== undefined ? st.groupClass : '');
    setEditingNum(st.number);
    setEditingName(st.name);
  };

  const handleSaveStudentEdit = (stId: string) => {
    if (!editingName.trim()) {
      showToast('학생 이름을 입력해주세요.');
      return;
    }
    const num = typeof editingNum === 'number' ? editingNum : 1;
    
    const updated = classes.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          students: c.students.map(s => s.id === stId ? {
            ...s,
            grade: typeof editingGrade === 'number' ? editingGrade : undefined,
            groupClass: typeof editingClass === 'number' ? editingClass : undefined,
            number: num,
            name: editingName.trim()
          } : s).sort((a,b) => {
            if (a.grade !== b.grade && a.grade !== undefined && b.grade !== undefined) return a.grade - b.grade;
            if (a.groupClass !== b.groupClass && a.groupClass !== undefined && b.groupClass !== undefined) return a.groupClass - b.groupClass;
            return a.number - b.number;
          })
        };
      }
      return c;
    });
    setClasses(updated);
    setEditingStudentId(null);
  };

  // Sticker adjustments
  const handleStickerChange = (stId: string, val: number) => {
    const updated = classes.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          students: c.students.map(s => s.id === stId ? { ...s, stickers: Math.max(0, s.stickers + val) } : s)
        };
      }
      return c;
    });
    setClasses(updated);
  };

  // State Attendance checkers
  const getAttendanceForStudent = (stId: string, date: string): AttendanceStatus => {
    const found = attendanceRecords.find(a => a.studentId === stId && a.date === date);
    return found ? found.status : '출석'; // Default is Present
  };

  const handleAttendanceChange = (stId: string, status: AttendanceStatus) => {
    const existingIdx = attendanceRecords.findIndex(a => a.studentId === stId && a.date === selectedAttendDate);
    
    if (existingIdx !== -1) {
      const updated = [...attendanceRecords];
      updated[existingIdx] = { ...updated[existingIdx], status };
      setAttendanceRecords(updated);
    } else {
      setAttendanceRecords([
        ...attendanceRecords,
        {
          id: `att-${Date.now()}-${stId}`,
          date: selectedAttendDate,
          studentId: stId,
          status
        }
      ]);
    }
  };

  // Counseling logs submissions
  const handleAddCounselLog = () => {
    if (!counselStudentId || !counselContent.trim()) return;

    const newLog: CounselingLog = {
      id: `counsel-${Date.now()}`,
      studentId: counselStudentId,
      date: getKSTDateString(new Date()),
      content: counselContent.trim(),
      tag: counselTag
    };

    setCounselingLogs([newLog, ...counselingLogs]);
    setCounselContent('');
    alert('상담 일지가 성공적으로 등재되었습니다.');
  };

  // CSV and Excel importers/exporters
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeClass) return;
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
              const parsed = parseCSVToStudents(csvText) as Student[];
              if (parsed.length === 0) {
                alert('엑셀 파일에서 유효한 학생 정보를 찾지 못했습니다. 번호, 이름 열이 존재하는지 확인하십시오.');
                return;
              }
              const withIds = parsed.map((s, idx) => ({
                ...s,
                id: `st-csv-${idx}-${Date.now()}`,
                stickers: s.stickers || 0,
                memo: s.memo || ''
              }));

              const updated = classes.map(c => {
                if (c.id === activeClassId) {
                  return {
                    ...c,
                    students: withIds.sort((a,b) => a.number - b.number)
                  };
                }
                return c;
              });
              setClasses(updated);
              alert(`엑셀 명부 가져오기 완료! 기존 명부를 대체하여 ${withIds.length}명의 학생이 새로이 등록되었습니다.`);
            }
          } catch (err) {
            console.error(err);
            alert('엑셀 파일을 읽는 중 오류가 발생했습니다. 올바른 .xlsx 규격인지 점검하십시오.');
          }
        } else {
          // Standard CSV fallback with auto-encoding
          let text = '';
          try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            text = decoder.decode(buffer);
          } catch (err) {
            const eucKrDecoder = new TextDecoder('euc-kr');
            text = eucKrDecoder.decode(buffer);
          }

          if (text) {
            const parsed = parseCSVToStudents(text) as Student[];
            if (parsed.length === 0) {
              alert('CSV 파일에서 유효한 학생 정보를 찾지 못했습니다. 번호, 이름 열이 존재하는지 확인하십시오.');
              return;
            }
            const withIds = parsed.map((s, idx) => ({
              ...s,
              id: `st-csv-${idx}-${Date.now()}`,
              stickers: s.stickers || 0,
              memo: s.memo || ''
            }));

            const updated = classes.map(c => {
              if (c.id === activeClassId) {
                return {
                  ...c,
                  students: withIds.sort((a,b) => a.number - b.number)
                };
              }
              return c;
            });
            setClasses(updated);
            alert(`불러오기 완료! 기존 명단을 대체하여 ${withIds.length}명의 학생이 로드되었습니다.`);
          }
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportRoster = () => {
    if (!activeClass) return;
    const csv = exportRosterToCSV(activeClass.className, activeClass.students, attendanceRecords, counselingLogs);
    downloadCSV(csv, `${activeClass.className}_학생명렬_출결대장.csv`);
  };

  const handleExportCounsel = () => {
    if (!activeClass) return;
    const csv = exportCounselingToCSV(activeClass.students, counselingLogs);
    downloadCSV(csv, `${activeClass.className}_학생상담기록목록.csv`);
  };

  const handleDownloadTemplate = () => {
    downloadCSV(getRosterCSVTemplate(), '학급명렬표_양식.csv');
  };

  // Monthly stats calculations
  const getMonthlyStats = () => {
    const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g., "2026-05"
    const displayMonth = new Date().getMonth() + 1;
    
    // Attendance count
    const monthlyAttendance = attendanceRecords.filter(r => r.date.startsWith(currentYearMonth));
    const attendanceStats = {
      present: monthlyAttendance.filter(r => r.status === '출석').length,
      absent: monthlyAttendance.filter(r => ['질병결석', '미인정결석', '인정결석'].includes(r.status)).length,
      others: monthlyAttendance.filter(r => !['출석', '질병결석', '미인정결석', '인정결석'].some(s => r.status === s)).length
    };
    
    // Stickers
    const totalStickers = activeClass?.students.reduce((acc, s) => acc + s.stickers, 0) || 0;
    
    // Counseling count this month
    const monthlyCounseling = counselingLogs.filter(log => log.date.startsWith(currentYearMonth)).length;
    
    return {
      monthStr: `${displayMonth}월`,
      attendanceStats,
      totalStickers,
      monthlyCounseling,
      studentCount: activeClass?.students.length || 0
    };
  };

  const stats = getMonthlyStats();

  return (
    <div 
      className="flex flex-col select-none p-0.5 relative text-slate-800 dark:text-slate-100 w-full"
      style={{ 
        height: height ? `${height - 32}px` : '100%',
        maxHeight: '100%',
        minHeight: '40px'
      }}
    >
      
      {/* 1. TOP HEADER SELECTOR & SETTINGS */}
      <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold shrink-0">
            <Users className="w-4 h-4 text-apple-blue dark:text-sky-400" />
            <span className="text-sm font-bold tracking-tight">학생 명렬</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 no-drag">
            {/* Attendance Reference Date */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-500/5 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
              <span className="text-[10px] text-slate-400 dark:text-slate-350 font-extrabold">출결일:</span>
              <input
                type="date"
                value={selectedAttendDate}
                onChange={(e) => setSelectedAttendDate(e.target.value)}
                className="text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-bold py-0.5 px-1 outline-none text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Manual Class Setting / Class Rename Input */}
            <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">반명 편집:</span>
            <input
              type="text"
              value={activeClass?.className || ''}
              onChange={(e) => {
                const updatedName = e.target.value;
                setClasses(classes.map(c => c.id === activeClassId ? { ...c, className: updatedName } : c));
              }}
              className="text-[11px] w-24 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-apple-blue font-bold text-center shrink-0"
              placeholder="반명 직접 편집..."
              title="반 설정을 마우스 클릭 후 직접 수동 입력하여 수정할 수 있습니다."
            />

            <select
              value={activeClassId}
              onChange={(e) => {
                setActiveClassId(e.target.value);
                setCounselStudentId('');
              }}
              className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded px-1.5 py-0.5 outline-none font-bold shrink-0"
            >
              {classes.map(cl => (
                <option key={cl.id} value={cl.id} className="bg-white dark:bg-slate-900">{cl.className}</option>
              ))}
            </select>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClass(activeClassId);
              }}
              className={`cursor-pointer p-1 rounded transition-colors shrink-0 ${
                deleteClassConfirmId === activeClassId
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse scale-105'
                  : 'hover:bg-red-500/10 hover:text-red-500 text-slate-400 dark:text-slate-500'
              }`}
              title={deleteClassConfirmId === activeClassId ? "진짜로 학급 영구 제거" : "이 학급 영구 제거"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* MONTHLY STATS TRIGGER ICON */}
            <button
              onClick={() => setShowStatsModal(true)}
              className="cursor-pointer p-1 bg-apple-blue/10 hover:bg-apple-blue/25 text-apple-blue dark:text-sky-450 rounded-lg transition-all shrink-0"
              title="이번 달 통합 월간 통계 보기"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* ROSTER EXCEL CONFIG PANEL SPLIT SWITCH TRIGGER LINK BUTTON */}
            <button
              onClick={() => setShowRosterConfig(!showRosterConfig)}
              className={`cursor-pointer p-1 rounded-lg transition-all shrink-0 ${
                showRosterConfig
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/25 shadow-inner'
                  : 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-350'
              }`}
              title={showRosterConfig ? "학생 명부 본화면으로 복원" : "학급 엑셀 대장 및 명렬 입출력 제어판 열기"}
            >
              {showRosterConfig ? <ArrowLeft className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. UNIFIED INTEGRATED ROSTER VIEW (ALL IN ONE) */}
      <div className="flex-1 my-2 flex flex-col gap-2 min-h-0 overflow-hidden">
        {showRosterConfig ? (
          /* CONFIG PANEL VIEW FOR EXCEL INTERACTIVE */
          <div className="flex-1 no-drag flex flex-col gap-3.5 overflow-y-auto bg-slate-500/5 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/5 justify-start animate-scale-up">
            <div className="space-y-1 text-center py-2 shrink-0">
              <span className="text-sm font-extrabold text-indigo-600 dark:text-sky-400 flex items-center justify-center gap-1.5 mb-1 bg-indigo-500/5 dark:bg-sky-400/5 py-1.5 rounded-xl border border-indigo-500/10 dark:border-sky-400/10">
                <Settings className="w-4.5 h-4.5 text-indigo-500 dark:text-sky-400 animate-spin-slow" />
                <span>엑셀 파일 연동 및 학급 명부 제어판</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                대량의 학급 명단을 손쉽게 .xlsx/.csv 양식으로 관리하고 일괄 제어할 수 있는 보조 장치입니다.
              </p>
            </div>

            <div className="bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-3 shadow-sm shrink-0">
              <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block border-b border-slate-100 dark:border-white/5 pb-1.5 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>엑셀 / CSV 대장 가져오기 및 내보내기</span>
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={handleDownloadTemplate} 
                  className="cursor-pointer p-2.5 bg-[#EBF5FB] hover:bg-[#D4E6F1] active:bg-[#A9CCE3] text-[#1A5276] border border-[#AED6F1] rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all text-center shadow-xs dark:bg-[#1a2c3a] dark:text-[#5fa9e6] dark:border-[#2a5573] hover:dark:bg-[#254f6e] active:dark:bg-[#2d628a]"
                >
                  <Download className="w-3.5 h-3.5 text-[#1A5276] dark:text-[#5fa9e6]" />
                  <span>기본 엑셀 양식 다운로드</span>
                </button>
                
                <label className="cursor-pointer p-2.5 bg-[#D5F5E3] hover:bg-[#A9DFBF] active:bg-[#7DCEA0] text-[#1E8449] border border-[#A9DFBF] rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all text-center shadow-xs dark:bg-[#1a382c] dark:text-[#58d68d] dark:border-[#27ae60] hover:dark:bg-[#228b51] active:dark:bg-[#1e7b45]">
                  <PlusCircle className="w-3.5 h-3.5 text-[#1E8449] dark:text-[#58d68d]" />
                  <span>명렬표 파일 업로드 (.csv, .xlsx)</span>
                  <input type="file" onChange={(e) => { handleCSVImport(e); setShowRosterConfig(false); }} accept=".csv, .xlsx, .xls" className="hidden" />
                </label>
                
                <button 
                  onClick={handleExportRoster} 
                  className="cursor-pointer p-2.5 bg-[#EBF5FB] hover:bg-[#D4E6F1] active:bg-[#A9CCE3] text-[#1A5276] border border-[#AED6F1] rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all text-center shadow-xs dark:bg-[#1a2c3a] dark:text-[#5fa9e6] dark:border-[#2a5573] hover:dark:bg-[#254f6e] active:dark:bg-[#2d628a]"
                >
                  <Download className="w-3.5 h-3.5 text-[#1A5276] dark:text-[#5fa9e6]" />
                  <span>통합 명렬 다운로드 (.csv)</span>
                </button>

                <button 
                  onClick={handleClearAllStudents} 
                  className={`cursor-pointer p-2.5 rounded-lg border font-extrabold flex items-center justify-center gap-1.5 transition-all text-center shadow-xs ${
                    clearAllConfirm 
                      ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-[#FDEDEC] hover:bg-[#FADBD8] active:bg-[#F5B7B1] text-[#C0392B] border-[#FADBD8] dark:bg-[#3d1a1a] dark:text-[#f1948a] dark:border-[#ec7063] hover:dark:bg-[#4d2222]'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearAllConfirm ? '명렬 전체 비우기 최종승인!' : '명단 전체 비우기'}</span>
                </button>
              </div>
            </div>

            {/* Help Instruction & Guides Area (Inserted into config according to request) */}
            <div className="bg-slate-500/5 dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-1">
              <span className="font-extrabold text-slate-600 dark:text-slate-300 block flex items-center gap-1.5 text-[11px]">
                <Info className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
                <span>엑셀 파일 포맷 안내 및 단축법</span>
              </span>
              <ul className="list-disc pl-4.5 space-y-1 text-[10.5px] font-semibold">
                <li>업로드할 엑셀/CSV 파일의 첫 행에 <strong className="text-indigo-600 dark:text-indigo-400 underline decoration-dotted">"번호"</strong>과 <strong className="text-indigo-600 dark:text-indigo-400 underline decoration-dotted">"이름"</strong> 열이 반드시 포함되어 있어야 감지됩니다.</li>
                <li>기본 예시나 이전 학급 명렬이 남아있는 상태에서 학급을 업데이트하면 번거롭게 수동 삭제할 필요 없이 <strong>기존 명렬표가 자동 파기 및 교체</strong>됩니다.</li>
                <li><strong>성명 / 학번 칸을 더블 클릭</strong>하시면 팝업 없이 그 자리에서 즉시 수정할 수 있습니다.</li>
                <li>출결 선택 박스에서 당일 사유에 맞는 세부 상태를 지정하시면 달력 월간 통계에 합산되어 계산됩니다.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowRosterConfig(false)}
              className="cursor-pointer bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:brightness-95 rounded-xl p-2.5 font-bold text-xs text-center transition-all mt-auto shadow-xs"
            >
              학생 명부 화면으로 복귀하기
            </button>
          </div>
        ) : (
          /* STANDARD STUDENTS LIST SPREADSHEET TABLE VIEW */
          <>
            {/* Quick Student Registration Form */}
            <div className="no-drag bg-slate-500/5 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/5 flex flex-wrap gap-1.5 items-center text-[10px] shrink-0 w-full overflow-hidden">
              <span className="font-bold text-slate-600 dark:text-slate-350 block shrink-0">➕ 신규 학생:</span>
              <div className="flex flex-wrap gap-1.5 items-center w-full sm:w-auto flex-1 min-w-0">
                <input
                  type="number"
                  placeholder="학년"
                  value={newStudentGrade}
                  onChange={(e) => setNewStudentGrade(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-10 text-center font-bold bg-white dark:bg-slate-900 rounded border p-1 outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="반"
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-10 text-center font-bold bg-white dark:bg-slate-900 rounded border p-1 outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="번호"
                  value={newStudentNum}
                  onChange={(e) => setNewStudentNum(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-12 text-center font-bold bg-white dark:bg-slate-900 rounded border p-1 outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="이름"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-16 font-bold bg-white dark:bg-slate-900 rounded border px-1.5 py-1 outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />

                <button
                  onClick={handleAddStudent}
                  className="cursor-pointer bg-apple-blue hover:bg-apple-blue/95 hover:scale-[1.02] active:scale-[0.98] text-white rounded px-3 py-1 font-extrabold shrink-0 shadow-xs transition-all text-[9.5px]"
                >
                  기록 등재
                </button>
              </div>
            </div>

            {/* Spreadsheet Table of Students */}
            <div 
              className="flex-1 overflow-auto border border-slate-200 dark:border-white/10 rounded-xl bg-slate-500/5 dark:bg-white/5 relative"
              style={{
                maxHeight: '580px',
                minHeight: '68px',
              }}
            >
              <table className="w-full text-left text-[10px] sm:text-[10.5px] border-collapse min-w-[500px]">
                <thead className="bg-[#eef3fb] dark:bg-[#1a2d42] sticky top-0 font-bold text-blue-905 dark:text-blue-200 border-b border-slate-200 dark:border-white/10 z-10 transition-colors">
                  <tr>
                    <th className="py-1 px-1 w-11 text-center">학년</th>
                    <th className="py-1 px-1 w-11 text-center">반</th>
                    <th className="py-1 px-1 w-11 text-center">번호</th>
                    <th className="py-1 px-1 w-20">성명</th>
                    <th className="py-1 px-1 w-20">출결 체크</th>
                    <th className="py-1 px-1 w-18">칭찬</th>
                    <th className="py-1 px-1 w-16 text-center">상담일지</th>
                    <th className="py-1 px-1 w-10 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 no-drag">
                  {activeClass?.students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                        학급에 등록된 학생이 없습니다. 우측 상단 ⚙️ 설정을 눌러 엑셀 명부 대장을 업로드하시거나 신규 수동 등록하십시오.
                      </td>
                    </tr>
                  ) : (
                    activeClass?.students.map(st => {
                      const status = getAttendanceForStudent(st.id, selectedAttendDate);
                      const logsCount = counselingLogs.filter(l => l.studentId === st.id).length;
                      const isEditing = editingStudentId === st.id;
                      
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs">
                          {/* inline edit Grade */}
                          <td className="p-1 px-1 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingGrade}
                                onChange={(e) => setEditingGrade(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-10 text-center font-bold bg-white dark:bg-slate-900 border rounded px-1 outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                              />
                            ) : (
                              <span 
                                onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); handleStartEdit(st); }}
                                className="font-bold text-slate-500 cursor-pointer hover:text-indigo-500"
                                title="더블클릭하여 수정"
                              >
                                {st.grade !== undefined ? `${st.grade}` : '-'}
                              </span>
                            )}
                          </td>

                          {/* inline edit Class */}
                          <td className="p-1 px-1 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingClass}
                                onChange={(e) => setEditingClass(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-10 text-center font-bold bg-white dark:bg-slate-900 border rounded px-1 outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                              />
                            ) : (
                              <span 
                                onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); handleStartEdit(st); }}
                                className="font-bold text-slate-500 cursor-pointer hover:text-indigo-500"
                                title="더블클릭하여 수정"
                              >
                                {st.groupClass !== undefined ? `${st.groupClass}` : '-'}
                              </span>
                            )}
                          </td>

                          {/* inline edit Number */}
                          <td className="p-1 px-1 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingNum}
                                onChange={(e) => setEditingNum(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-10 text-center font-bold bg-white dark:bg-slate-900 border rounded px-1 outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                              />
                            ) : (
                              <span 
                                onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); handleStartEdit(st); }}
                                className="font-mono font-bold text-slate-400 cursor-pointer hover:text-indigo-500"
                                title="더블클릭하여 수정"
                              >
                                {st.number}
                              </span>
                            )}
                          </td>

                          {/* inline edit Name */}
                          <td className="p-1 px-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="w-16 font-bold bg-white dark:bg-slate-900 border rounded px-1 text-[10.5px] outline-none border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStudentEdit(st.id); }}
                                />
                                <button
                                  onClick={() => handleSaveStudentEdit(st.id)}
                                  className="cursor-pointer bg-indigo-500 hover:bg-indigo-600 text-white rounded px-1 py-0.5 text-[8.5px] font-bold shrink-0"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteStudent(st.id);
                                  }}
                                  className={`cursor-pointer border rounded-lg px-2 py-0.5 text-[8.5px] font-extrabold shrink-0 shadow-xs transition-all ${deleteStudentConfirmId === st.id ? 'bg-red-550 text-white border-red-500' : 'bg-[#FDEDEC] hover:bg-[#FADBD8] active:bg-[#F5B7B1] text-[#C0392B] border-[#FADBD8] dark:bg-[#3d1a1a] dark:text-[#f1948a] dark:border-[#ec7063] hover:dark:bg-[#4d2222]'}`}
                                >
                                  {deleteStudentConfirmId === st.id ? '진짜삭제' : '삭제'}
                                </button>
                                <button
                                  onClick={() => setEditingStudentId(null)}
                                  className="cursor-pointer bg-[#F4ECF7] hover:bg-[#E8DAEF] active:bg-[#D7BDE2] text-[#7D3C98] border border-[#D7BDE2] rounded-lg px-2 py-0.5 text-[8.5px] font-extrabold shrink-0 shadow-xs transition-all dark:bg-[#281a30]/60 dark:text-[#c39bd3] dark:border-[#8e44ad]/30"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <span 
                                onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); handleStartEdit(st); }}
                                className="font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer hover:underline"
                                title="더블클릭하여 상세 정보 수동 수정 활성화"
                              >
                                {st.name}
                              </span>
                            )}
                          </td>

                          <td className="p-1 px-1 font-sans">
                            <select
                              value={status}
                              onChange={(e) => handleAttendanceChange(st.id, e.target.value as AttendanceStatus)}
                              className={`text-[8.5px] font-extrabold rounded px-1 py-0.5 w-[56px] border outline-none cursor-pointer shadow-xs transition-colors ${
                                status === '출석'
                                  ? 'bg-[#EAFAF1] text-[#1E8449] border-[#A9DFBF] dark:bg-[#1a3826] dark:text-[#52be80] dark:border-[#27ae60]/40'
                                  : status.startsWith('질병')
                                  ? 'bg-[#FEF9E7] text-[#B7950B] border-[#F9E79F] dark:bg-[#34301c] dark:text-[#f7dc6f] dark:border-[#b7950b]/40'
                                  : status.startsWith('인정')
                                  ? 'bg-[#EBF5FB] text-[#1A5276] border-[#AED6F1] dark:bg-[#1a2c3a] dark:text-[#5fa9e6] dark:border-[#2a5573]/40'
                                  : status.startsWith('미인정')
                                  ? 'bg-[#FDEDEC] text-[#C0392B] border-[#FADBD8] dark:bg-[#3d1a1a] dark:text-[#f1948a] dark:border-[#ec7063]/40'
                                  : 'bg-[#F4ECF7] text-[#7D3C98] border-[#D7BDE2] dark:bg-[#2e1d35] dark:text-[#c39bd3] dark:border-[#8e44ad]/40'
                              }`}
                            >
                              {ATTENDANCE_STATUS_LIST.map(stt => (
                                <option key={stt} value={stt} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{stt}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1 px-1">
                            <div className="inline-flex items-center gap-0.5 bg-amber-500/10 border border-amber-300/10 px-1 py-0.5 rounded-md">
                              <Sticker className="w-3 h-3 text-amber-500" />
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono w-3 text-center">{st.stickers}</span>
                              <div className="flex gap-1 select-none text-[8px] font-black font-sans ml-0.5">
                                <button onClick={() => handleStickerChange(st.id, 1)} className="hover:text-amber-500 cursor-pointer hover:scale-125 transition-transform">+</button>
                                <button onClick={() => handleStickerChange(st.id, -1)} className="hover:text-amber-500 cursor-pointer hover:scale-125 transition-transform">-</button>
                              </div>
                            </div>
                          </td>
                          <td className="p-1 px-1 text-center">
                            <button
                              onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditingCounselLogId(st.id); }}
                              className="cursor-pointer p-1.5 rounded-full hover:bg-violet-500/10 text-violet-550 inline-flex items-center justify-center relative active:scale-95 transition-all"
                              title="상담 일지 열기 (더블 클릭!)"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {logsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center scale-75 shadow-sm">
                                  {logsCount}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="p-1 px-1 text-center">
                            <button 
                              onClick={() => handleDeleteStudent(st.id)} 
                              className={`cursor-pointer rounded transition-all flex items-center justify-center mx-auto text-[9.5px] font-bold ${
                                deleteStudentConfirmId === st.id 
                                  ? 'bg-red-550 text-white border border-red-650 px-2 py-0.5 shadow-sm animate-pulse font-sans font-black' 
                                  : 'p-1 text-slate-400 hover:text-red-500 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                              }`}
                              title={deleteStudentConfirmId === st.id ? "한번 더 누르면 삭제됩니다" : "학생 삭제"}
                            >
                              {deleteStudentConfirmId === st.id ? '확인' : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Simple Footer help guideline */}
            <div className="no-drag bg-slate-500/5 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/5 text-[10px] shrink-0">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-350 font-bold justify-center text-center">
                <Info className="w-3.5 h-3.5 text-violet-500 shrink-0 animate-pulse" />
                <span>이름/학번 더블 클릭 ➜ 정보 수정 | 말풍선 더블 클릭 ➜ 상담 일지 기록 | 상세 관리는 우측 상단 ⚙️ 설정</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. INDIVIDUAL STUDENT COUNSELING DIARY OVERLAY MODAL */}
      {editingCounselLogId && (() => {
        const student = activeClass?.students.find(s => s.id === editingCounselLogId);
        if (!student) return null;
        const studentLogs = counselingLogs.filter(l => l.studentId === editingCounselLogId);
        
        return (
          <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-[22px] p-4 flex flex-col justify-between z-45 animate-scale-up border border-slate-205 dark:border-white/10 no-drag text-slate-800 dark:text-slate-100 shadow-2xl">
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                <span className="text-xs font-bold text-violet-600 dark:text-sky-450 flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>[{student.number}번 {student.name}] 상담일지 기록 및 이력 수정</span>
                </span>
                <button 
                  onClick={() => setEditingCounselLogId(null)}
                  className="cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-650" />
                </button>
              </div>

              {/* Sub-panels: Add new entry + History */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                
                {/* 1. Add/Edit New Log Section */}
                <div className="bg-slate-50 dark:bg-neutral-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500">✍️ 새로운 상담 일지 등록</span>
                    <select
                      value={counselTag}
                      onChange={(e) => setCounselTag(e.target.value)}
                      className="text-[9.5px] bg-white dark:bg-black border border-slate-250 rounded px-1.5 py-0.5 font-bold outline-none"
                    >
                      {['진로', '교우관계', '학습태도', '행동지도', '가정환경'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  
                  <textarea
                    value={counselContent}
                    onChange={(e) => setCounselContent(e.target.value)}
                    placeholder="상담 내용을 수기로 작성하십시오... (예: 수학 수업 참여도가 낮아 보조 자료 지원을 논의함...)"
                    className="text-[10px] w-full bg-white dark:bg-black border border-slate-205 dark:border-slate-800 rounded p-1.5 h-16 resize-none outline-none focus:ring-1 focus:ring-apple-blue font-semibold"
                  />
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (!counselContent.trim()) return;
                        const newLog: CounselingLog = {
                          id: `counsel-${Date.now()}`,
                          studentId: student.id,
                          date: getKSTDateString(new Date()),
                          content: counselContent.trim(),
                          tag: counselTag
                        };
                        setCounselingLogs([newLog, ...counselingLogs]);
                        setCounselContent('');
                      }}
                      className="cursor-pointer bg-[#D5F5E3] hover:bg-[#A9DFBF] active:bg-[#7DCEA0] text-[#1E8449] border border-[#A9DFBF] dark:bg-[#1a382ca0] dark:text-[#58d68d] dark:border-[#27ae60]/40 hover:dark:bg-[#228b51] active:dark:bg-[#1e7b45] rounded-lg px-3 py-1 text-[9.5px] font-extrabold shadow-xs transition-all"
                    >
                      상담 일지 추가 등록
                    </button>
                  </div>
                </div>

                {/* 2. Log History Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-450 block">📜 과거 상담 이력 ({studentLogs.length}건)</span>
                  {studentLogs.length === 0 ? (
                    <p className="text-[9.5px] text-slate-400 italic text-center py-5 bg-slate-50 dark:bg-black/20 rounded-lg">과거에 추가 등록된 상담 일지가 보이지 않습니다.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {studentLogs.map(log => (
                        <div key={log.id} className="bg-slate-50 dark:bg-neutral-850 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] relative group">
                          <div className="flex justify-between font-bold text-slate-500 mb-0.5">
                            <span className="text-violet-650 dark:text-sky-400 font-extrabold">[{log.tag}]</span>
                            <span>{log.date}</span>
                          </div>
                          
                          {/* Log content or text edit input */}
                          {editingCounselLogTextId === log.id ? (
                            <div className="space-y-1 mt-1">
                              <textarea
                                value={editingCounselLogText}
                                onChange={(e) => setEditingCounselLogText(e.target.value)}
                                className="w-full bg-white dark:bg-black p-1 border border-slate-250 text-[10px] rounded font-medium"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setCounselingLogs(counselingLogs.map(l => l.id === log.id ? { ...l, content: editingCounselLogText.trim() } : l));
                                    setEditingCounselLogTextId('');
                                    setEditingCounselLogText('');
                                  }}
                                  className="cursor-pointer bg-indigo-600 text-white rounded px-2.5 py-0.5 text-[9px] font-bold"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCounselLogTextId('');
                                    setEditingCounselLogText('');
                                  }}
                                  className="cursor-pointer bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-2 text-[9px]"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-slate-800 dark:text-slate-250 break-words font-semibold pr-12">{log.content}</p>
                              
                              {/* Edit & Delete log actions */}
                              <div className="absolute right-1.5 bottom-1 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingCounselLogTextId(log.id);
                                    setEditingCounselLogText(log.content);
                                  }}
                                  className="text-[9px] text-indigo-650 dark:text-sky-400 hover:underline font-bold"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => {
                                    setCounselingLogs(counselingLogs.filter(l => l.id !== log.id));
                                  }}
                                  className="text-[9px] font-bold text-red-500 hover:text-red-600 hover:underline"
                                >
                                  삭제
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Close / Action footer */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center shrink-0">
                <button
                  onClick={() => {
                    const csv = exportCounselingToCSV(activeClass.students, studentLogs);
                    downloadCSV(csv, `${student.name}_상담기록목록.csv`);
                  }}
                  disabled={studentLogs.length === 0}
                  className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-605 dark:text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-40"
                >
                  <Download className="w-3 h-3" />
                  <span>이 목록 개별 .csv 저장</span>
                </button>
                <button
                  onClick={() => setEditingCounselLogId(null)}
                  className="cursor-pointer bg-apple-blue hover:bg-apple-blue/90 text-white text-[11px] font-bold px-6 py-1.5 rounded-xl text-center"
                >
                  확인 및 완료
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. NEW CLASS ADDITION FORM (FOOTER) */}
      <div className="no-drag border-t border-slate-200/40 dark:border-slate-800/20 pt-1.5 mt-auto flex gap-1.5 shrink-0">
        <input
          type="text"
          placeholder="새 학급명 수동 입력 (예: 5학년 2반)"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          className="flex-1 text-[11px] bg-white/70 dark:bg-black/30 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-apple-blue font-semibold"
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateClass(); }}
        />
        <button
          onClick={handleCreateClass}
          className="cursor-pointer bg-apple-blue hover:bg-apple-blue/90 text-white rounded-lg px-3 py-1 text-[11px] font-bold flex items-center justify-center shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-0.5 shrink-0" />
          <span>반 추가</span>
        </button>
      </div>

      {/* 4. STATISTICS MODAL PANEL (ACCESSED VIA ICON) */}
      {showStatsModal && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 rounded-[22px] p-4 flex flex-col justify-between z-45 animate-scale-up border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-apple-blue" />
                <span>📊 이번 달 ({stats.monthStr}) 통합 학급 통계 요약</span>
              </span>
              <button 
                onClick={() => setShowStatsModal(false)}
                className="cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="space-y-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-450">
              <div className="flex justify-between p-1.5 bg-slate-100/50 dark:bg-white/5 rounded-lg">
                <span>학급 총 인원수</span>
                <span className="text-apple-blue font-bold tracking-tight font-mono">{stats.studentCount} 명</span>
              </div>
              
              <div className="space-y-1 p-2 bg-slate-100/50 dark:bg-white/5 rounded-lg">
                <span className="block border-b text-[10px] pb-0.5 mb-1">📅 출결 현황 ({stats.monthStr})</span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div>
                    <span className="block text-slate-400">출석 횟수</span>
                    <span className="text-emerald-500 font-bold block">{stats.attendanceStats.present} 회</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">결석 횟수</span>
                    <span className="text-red-500 font-bold block">{stats.attendanceStats.absent} 회</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">지각 및 조퇴</span>
                    <span className="text-amber-500 font-bold block">{stats.attendanceStats.others} 회</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between p-1.5 bg-slate-100/50 dark:bg-white/5 rounded-lg">
                <span>누적 발급 칭찬스킨 스티커</span>
                <span className="text-amber-500 font-bold tracking-tight font-mono">{stats.totalStickers} 개</span>
              </div>

              <div className="flex justify-between p-1.5 bg-slate-100/50 dark:bg-white/5 rounded-lg">
                <span>이번 달 등록된 상담기록 일지</span>
                <span className="text-violet-500 font-bold tracking-tight font-mono">{stats.monthlyCounseling} 건</span>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-400 leading-relaxed mt-4">
              ※ 이 통계 대수롭지 않은 데이터들은 100% 로컬 데이터베이스를 수집하여 연산됩니다. 엑셀 다운로드 버튼을 눌려 실시간 기록으로 보존하시길 권합니다.
            </p>
          </div>

          <div className="flex gap-2 border-t pt-3 mt-4">
            <button
              onClick={() => {
                handleExportRoster();
                setShowStatsModal(false);
              }}
              className="cursor-pointer bg-apple-blue hover:bg-apple-blue/90 text-white text-[11px] font-bold py-1.5 rounded-xl flex-1 flex items-center justify-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀 데이터 받기</span>
            </button>
            <button
              onClick={() => setShowStatsModal(false)}
              className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold py-1.5 rounded-xl px-4"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-white/15 px-4 py-2.5 rounded-xl text-xs font-bold z-[100] flex items-center gap-1.5 shadow-2xl animate-scale-up no-drag whitespace-nowrap">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
