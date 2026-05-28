/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Layers, Move, Minimize2, Laptop, CalendarDays, Maximize2, Search, Save, Info, RefreshCw, Eye, EyeOff, Lock, Unlock, HelpCircle, LogOut, Monitor, LayoutGrid,
  Clock, CloudSun, ListTodo, FileText, Utensils, Calendar, Users, Target, Timer, Grid, Briefcase, BarChart2, TrendingUp, GripVertical
} from 'lucide-react';
import { DashboardSettings, WidgetLayout, NeisConfig } from '../types/dashboard';
import { searchSchool } from '../services/neisService';

// Widget icons, names and details map (Request 4-3)
const WIDGET_INFO_MAP: Record<string, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
  'clock': { name: '시계 & 날짜', icon: Clock },
  'weather': { name: '날씨 등교정보', icon: CloudSun },
  'todo': { name: '오늘의 할 일', icon: ListTodo },
  'memo': { name: '포스트잇 노트', icon: FileText },
  'lunch': { name: '오늘의 급식', icon: Utensils },
  'schedule': { name: '월간 학사일정', icon: Calendar },
  'roster': { name: '학생 관리명렬', icon: Users },
  'tools': { name: '수업 보조도구', icon: Target },
  'dday': { name: '시험 디데이', icon: Timer },
  'timetable-class': { name: '학급 시간표', icon: Grid },
  'timetable-teacher': { name: '나의 교사시간표', icon: Briefcase },
  'grade-analysis': { name: '성적 분석', icon: BarChart2 },
  'lesson-progress': { name: '진도 체크', icon: TrendingUp }
};

// Import All Widgets
import ClockWidget from '../widgets/ClockWidget';
import WeatherWidget from '../widgets/WeatherWidget';
import ClassroomToolsWidget from '../widgets/ClassroomToolsWidget';
import TodoWidget from '../widgets/TodoWidget';
import LunchWidget from '../widgets/LunchWidget';
import SchoolScheduleWidget from '../widgets/SchoolScheduleWidget';
import StudentRosterWidget from '../widgets/StudentRosterWidget';
import DDayWidget from '../widgets/DDayWidget';
import MemoWidget from '../widgets/MemoWidget';
import TimetableWidget from '../widgets/TimetableWidget';
import GradeAnalysisWidget from '../widgets/GradeAnalysisWidget';
import LessonProgressWidget from '../widgets/LessonProgressWidget';

// Wallpaper custom style maps
const WALLPAPERS: { [key: string]: string } = {
  'transparent-desktop': 'bg-transparent',
  'clean-minimal': 'bg-gradient-to-br from-[#e0eafc] via-[#ecf2f9] to-[#cfdef3]',
  'cozy-woods': 'bg-gradient-to-tr from-stone-900 via-neutral-850 to-emerald-950',
  'calm-twilight': 'bg-gradient-to-tr from-[#1e1b4b] via-[#311042] to-[#450a0a]',
  'emerald-ocean': 'bg-gradient-to-tr from-[#022c22] via-[#064e3b] to-[#115e59]',
  'school-slate': 'bg-gradient-to-tr from-[#0f172a] via-[#1e293b] to-[#334155]'
};

const WALLPAPER_NAMES: { [key: string]: string } = {
  'transparent-desktop': '바탕화면 투명 위젯 (안드로이드/아이폰 스타일)',
  'clean-minimal': '미니멀 클래식 청은',
  'cozy-woods': '아늑한 숲속초록',
  'calm-twilight': '고요한 노을보라',
  'emerald-ocean': '오션 에메랄드',
  'school-slate': '학교 칠판 차콜'
};

const DEFAULT_WIDGETS: WidgetLayout[] = [
  { id: 'clock', type: 'clock', x: 20, y: 70, w: 260, h: 180, isHidden: false, isFolded: false, size: 'medium' },
  { id: 'weather', type: 'weather', x: 290, y: 70, w: 260, h: 180, isHidden: false, isFolded: false, size: 'medium' },
  { id: 'todo', type: 'todo', x: 560, y: 70, w: 280, h: 280, isHidden: false, isFolded: false, size: 'medium' },
  { id: 'memo', type: 'memo', x: 850, y: 70, w: 320, h: 280, isHidden: false, isFolded: false, size: 'medium' },
  
  { id: 'tools', type: 'tools', x: 20, y: 265, w: 530, h: 285, isHidden: false, isFolded: false, size: 'wide' },
  
  { id: 'lunch', type: 'lunch', x: 560, y: 365, w: 280, h: 285, isHidden: false, isFolded: false, size: 'medium' },
  { id: 'dday', type: 'dday', x: 850, y: 365, w: 320, h: 285, isHidden: false, isFolded: false, size: 'medium' },
  
  { id: 'schedule', type: 'schedule', x: 20, y: 565, w: 530, h: 285, isHidden: false, isFolded: false, size: 'wide' },
  
  { id: 'roster', type: 'roster', x: 20, y: 865, w: 530, h: 360, isHidden: false, isFolded: false, size: 'large' },
  { id: 'timetable-class', type: 'timetable-class', x: 560, y: 665, w: 310, h: 285, isHidden: false, isFolded: false, size: 'medium' },
  { id: 'timetable-teacher', type: 'timetable-teacher', x: 880, y: 665, w: 290, h: 285, isHidden: false, isFolded: false, size: 'medium' },
  { id: 'grade-analysis', type: 'grade-analysis', x: 560, y: 960, w: 610, h: 420, isHidden: false, isFolded: false, size: 'large' },
  { id: 'lesson-progress', type: 'lesson-progress', x: 20, y: 1245, w: 530, h: 320, isHidden: false, isFolded: false, size: 'wide' }
];

interface ActiveSmartGuides {
  vLine: number | null;
  hLine: number | null;
  spacings: Array<{
    dir: 'x' | 'y';
    p1Start: number;
    p1End: number;
    p2Start: number;
    p2End: number;
    yOrX: number;
    gap: number;
  }>;
}

export default function AppShell() {
  // 1. Multi-Display Monitor List & States
  const [displays, setDisplays] = useState<any[]>([]);
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>(() => {
    return localStorage.getItem('teacher_dashboard_display_id') || '';
  });

  const handleDisplayChange = (displayId: string) => {
    setSelectedDisplayId(displayId);
    localStorage.setItem('teacher_dashboard_display_id', displayId);
    
    const isElectron = window.require !== undefined;
    if (isElectron) {
      try {
        const electron = window.require('electron');
        electron.ipcRenderer.send('change-display', displayId);
        
        // 대상 서브모니터로 화면 이동이 완료되는 순간의 해상도 변화를 캐치해 위젯을 화면 안으로 재정렬
        for (let delay of [100, 300, 600, 1000, 1800, 2800]) {
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, delay);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAppQuit = () => {
    const isElectron = window.require !== undefined;
    if (isElectron) {
      const confirmQuit = window.confirm("교실 위젯 대시보드를 완전히 종료하시겠습니까?");
      if (confirmQuit) {
        try {
          const electron = window.require('electron');
          electron.ipcRenderer.send('app-quit');
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      alert("웹 브라우저 프리뷰 모드이므로 정상 종료 명령이 시뮬레이션되었습니다.");
    }
  };

  // Application Modes
  const [useDashboardMode, setUseDashboardMode] = useState(false); // Default false implies Widget Workspace
  const [isMinimizedAll, setIsMinimizedAll] = useState(false);
  const [editPositions, setEditPositions] = useState(true); // Unlock dragging layout by default so teacher can easily setup widgets
  const [isDraggingMinimized, setIsDraggingMinimized] = useState(false); // For ultra smooth dragging bypassing css transitions
  
  // Dashboard Configurations state
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    const saved = localStorage.getItem('teacher_dashboard_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const minimizeMode = (parsed.minimizeMode === 'clock-icon' || parsed.minimizeMode === 'right-sidebar')
          ? parsed.minimizeMode
          : 'clock-icon';
        return {
          ...parsed,
          minimizeMode
        };
      } catch (e) { /* fallback */ }
    }
    return {
      alwaysOnTop: false,
      useDarkTheme: false,
      wallpaper: 'transparent-desktop',
      neisConfig: { apiKey: '', schoolName: '', officeCode: '', schoolCode: '' },
      minimizedStyle: 'swiss-railroad',
      minimizeMode: 'clock-icon'
    };
  });

  // Widgets layout coordinate map
  const [widgets, setWidgets] = useState<WidgetLayout[]>(() => {
    const saved = localStorage.getItem('teacher_dashboard_layouts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetLayout[];
        // Robust safety schema migration:
        // Automatically scan all default widgets, and if any widgets (like grade-analysis or lesson-progress)
        // are missing in the user's existing saved layout, seamlessly restore/append them.
        let updated = [...parsed];
        let hasChanges = false;
        
        DEFAULT_WIDGETS.forEach(defWidget => {
          const exists = updated.some(w => w.id === defWidget.id || w.type === defWidget.type);
          if (!exists) {
            updated.push(defWidget);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          localStorage.setItem('teacher_dashboard_layouts', JSON.stringify(updated));
        }
        return updated;
      } catch (e) { /* fallback */ }
    }
    return DEFAULT_WIDGETS;
  });

  // Backup of widgets layout before minimizing to sidebar
  const [widgetsBackup, setWidgetsBackup] = useState<WidgetLayout[] | null>(() => {
    const saved = localStorage.getItem('teacher_dashboard_widgets_backup');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (widgetsBackup) {
      localStorage.setItem('teacher_dashboard_widgets_backup', JSON.stringify(widgetsBackup));
    } else {
      localStorage.removeItem('teacher_dashboard_widgets_backup');
    }
  }, [widgetsBackup]);

  // Track whether the minimized-to-sidebar mode is active
  const [isSidebarActive, setIsSidebarActive] = useState<boolean>(() => {
    return localStorage.getItem('teacher_dashboard_sidebar_active') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('teacher_dashboard_sidebar_active', String(isSidebarActive));
  }, [isSidebarActive]);

  // Smart alignment guidelines
  const [smartGuides, setSmartGuides] = useState<ActiveSmartGuides>({ vLine: null, hLine: null, spacings: [] });
  const widgetsRef = useRef(widgets);
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  // Active live clock tracking state for widgets and minimized view
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Sync settings and widget layouts
  const realignAllWidgetsToScreen = () => {
    const wWidth = window.innerWidth || 1280;
    const wHeight = window.innerHeight || 800;
    
    setWidgets(prev => {
      let currentX = 30;
      let currentY = 85;
      const margin = 20;
      const titleHeight = 70;
      
      const adjusted = prev.map((widget, idx) => {
        const targetX = currentX;
        const targetY = currentY;
        
        const finalW = Math.min(widget.w, wWidth - 60);
        const finalH = Math.min(widget.h, wHeight - 120);
        
        currentX += finalW + margin;
        
        if (currentX > wWidth - 40) {
          currentX = 30;
          currentY += 210;
        }
        
        const finalY = targetY + finalH > wHeight ? titleHeight + 15 + (idx * 10) : targetY;
        const finalX = targetX + finalW > wWidth ? 30 + (idx * 10) : targetX;
        
        return {
          ...widget,
          x: Math.max(10, Math.min(finalX, wWidth - finalW - 10)),
          y: Math.max(0, Math.min(finalY, wHeight - finalH - 10)),
          w: finalW,
          h: finalH
        };
      });
      return adjusted;
    });
  };

  useEffect(() => {
    localStorage.setItem('teacher_dashboard_settings', JSON.stringify(settings));
    // Apply theme change to HTML class
    if (settings.useDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('teacher_dashboard_layouts', JSON.stringify(widgets));
  }, [widgets]);

  // Electron 최초 마운트 시 저장되어 있던 보조 모니터(디스플레이) 매핑 로딩 및 복원
  useEffect(() => {
    const isElectron = window.require !== undefined;
    if (isElectron) {
      const savedDisplayId = localStorage.getItem('teacher_dashboard_display_id');
      if (savedDisplayId) {
        try {
          const electron = window.require('electron');
          electron.ipcRenderer.send('change-display', savedDisplayId);
          // 모니터 이동 후 스크린 정보 갱신을 위해 지연 resize이벤트 유행
          for (let delay of [400, 800, 1500, 2500, 4000]) {
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, delay);
          }
        } catch (e) {
          console.error('Initial display switch failed:', e);
        }
      }
    }
  }, []);

  // 자동 위젯 화면 영역 이탈 방지 조율기 (서브 모니터 / 작은 모니터 이동 대응)
  useEffect(() => {
    const clampWidgetsToViewport = () => {
      const wWidth = window.innerWidth;
      const wHeight = window.innerHeight;
      
      // [중요 안전가드]: 일렉트론 초기화 메인프레임 로드 시, 브라우저 해상도가 임시로 0~300px 크기로 할당되는 순간이 존재합니다.
      // 이 불안정한 순간에 좌표 정렬을 수정하면 위젯 크기가 100px 미만으로 강제 수축/소멸되어 영구 훼손되므로, 정밀 모니터 스카우팅 크기 가드를 적용합니다.
      if (!wWidth || !wHeight || wWidth < 500 || wHeight < 400) return;

      setWidgets(prev => {
        let changed = false;
        
        const adjusted = prev.map(widget => {
          // 가이드 5장: 최소 안전 여백(Padding) 제공 및 타이틀 바 영역 침해 방지 (상단 오프셋은 헤더 h-11=44px 고려해 54px 지정)
          const leftBound = 10;
          const topBound = 0; 
          const rightMargin = 10;
          const bottomMargin = 10;

          // 모니터 해상도 대비 너무 넓거나 높은 위젯 크기 자동 축소 (최소 150x100px 유지)
          const maxW = Math.max(150, wWidth - leftBound - rightMargin);
          const maxH = Math.max(100, wHeight - topBound - bottomMargin);
          
          let newW = widget.w;
          let newH = widget.h;
          
          if (widget.w > maxW) {
            newW = maxW;
            changed = true;
          }
          if (widget.h > maxH) {
            newH = maxH;
            changed = true;
          }

          // 가이드 3장: 경계 보정 공식 대입
          // X_adjusted = max(Left_monitor, min(X_current, Right_monitor - Width_widget))
          // Y_adjusted = max(Top_monitor, min(Y_current, Bottom_monitor - Height_widget))
          const maxX = Math.max(leftBound, wWidth - newW - rightMargin);
          const maxY = Math.max(topBound, wHeight - newH - bottomMargin);

          let newX = widget.x;
          let newY = widget.y;

          if (widget.x < leftBound) {
            newX = leftBound;
            changed = true;
          } else if (widget.x > maxX) {
            newX = maxX;
            changed = true;
          }

          if (widget.y < topBound) {
            newY = topBound;
            changed = true;
          } else if (widget.y > maxY) {
            newY = maxY;
            changed = true;
          }

          if (newX !== widget.x || newY !== widget.y || newW !== widget.w || newH !== widget.h) {
            changed = true;
            return { ...widget, x: newX, y: newY, w: newW, h: newH };
          }
          return widget;
        });

        return changed ? adjusted : prev;
      });

      // 최소화 오버레이 시계 위젯 포지션 자동 조율 (어떠한 모니터 화면 비율에서도 이탈 금지)
      setMinimizedConfig(prev => {
        const sizeWithMargin = prev.size || 192;
        const maxX = Math.max(0, wWidth - sizeWithMargin);
        const maxY = Math.max(0, wHeight - sizeWithMargin);
        let changed = false;
        let newX = prev.x;
        let newY = prev.y;

        if (prev.x < 0) {
          newX = 0;
          changed = true;
        } else if (prev.x > maxX) {
          newX = maxX;
          changed = true;
        }

        if (prev.y < 0) {
          newY = 0;
          changed = true;
        } else if (prev.y > maxY) {
          newY = maxY;
          changed = true;
        }

        if (changed) {
          return { ...prev, x: newX, y: newY };
        }
        return prev;
      });
    };

    window.addEventListener('resize', clampWidgetsToViewport);
    
    // 디스플레이 리스트(보조모니터 상태) 변경 대응을 위해 displays 의존적 감시 지속
    // 이탈방지 자가 복구 실시간 순환 타이머 (1.2초 주기 신속 모니터링 데몬)
    const watchdogTimer = setInterval(clampWidgetsToViewport, 1200);

    // 컴포넌트 마운트 및 레이아웃 갱신 직후 지연 순차 자가치유 트리거링 실행보장
    clampWidgetsToViewport();
    const subTimer1 = setTimeout(clampWidgetsToViewport, 200);
    const subTimer2 = setTimeout(clampWidgetsToViewport, 600);
    const subTimer3 = setTimeout(clampWidgetsToViewport, 1500);
    const subTimer4 = setTimeout(clampWidgetsToViewport, 3000);

    return () => {
      window.removeEventListener('resize', clampWidgetsToViewport);
      clearInterval(watchdogTimer);
      clearTimeout(subTimer1);
      clearTimeout(subTimer2);
      clearTimeout(subTimer3);
      clearTimeout(subTimer4);
    };
  }, [widgets, displays]);

  // Modal Controllers
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWidgetToggleDrawer, setShowWidgetToggleDrawer] = useState(false);

  // Monitor Display configuration requester
  useEffect(() => {
    const isElectron = window.require !== undefined;
    if (isElectron) {
      try {
        const electron = window.require('electron');
        const handleResponse = (event: any, data: any) => {
          setDisplays(data);
          const savedId = localStorage.getItem('teacher_dashboard_display_id');
          if (savedId) {
            setSelectedDisplayId(savedId);
          } else {
            const activeDisplay = data.find((d: any) => d.isPrimary);
            if (activeDisplay) {
              setSelectedDisplayId(String(activeDisplay.id));
            }
          }
        };

        electron.ipcRenderer.on('get-displays-response', handleResponse);
        electron.ipcRenderer.send('get-displays');

        return () => {
          electron.ipcRenderer.removeListener('get-displays-response', handleResponse);
        };
      } catch (err) {
        console.error(err);
      }
    }
  }, [showSettingsModal]);

  // Minimized simple floating clock position and scale controller
  const [minimizedConfig, setMinimizedConfig] = useState(() => {
    const saved = localStorage.getItem('school_minimized_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return { x: window.innerWidth / 2 - 96, y: window.innerHeight / 2 - 96, size: 192 };
  });

  useEffect(() => {
    localStorage.setItem('school_minimized_config', JSON.stringify(minimizedConfig));
  }, [minimizedConfig]);

  const minimizedConfigRef = useRef(minimizedConfig);
  useEffect(() => {
    minimizedConfigRef.current = minimizedConfig;
  }, [minimizedConfig]);

  // Sidebar Position and dragging states
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    try {
      const saved = localStorage.getItem('teacher_dashboard_sidebar_pos');
      return (saved === 'left' || saved === 'right') ? saved : 'right';
    } catch (e) {
      return 'right';
    }
  });

  const sidebarDragRef = useRef<{ isDragging: boolean; startX: number }>({ isDragging: false, startX: 0 });

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    sidebarDragRef.current = { isDragging: true, startX: e.clientX };
    document.addEventListener('mousemove', handleSidebarMouseMove);
    document.addEventListener('mouseup', handleSidebarMouseUp);
  };

  const handleSidebarMouseMove = (e: MouseEvent) => {
    if (!sidebarDragRef.current.isDragging) return;
    const halfScreen = window.innerWidth / 2;
    const newPos = e.clientX < halfScreen ? 'left' : 'right';
    setSidebarPosition(newPos);
    try {
      localStorage.setItem('teacher_dashboard_sidebar_pos', newPos);
    } catch (err) {
      console.error('Failed to save sidebar position', err);
    }
  };

  const handleSidebarMouseUp = () => {
    sidebarDragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleSidebarMouseMove);
    document.removeEventListener('mouseup', handleSidebarMouseUp);
  };

  // Switch isMinimizedAll to false and minimize widgets natively if sidebar mode is chosen
  useEffect(() => {
    if (settings.minimizeMode === 'right-sidebar' && isMinimizedAll) {
      setIsMinimizedAll(false);
      setWidgets(prev => {
        setWidgetsBackup(prev);
        return prev.map(w => ({ ...w, isHidden: true }));
      });
      setIsSidebarActive(true);
    }
  }, [settings.minimizeMode, isMinimizedAll]);

  // Prevent sidebar minimized transition state interference
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleSidebarMouseMove);
      document.removeEventListener('mouseup', handleSidebarMouseUp);
    };
  }, []);

  // NEIS school Lookup UI Helpers
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSchoolSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const rows = await searchSchool(searchQuery.trim(), settings.neisConfig.apiKey);
      setSearchResults(rows);
    } catch (e) {
      alert('NEIS 검색 도중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSchool = (row: any) => {
    setSettings(prev => ({
      ...prev,
      neisConfig: {
        ...prev.neisConfig,
        schoolName: row.schoolName,
        officeCode: row.officeCode,
        schoolCode: row.schoolCode
      }
    }));
    setSearchResults([]);
    setSearchQuery('');
    alert(`[${row.schoolName}] 등록 완료! 이제 급식과 일정이 실시간 연동됩니다.`);
  };

  const handleToggleWidgetVisible = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, isHidden: !w.isHidden } : w));
  };

  // Dragging mechanisms
  const dragContext = useRef<{ widgetId: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleWidgetMouseDown = (e: React.MouseEvent, wId: string) => {
    const targetWidget = widgets.find(w => w.id === wId);
    if (!targetWidget) return;

    // Check if target is interactive buttons, dropdowns, forms
    const element = e.target as HTMLElement;
    if (element.closest('.no-drag') || element.closest('button') || element.closest('select') || element.closest('input') || element.closest('textarea')) {
      return;
    }

    e.preventDefault();
    document.body.classList.add('widget-interacting');
    dragContext.current = {
      widgetId: wId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: targetWidget.x,
      initialY: targetWidget.y
    };

    document.addEventListener('mousemove', handleWidgetMouseMove);
    document.addEventListener('mouseup', handleWidgetMouseUp);
  };

  const handleWidgetMouseMove = (e: MouseEvent) => {
    if (!dragContext.current) return;
    const { widgetId, startX, startY, initialX, initialY } = dragContext.current;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const currentWidget = widgetsRef.current.find(w => w.id === widgetId);
    if (!currentWidget) return;

    const targetX = initialX + deltaX;
    const targetY = initialY + deltaY;

    // Boundary configuration for viewport limits
    const leftBound = 10;
    const topBound = 0;
    const rightMargin = 10;
    const bottomMargin = 10;
    
    const maxX = Math.max(leftBound, window.innerWidth - currentWidget.w - rightMargin);
    const maxY = Math.max(topBound, window.innerHeight - currentWidget.h - bottomMargin);

    const rawClampedX = Math.max(leftBound, Math.min(targetX, maxX));
    const rawClampedY = Math.max(topBound, Math.min(targetY, maxY));

    // Smart Guidelines Calculation
    const others = widgetsRef.current.filter(other => !other.isHidden && other.id !== widgetId);
    const SNAP_THRESHOLD = 8;

    let snappedX = rawClampedX;
    let snappedY = rawClampedY;
    let vLine: number | null = null;
    let hLine: number | null = null;
    const spacings: ActiveSmartGuides['spacings'] = [];

    if (!e.altKey) {
      // 1. Horizontal Snapping (vLine)
      let bestDiffX = Infinity;
      let bestRefX = 0;
      let bestActTypeX: 'L' | 'CX' | 'R' = 'L';

      const actCoordsX = [
        { val: rawClampedX, type: 'L' as const },
        { val: rawClampedX + currentWidget.w / 2, type: 'CX' as const },
        { val: rawClampedX + currentWidget.w, type: 'R' as const }
      ];

      for (const other of others) {
        const refCoords = [other.x, other.x + other.w / 2, other.x + other.w];
        for (const act of actCoordsX) {
          for (const refVal of refCoords) {
            const diff = Math.abs(act.val - refVal);
            if (diff < SNAP_THRESHOLD && diff < bestDiffX) {
              bestDiffX = diff;
              bestRefX = refVal;
              bestActTypeX = act.type;
            }
          }
        }
      }

      if (bestDiffX <= SNAP_THRESHOLD) {
        vLine = bestRefX;
        if (bestActTypeX === 'L') {
          snappedX = bestRefX;
        } else if (bestActTypeX === 'CX') {
          snappedX = bestRefX - currentWidget.w / 2;
        } else if (bestActTypeX === 'R') {
          snappedX = bestRefX - currentWidget.w;
        }
        snappedX = Math.max(leftBound, Math.min(snappedX, maxX));
      }

      // 2. Vertical Snapping (hLine)
      let bestDiffY = Infinity;
      let bestRefY = 0;
      let bestActTypeY: 'T' | 'CY' | 'B' = 'T';

      const actCoordsY = [
        { val: rawClampedY, type: 'T' as const },
        { val: rawClampedY + currentWidget.h / 2, type: 'CY' as const },
        { val: rawClampedY + currentWidget.h, type: 'B' as const }
      ];

      for (const other of others) {
        const refCoords = [other.y, other.y + other.h / 2, other.y + other.h];
        for (const act of actCoordsY) {
          for (const refVal of refCoords) {
            const diff = Math.abs(act.val - refVal);
            if (diff < SNAP_THRESHOLD && diff < bestDiffY) {
              bestDiffY = diff;
              bestRefY = refVal;
              bestActTypeY = act.type;
            }
          }
        }
      }

      if (bestDiffY <= SNAP_THRESHOLD) {
        hLine = bestRefY;
        if (bestActTypeY === 'T') {
          snappedY = bestRefY;
        } else if (bestActTypeY === 'CY') {
          snappedY = bestRefY - currentWidget.h / 2;
        } else if (bestActTypeY === 'B') {
          snappedY = bestRefY - currentWidget.h;
        }
        snappedY = Math.max(topBound, Math.min(snappedY, maxY));
      }

      // 3. Horizontal Equal Spacing Finder
      if (others.length >= 2) {
        let horizontalSpacingSnapped = false;
        for (let i = 0; i < others.length; i++) {
          for (let j = 0; j < others.length; j++) {
            if (i === j) continue;
            const w1 = others[i];
            const w2 = others[j];

            if (w1.x + w1.w <= w2.x) {
              const gap12 = w2.x - (w1.x + w1.w);
              if (gap12 > 10) {
                // Scenario A: Dragged C right of W2
                const expectedL_A = w2.x + w2.w + gap12;
                if (Math.abs(snappedX - expectedL_A) < SNAP_THRESHOLD) {
                  snappedX = Math.max(leftBound, Math.min(expectedL_A, maxX));
                  spacings.push({
                    dir: 'x',
                    p1Start: w1.x + w1.w,
                    p1End: w2.x,
                    p2Start: w2.x + w2.w,
                    p2End: snappedX,
                    yOrX: Math.min(w1.y, w2.y, currentWidget.y) + 20,
                    gap: gap12
                  });
                  horizontalSpacingSnapped = true;
                  break;
                }

                // Scenario B: Dragged C left of W1
                const expectedL_B = w1.x - gap12 - currentWidget.w;
                if (Math.abs(snappedX - expectedL_B) < SNAP_THRESHOLD) {
                  snappedX = Math.max(leftBound, Math.min(expectedL_B, maxX));
                  spacings.push({
                    dir: 'x',
                    p1Start: snappedX + currentWidget.w,
                    p1End: w1.x,
                    p2Start: w1.x + w1.w,
                    p2End: w2.x,
                    yOrX: Math.min(w1.y, w2.y, currentWidget.y) + 20,
                    gap: gap12
                  });
                  horizontalSpacingSnapped = true;
                  break;
                }

                // Scenario C: Dragged C inside / between
                const expectedL_C = (w1.x + w1.w + w2.x - currentWidget.w) / 2;
                if (Math.abs(snappedX - expectedL_C) < SNAP_THRESHOLD) {
                  snappedX = Math.max(leftBound, Math.min(expectedL_C, maxX));
                  const finalGap = Math.round(snappedX - (w1.x + w1.w));
                  spacings.push({
                    dir: 'x',
                    p1Start: w1.x + w1.w,
                    p1End: snappedX,
                    p2Start: snappedX + currentWidget.w,
                    p2End: w2.x,
                    yOrX: Math.min(w1.y, w2.y, currentWidget.y) + 20,
                    gap: finalGap
                  });
                  horizontalSpacingSnapped = true;
                  break;
                }
              }
            }
          }
          if (horizontalSpacingSnapped) break;
        }

        // 4. Vertical Equal Spacing Finder
        let verticalSpacingSnapped = false;
        for (let i = 0; i < others.length; i++) {
          for (let j = 0; j < others.length; j++) {
            if (i === j) continue;
            const w1 = others[i];
            const w2 = others[j];

            if (w1.y + w1.h <= w2.y) {
              const gap12 = w2.y - (w1.y + w1.h);
              if (gap12 > 10) {
                // Scenario A: Dragged C below W2
                const expectedT_A = w2.y + w2.h + gap12;
                if (Math.abs(snappedY - expectedT_A) < SNAP_THRESHOLD) {
                  snappedY = Math.max(topBound, Math.min(expectedT_A, maxY));
                  spacings.push({
                    dir: 'y',
                    p1Start: w1.y + w1.h,
                    p1End: w2.y,
                    p2Start: w2.y + w2.h,
                    p2End: snappedY,
                    yOrX: Math.min(w1.x, w2.x, currentWidget.x) + 20,
                    gap: gap12
                  });
                  verticalSpacingSnapped = true;
                  break;
                }

                // Scenario B: Dragged C above W1
                const expectedT_B = w1.y - gap12 - currentWidget.h;
                if (Math.abs(snappedY - expectedT_B) < SNAP_THRESHOLD) {
                  snappedY = Math.max(topBound, Math.min(expectedT_B, maxY));
                  spacings.push({
                    dir: 'y',
                    p1Start: snappedY + currentWidget.h,
                    p1End: w1.y,
                    p2Start: w1.y + w1.h,
                    p2End: w2.y,
                    yOrX: Math.min(w1.x, w2.x, currentWidget.x) + 20,
                    gap: gap12
                  });
                  verticalSpacingSnapped = true;
                  break;
                }

                // Scenario C: Dragged C inside / between
                const expectedT_C = (w1.y + w1.h + w2.y - currentWidget.h) / 2;
                if (Math.abs(snappedY - expectedT_C) < SNAP_THRESHOLD) {
                  snappedY = Math.max(topBound, Math.min(expectedT_C, maxY));
                  const finalGap = Math.round(snappedY - (w1.y + w1.h));
                  spacings.push({
                    dir: 'y',
                    p1Start: w1.y + w1.h,
                    p1End: snappedY,
                    p2Start: snappedY + currentWidget.h,
                    p2End: w2.y,
                    yOrX: Math.min(w1.x, w2.x, currentWidget.x) + 20,
                    gap: finalGap
                  });
                  verticalSpacingSnapped = true;
                  break;
                }
              }
            }
          }
          if (verticalSpacingSnapped) break;
        }
      }
    }

    setSmartGuides({ vLine, hLine, spacings });

    setWidgets(prev => prev.map(w => {
      if (w.id === widgetId) {
        return {
          ...w,
          x: snappedX,
          y: snappedY
        };
      }
      return w;
    }));
  };

  const handleWidgetMouseUp = () => {
    dragContext.current = null;
    document.body.classList.remove('widget-interacting');
    setSmartGuides({ vLine: null, hLine: null, spacings: [] });
    document.removeEventListener('mousemove', handleWidgetMouseMove);
    document.removeEventListener('mouseup', handleWidgetMouseUp);
  };

  // Resizing mechanisms
  const resizeContext = useRef<{ widgetId: string; startX: number; startY: number; initialW: number; initialH: number } | null>(null);

  const handleWidgetResizeMouseDown = (e: React.MouseEvent, wId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const targetWidget = widgets.find(w => w.id === wId);
    if (!targetWidget) return;

    document.body.classList.add('widget-interacting');
    resizeContext.current = {
      widgetId: wId,
      startX: e.clientX,
      startY: e.clientY,
      initialW: targetWidget.w,
      initialH: targetWidget.h
    };

    document.addEventListener('mousemove', handleWidgetResizeMouseMove);
    document.addEventListener('mouseup', handleWidgetResizeMouseUp);
  };

  const handleWidgetResizeMouseMove = (e: MouseEvent) => {
    if (!resizeContext.current) return;
    const { widgetId, startX, startY, initialW, initialH } = resizeContext.current;
 
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
 
    const currentWidget = widgetsRef.current.find(w => w.id === widgetId);
    if (!currentWidget) return;
 
    const leftBound = 10;
    const topBound = 0;
    const rightMargin = 10;
    const bottomMargin = 10;
 
    const maxW = Math.max(150, window.innerWidth - currentWidget.x - rightMargin);
    const maxH = Math.max(100, window.innerHeight - currentWidget.y - bottomMargin);
 
    const rawTargetW = Math.max(150, Math.min(initialW + deltaX, maxW));
    const rawTargetH = Math.max(100, Math.min(initialH + deltaY, maxH));
 
    // Smart Guidelines Calculation during Resizing
    const others = widgetsRef.current.filter(other => !other.isHidden && other.id !== widgetId);
    const SNAP_THRESHOLD = 8;
 
    let snappedW = rawTargetW;
    let snappedH = rawTargetH;
    let vLine: number | null = null;
    let hLine: number | null = null;
    const spacings: ActiveSmartGuides['spacings'] = [];
 
    if (!e.altKey) {
      // For resizing, align Bottom and Right edges with Left, Center, Right of other widgets
      // Right edge check: currentWidget.x + rawTargetW
      let bestDiffX = Infinity;
      let bestRefX = 0;
      const actR = currentWidget.x + rawTargetW;
 
      for (const other of others) {
        const refCoords = [other.x, other.x + other.w / 2, other.x + other.w];
        for (const refVal of refCoords) {
          const diff = Math.abs(actR - refVal);
          if (diff < SNAP_THRESHOLD && diff < bestDiffX) {
            bestDiffX = diff;
            bestRefX = refVal;
          }
        }
      }
 
      if (bestDiffX <= SNAP_THRESHOLD) {
        vLine = bestRefX;
        snappedW = Math.max(150, Math.min(bestRefX - currentWidget.x, maxW));
      }
 
      // Bottom edge check: currentWidget.y + rawTargetH
      let bestDiffY = Infinity;
      let bestRefY = 0;
      const actB = currentWidget.y + rawTargetH;
 
      for (const other of others) {
        const refCoords = [other.y, other.y + other.h / 2, other.y + other.h];
        for (const refVal of refCoords) {
          const diff = Math.abs(actB - refVal);
          if (diff < SNAP_THRESHOLD && diff < bestDiffY) {
            bestDiffY = diff;
            bestRefY = refVal;
          }
        }
      }
 
      if (bestDiffY <= SNAP_THRESHOLD) {
        hLine = bestRefY;
        snappedH = Math.max(100, Math.min(bestRefY - currentWidget.y, maxH));
      }
    }
 
    setSmartGuides({ vLine, hLine, spacings });
 
    setWidgets(prev => prev.map(w => {
      if (w.id === widgetId) {
        return {
          ...w,
          w: snappedW,
          h: snappedH
        };
      }
      return w;
    }));
  };
 
  const handleWidgetResizeMouseUp = () => {
    resizeContext.current = null;
    document.body.classList.remove('widget-interacting');
    setSmartGuides({ vLine: null, hLine: null, spacings: [] });
    document.removeEventListener('mousemove', handleWidgetResizeMouseMove);
    document.removeEventListener('mouseup', handleWidgetResizeMouseUp);
  };

  // Minimized clock dragging mechanisms
  const minimizedDragContext = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleMinimizedMouseDown = (e: React.MouseEvent) => {
    const element = e.target as HTMLElement;
    if (element.closest('button')) return;

    e.preventDefault();
    document.body.classList.add('widget-interacting');
    setIsDraggingMinimized(true); // Disable transition during drag
    minimizedDragContext.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: minimizedConfigRef.current.x,
      initialY: minimizedConfigRef.current.y
    };

    document.addEventListener('mousemove', handleMinimizedMouseMove);
    document.addEventListener('mouseup', handleMinimizedMouseUp);
  };

  const handleMinimizedMouseMove = (e: MouseEvent) => {
    if (!minimizedDragContext.current) return;
    const { startX, startY, initialX, initialY } = minimizedDragContext.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    setMinimizedConfig(prev => {
      const widgetSize = prev.size || 192;
      const widgetW = Math.max(260, widgetSize * 1.85);
      const widgetH = Math.max(130, widgetSize);
      const maxX = Math.max(0, window.innerWidth - widgetW);
      const maxY = Math.max(0, window.innerHeight - widgetH);
      return {
        ...prev,
        x: Math.max(0, Math.min(initialX + deltaX, maxX)),
        y: Math.max(0, Math.min(initialY + deltaY, maxY))
      };
    });
  };

  const handleMinimizedMouseUp = () => {
    minimizedDragContext.current = null;
    document.body.classList.remove('widget-interacting');
    setIsDraggingMinimized(false); // Enable transition back on release
    document.removeEventListener('mousemove', handleMinimizedMouseMove);
    document.removeEventListener('mouseup', handleMinimizedMouseUp);
  };

  // Minimized clock resizing mechanisms
  const minimizedResizeContext = useRef<{ startX: number; startY: number; initialSize: number } | null>(null);

  const handleMinimizedResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    document.body.classList.add('widget-interacting');
    minimizedResizeContext.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialSize: minimizedConfigRef.current.size
    };

    document.addEventListener('mousemove', handleMinimizedResizeMouseMove);
    document.addEventListener('mouseup', handleMinimizedResizeMouseUp);
  };

  const handleMinimizedResizeMouseMove = (e: MouseEvent) => {
    if (!minimizedResizeContext.current) return;
    const { startX, startY, initialSize } = minimizedResizeContext.current;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const delta = Math.max(deltaX, deltaY);

    setMinimizedConfig(prev => ({
      ...prev,
      size: Math.max(120, Math.min(450, initialSize + delta))
    }));
  };

  const handleMinimizedResizeMouseUp = () => {
    minimizedResizeContext.current = null;
    document.body.classList.remove('widget-interacting');
    document.removeEventListener('mousemove', handleMinimizedResizeMouseMove);
    document.removeEventListener('mouseup', handleMinimizedResizeMouseUp);
  };

  const resetWidgetPositions = () => {
    setWidgets(DEFAULT_WIDGETS);
  };

  const handleMasterReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const renderWidgetContent = (type: string, w: number, h: number) => {
    switch (type) {
      case 'clock': return <ClockWidget size="medium" width={w} height={h} />;
      case 'weather': return <WeatherWidget size="medium" width={w} height={h} />;
      case 'todo': return <TodoWidget size="medium" width={w} height={h} />;
      case 'memo': return <MemoWidget size="medium" width={w} height={h} />;
      case 'lunch': return <LunchWidget neisConfig={settings.neisConfig} size="medium" width={w} height={h} />;
      case 'schedule': return <SchoolScheduleWidget neisConfig={settings.neisConfig} size="wide" width={w} height={h} />;
      case 'dday': return <DDayWidget size="medium" width={w} height={h} />;
      case 'roster': return <StudentRosterWidget size="large" width={w} height={h} />;
      case 'tools': return <ClassroomToolsWidget size="wide" width={w} height={h} />;
      case 'timetable-class': return <TimetableWidget type="class" size="medium" width={w} height={h} />;
      case 'timetable-teacher': return <TimetableWidget type="teacher" size="medium" width={w} height={h} />;
      case 'grade-analysis': return <GradeAnalysisWidget size="large" width={w} height={h} />;
      case 'lesson-progress': return <LessonProgressWidget size="wide" width={w} height={h} />;
      default: return null;
    }
  };

  return (
    <div id="app-shell-main" className={`relative min-h-screen w-full select-none overflow-x-hidden ${WALLPAPERS[settings.wallpaper] || WALLPAPERS['school-slate']} transition-all duration-700`}>
      
      {/* 1. MINIMIZED FLOATING DRAGGABLE & RESIZABLE SMART IOS WIDGET */}
      {isMinimizedAll ? (() => {
        const secondsInstance = currentTime.getSeconds();
        const minutesInstance = currentTime.getMinutes();
        const hoursInstance = currentTime.getHours();

        const secAngle = secondsInstance * 6;
        const minAngle = (minutesInstance + secondsInstance / 60) * 6;
        const hourAngle = ((hoursInstance % 12) + minutesInstance / 60) * 30;

        // Date strings
        const textDayOfWeek = currentTime.toLocaleDateString('ko-KR', { weekday: 'long' });
        const textDay = currentTime.getDate();

        // Safe widget size ratios
        const widgetW = Math.max(260, minimizedConfig.size * 1.85);
        const widgetH = Math.max(130, minimizedConfig.size);

        return (
          <div 
            style={{
              position: 'fixed',
              left: `${minimizedConfig.x}px`,
              top: `${minimizedConfig.y}px`,
              width: `${widgetW}px`,
              height: `${widgetH}px`,
              zIndex: 9999,
            }}
            onMouseDown={handleMinimizedMouseDown}
            onDragStart={(e) => e.preventDefault()}
            onDoubleClick={() => setIsMinimizedAll(false)}
            className={`glass-effect drag-handle ${
              settings.minimizedStyle === 'clean-calendar'
                ? 'bg-emerald-100/90 dark:bg-[#064e40]/90 text-emerald-900 dark:text-emerald-50 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-100/90 dark:bg-slate-900/90 text-rose-900 dark:text-rose-50 border-rose-300 dark:border-slate-800'
            } select-none p-4.5 rounded-[32px] sm:rounded-[38px] flex items-center justify-between border shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.65)] hover:border-apple-blue/30 cursor-move relative overflow-hidden animate-scale-up ${
              isDraggingMinimized ? 'transition-none' : 'transition-[background-color,border-color,box-shadow,transform] duration-300'
            }`}
            title="드래그 이동 | 더블클릭 시 전체 교실 화면 복원"
          >
            {/* Top Apple-Style Traffic Lights (Red: Quit App, Orange: Restore, Green: Restore) */}
            <div className="absolute top-3 left-4.5 flex items-center gap-1.5 no-drag z-50">
              <button 
                onClick={(e) => { e.stopPropagation(); handleAppQuit(); }}
                className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff3b30] border border-[#e0443e] cursor-pointer transition-colors"
                title="프로그램 완전히 종료"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMinimizedAll(false); }}
                className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffcc00] border border-[#df9d24] cursor-pointer transition-colors"
                title="바탕화면 복원"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMinimizedAll(false); }}
                className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#34c759] border border-[#1aab29] cursor-pointer transition-colors"
                title="바탕화면 복원"
              />
            </div>

            {/* Apple style Widget Label right upper corner */}
            <div className="absolute top-3.5 right-4.5 text-[8.5px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{settings.minimizedStyle === 'clean-calendar' ? 'Smart LED Desk Clock' : 'Swiss Clock Widget'}</span>
            </div>

            <div className="flex items-center justify-between w-full h-full pt-4.5">
              {settings.minimizedStyle === 'clean-calendar' ? (
                /* STYLE B: THE PREMIUM CYBER CYAN SMART DESK CLOCK WIDGET */
                <div 
                  onMouseDown={handleMinimizedMouseDown}
                  onDragStart={(e) => e.preventDefault()}
                  className="absolute inset-0 bg-emerald-50 dark:bg-[#022c22] flex flex-col justify-between p-3.5 sm:p-5 text-emerald-800 dark:text-[#34d399] z-10 select-none font-sans overflow-hidden cursor-move"
                >
                  {/* Glass reflective shine diagonal sweep layer */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none z-10" />
                  
                  {/* Top section: Month Day, Year (Neon Blue/Turquoise glow) */}
                  <div className="text-center mt-2 z-20 shrink-0">
                    <span className="font-sans font-black tracking-widest text-[12.5px] sm:text-[15px] drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] uppercase">
                      {currentTime.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(',', '')}
                    </span>
                  </div>

                  {/* Middle section: Enormous glowing LED segments / Digital print style */}
                  <div className="flex items-center justify-center my-1 z-20">
                    <span className="font-sans font-black tracking-tight leading-none text-[46px] sm:text-[58px] drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]">
                      {currentTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </span>
                    <span className="text-[12px] sm:text-[14px] font-bold ml-1.5 self-end pb-1 sm:pb-1.5 opacity-90 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)] font-mono">
                      {currentTime.getSeconds().toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Bottom section: Day of the Week (THU style) & Sun Cloud weather with Celsius */}
                  <div className="flex items-center justify-between w-full px-1.5 sm:px-3 mb-1.5 z-20 shrink-0">
                    {/* Weekday abbreviation (TUE, THU etc) */}
                    <span className="font-extrabold tracking-widest text-[14px] sm:text-[17px] drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] uppercase">
                      {currentTime.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>

                    {/* Cute sun and cloud assembly matching attached image clock */}
                    <div className="flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                      <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                        {/* Golden sun glowing */}
                        <div className="absolute top-0.5 right-0.5 w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-full bg-[#ffcc00] drop-shadow-[0_0_5px_#ffcc00]" />
                        {/* Soft white cloud overlaid in front */}
                        <svg viewBox="0 0 24 24" className="absolute bottom-0 left-0 w-4 h-4 sm:w-5 sm:h-5 text-slate-100 dark:text-white fill-current" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.5))">
                          <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.64-4.96z" />
                        </svg>
                      </div>
                      <span className="font-extrabold text-[12.5px] sm:text-[15.5px]">24°C</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* STYLE A: SWISS RAILROAD PREMIUM ANALOG CLOCK DESIGN */
                <>
                  {/* Left Column: Swiss Railroad Premium Analog Clock Widget */}
                  <div 
                    className="flex items-center justify-center relative shrink-0"
                    style={{ 
                      width: `${widgetH * 0.72}px`, 
                      height: `${widgetH * 0.72}px` 
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white border border-slate-200 shadow-inner flex items-center justify-center relative overflow-hidden">
                      <svg 
                        viewBox="0 0 100 100" 
                        className="w-[90%] h-[90%] select-none pointer-events-none"
                      >
                        {/* Hour markings */}
                        {Array.from({ length: 12 }).map((_, i) => (
                          <line
                            key={i}
                            x1="50"
                            y1="7"
                            x2="50"
                            y2="14"
                            stroke={i % 3 === 0 ? "#1c1c1e" : "#8e8e93"}
                            strokeWidth={i % 3 === 0 ? "3.5" : "2"}
                            strokeLinecap="round"
                            transform={`rotate(${i * 30} 50 50)`}
                          />
                        ))}

                        {/* Clock Hands with Smooth Rotation */}
                        {/* Hours Hand */}
                        <line
                          x1="50"
                          y1="50"
                          x2="50"
                          y2="28"
                          stroke="#1c1c1e"
                          strokeWidth="5"
                          strokeLinecap="round"
                          transform={`rotate(${hourAngle} 50 50)`}
                        />

                        {/* Minutes Hand */}
                        <line
                          x1="50"
                          y1="50"
                          x2="50"
                          y2="16"
                          stroke="#1c1c1e"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          transform={`rotate(${minAngle} 50 50)`}
                        />

                        {/* Swiss Railroad Style Highlighted Orange Seconds Hand */}
                        <line
                          x1="50"
                          y1="57"
                          x2="50"
                          y2="12"
                          stroke="#ff9500"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          transform={`rotate(${secAngle} 50 50)`}
                        />

                        {/* Golden/Orange hub cover */}
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="4.5" 
                          fill="#ff9500" 
                          stroke="#ffffff" 
                          strokeWidth="1.2" 
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Space divider */}
                  <div className="w-[1.5px] h-[70%] bg-rose-200/50 dark:bg-white/10 mx-3 shrink-0" />

                  {/* Right Column: iOS Calendar / Scheduler style Info Unit */}
                  <div className="flex-1 h-full flex flex-col justify-center text-left pl-1 pr-1.5 min-w-0">
                    <span className="text-rose-500 font-extrabold text-[12px] uppercase tracking-wider block">
                      {textDayOfWeek}
                    </span>
                    
                    <span className="text-[34px] sm:text-[44px] font-semibold tracking-tight leading-none text-rose-950 dark:text-white block mt-0.5 select-none font-sans">
                      {textDay}
                    </span>

                    {/* Sub schedule item info layout with pink color vertical bar */}
                    <div className="flex items-center gap-1.5 mt-2 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                      <span className="w-1 h-3.5 bg-pink-400 rounded-full shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 dark:text-slate-350 tracking-wide truncate">
                        {/* Display active school name or just generic status */}
                        {settings.neisConfig.schoolName ? `${settings.neisConfig.schoolName} 연동중` : '오늘 일정: Study & Class'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* iOS System Squircle Resizer Handle */}
            <div
              onMouseDown={handleMinimizedResizeMouseDown}
              className="absolute bottom-1.5 right-1.5 w-4 h-4 cursor-se-resize flex items-end justify-end pointer-events-auto no-drag select-none z-50 opacity-40 hover:opacity-100 transition-opacity"
              title="크기 조절"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-white">
                <path d="M10,0 L0,10 M10,4 L4,10 M10,8 L8,10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        );
      })() : (
        <>
          {/* 2. CONTROL CENTER FLOATING WIDGET (Sleek Apple-style Single-Row Icon Dock) */}
          <div className="fixed top-4 right-4 z-[999] glass-effect rounded-full px-2 py-1.5 shadow-xl border border-white/30 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md flex flex-row items-center gap-1.5 sm:gap-2 animate-scale-up hover:bg-white/80 dark:hover:bg-slate-900/90 transition-all duration-350">
            
            {/* A. LAYOUT CONTROL GROUP */}
            <div className="relative group">
              <button
                onClick={() => setUseDashboardMode(!useDashboardMode)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-sky-500/10 hover:text-sky-600 dark:hover:bg-sky-500/15 dark:hover:text-sky-450 text-slate-705 dark:text-slate-250 transition-all duration-200 select-none cursor-pointer border border-transparent"
              >
                {useDashboardMode ? (
                  <Maximize2 className="w-4.5 h-4.5 text-apple-blue dark:text-sky-400" />
                ) : (
                  <LayoutGrid className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                )}
              </button>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[1000] whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-white/10">
                {useDashboardMode ? "자유 위젯 배치 모드로 전환" : "정돈된 대시보드 그리드 모드로 전환"}
              </div>
            </div>

            <div className="relative group">
              <button
                onClick={() => setShowWidgetToggleDrawer(!showWidgetToggleDrawer)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400 text-slate-705 dark:text-slate-250 transition-all duration-200 select-none cursor-pointer border border-transparent relative"
              >
                <Layers className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-450" />
                {/* Micro badge count */}
                <span className="absolute top-1 right-1 bg-indigo-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center scale-90 border border-white dark:border-slate-900 shadow-xs">
                  {widgets.filter(w => !w.isHidden).length}
                </span>
              </button>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[1000] whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-white/10">
                {`위젯 연동/보이기 맞춤 설정 (현재 ${widgets.filter(w => !w.isHidden).length}개 활성화됨)`}
              </div>
            </div>

            {/* B. WORKSPACE INTERACTIVE UTILITIES (Only visible in Free Widget Workspace mode) */}
            {!useDashboardMode && (
              <>
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5 self-center shrink-0" />

                <div className="relative group">
                  <button
                    onClick={() => setEditPositions(!editPositions)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 select-none cursor-pointer border border-transparent ${
                      editPositions 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300/30' 
                        : 'hover:bg-amber-500/11 hover:text-amber-600 dark:hover:bg-amber-500/15 dark:hover:text-amber-400 text-slate-705 dark:text-slate-250'
                    }`}
                  >
                    {editPositions ? (
                      <Unlock className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                    ) : (
                      <Lock className="w-4.5 h-4.5 text-slate-500 dark:text-slate-400" />
                    )}
                  </button>
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[1000] whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-white/10">
                    {editPositions ? "배치 수정 완료 후 잠금" : "위젯 자유 배치 수정 모드 켜기"}
                  </div>
                </div>

                <div className="relative group">
                  <button
                    onClick={realignAllWidgetsToScreen}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-violet-500/10 hover:text-violet-600 dark:hover:bg-violet-500/15 dark:hover:text-violet-400 text-slate-705 dark:text-slate-250 transition-all duration-200 select-none cursor-pointer border border-transparent"
                  >
                    <RefreshCw className="w-4.5 h-4.5 text-violet-500 dark:text-violet-400" />
                  </button>
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[1000] whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-white/10">
                    화면 밖 위젯 강제 회수 & 일괄 자동 정렬
                  </div>
                </div>

                <div className="relative group">
                  <button
                    onClick={() => {
                      if (settings.minimizeMode === 'right-sidebar') {
                        if (isSidebarActive) {
                          if (widgetsBackup) {
                            setWidgets(widgetsBackup);
                            setWidgetsBackup(null);
                          } else {
                            // Fallback: Restore all widgets as visible if no backup exists
                            setWidgets(widgets.map(w => ({ ...w, isHidden: false })));
                          }
                          setIsSidebarActive(false);
                        } else {
                          // Backup and minimize All active widgets
                          setWidgetsBackup(widgets);
                          setWidgets(widgets.map(w => ({ ...w, isHidden: true })));
                          setIsSidebarActive(true);
                        }
                      } else {
                        setIsMinimizedAll(true);
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-teal-500/10 hover:text-teal-600 dark:hover:bg-teal-500/15 dark:hover:text-teal-400 text-slate-705 dark:text-slate-250 transition-all duration-200 select-none cursor-pointer border border-transparent"
                  >
                    {settings.minimizeMode === 'right-sidebar' && isSidebarActive ? (
                      <Maximize2 className="w-4.5 h-4.5 text-teal-500 dark:text-teal-400" />
                    ) : (
                      <Minimize2 className="w-4.5 h-4.5 text-teal-500 dark:text-teal-400" />
                    )}
                  </button>
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[1000] whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-white/10">
                    {settings.minimizeMode === 'right-sidebar' && isSidebarActive
                      ? "최소화 이전 위치로 복원"
                      : "모든 활성 위젯 바탕화면에서 최소화 (전체 최소화)"}
                  </div>
                </div>
              </>
            )}

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5 self-center shrink-0" />

            {/* C. SYSTEM UTILITIES */}
            <div className="relative group">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-500/10 hover:text-slate-900 dark:hover:bg-slate-500/15 dark:hover:text-white text-slate-705 dark:text-slate-250 transition-all duration-200 select-none cursor-pointer border border-transparent"
              >
                <Settings className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[1000] whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-white/10">
                바탕화면 테마 및 종합 시스템 설정
              </div>
            </div>

            <div className="relative group">
              <button
                onClick={handleAppQuit}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-rose-550/10 hover:text-rose-600 dark:hover:bg-rose-550/15 dark:hover:text-rose-400 text-slate-705 dark:text-slate-250 transition-all duration-200 select-none cursor-pointer border border-transparent"
              >
                <LogOut className="w-4.5 h-4.5 text-rose-500 dark:text-rose-450" />
              </button>
              {/* Align right-aligned to fit nicely within screen boundaries without clipping */}
              <div className="absolute top-12 right-0 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out z-[1000] whitespace-nowrap bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl border border-white/10 origin-top-right">
                프로그램 데스크톱 안전하게 종료
              </div>
            </div>

          </div>
 
          {/* 3. CORE VIEW PANELS */}
          <main className={useDashboardMode ? "pt-24 pb-10 px-4 min-h-screen" : "pt-0 px-0 pb-0 w-full min-h-screen relative overflow-visible"}>

            {/* A. BENTO CLASSIC GRID DASHBOARD VIEW */}
            {useDashboardMode ? (
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-scale-up">
                {widgets.filter(w => !w.isHidden).map(w => (
                  <div 
                    key={w.id} 
                    className="glass-effect rounded-[24px] p-5 shadow-lg border border-white/30 dark:border-slate-800/20 min-h-[220px] relative"
                  >
                    {/* Apple-style minimize button in the upper right corner */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWidgetVisible(w.id);
                      }}
                      className="cursor-pointer absolute top-3.5 right-3.5 w-5.5 h-5.5 flex items-center justify-center rounded-full bg-slate-500/10 hover:bg-rose-500/80 hover:text-white dark:bg-white/5 dark:hover:bg-rose-500/80 text-slate-400 dark:text-slate-300 transition-all duration-200 shadow-xs z-30 no-drag"
                      title="위젯 최소화"
                    >
                      <Minimize2 className="w-3 h-3" />
                    </button>
                    {renderWidgetContent(w.type, w.w, w.h)}
                  </div>
                ))}
              </div>
            ) : (
              /* B. FLOATING DRAGGABLE DESKTOP WORKSPACE VIEW */
              <div className="relative w-full min-h-screen overflow-visible pb-16">
                {widgets.filter(w => !w.isHidden).map(w => {
                  return (
                    <div
                      key={w.id}
                      style={{
                        position: 'absolute',
                        left: `${w.x}px`,
                        top: `${w.y}px`,
                        width: `${w.w}px`,
                        height: `${w.h}px`,
                        overflow: 'hidden',
                        zIndex: editPositions ? 20 : 10,
                      }}
                      onMouseDown={(e) => handleWidgetMouseDown(e, w.id)}
                      className={`glass-effect rounded-[22px] p-4 shadow-xl border transition-[background-color,border-color,box-shadow,transform] duration-350 ${
                        editPositions 
                          ? 'ring-2 ring-apple-blue border-apple-blue' 
                          : 'border-white/30 dark:border-slate-850/20 shadow-neutral-900/10'
                      }`}
                    >
                      {/* Floating Grab Indicator (Only visible during placement mod) */}
                      {editPositions && (
                        <div className="drag-handle absolute -top-3.5 left-1/2 -translate-x-1/2 bg-apple-blue text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm select-none">
                          <Move className="w-2.5 h-2.5" />
                          <span>MOVE</span>
                        </div>
                      )}
                      
                      {/* Apple-style minimize button in the upper right corner */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWidgetVisible(w.id);
                        }}
                        className="cursor-pointer absolute top-3 right-3 w-5.5 h-5.5 flex items-center justify-center rounded-full bg-slate-500/10 hover:bg-rose-500/80 hover:text-white dark:bg-white/5 dark:hover:bg-rose-500/80 text-slate-400 dark:text-slate-300 transition-all duration-200 shadow-xs z-30 no-drag"
                        title="위젯 최소화"
                      >
                        <Minimize2 className="w-3 h-3" />
                      </button>

                      {renderWidgetContent(w.type, w.w, w.h)}

                      {/* Resize Handle at bottom right (Always available by default) */}
                      {true && (
                        <div
                          onMouseDown={(e) => handleWidgetResizeMouseDown(e, w.id)}
                          className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end pointer-events-auto no-drag select-none z-30"
                          title="위젯 크기 조절"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400 dark:text-slate-500 hover:text-apple-blue transition-colors">
                            <path d="M10,0 L0,10 M10,4 L4,10 M10,8 L8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Smart snapping guides overlay lines */}
                {smartGuides.vLine !== null && (
                  <div 
                    className="absolute top-0 bottom-0 w-[1px] border-l border-dashed border-[#FF4081] pointer-events-none z-[999]"
                    style={{ left: `${smartGuides.vLine}px` }}
                  />
                )}
                {smartGuides.hLine !== null && (
                  <div 
                    className="absolute left-0 right-0 h-[1px] border-t border-dashed border-[#FF4081] pointer-events-none z-[999]"
                    style={{ top: `${smartGuides.hLine}px` }}
                  />
                )}

                {/* Equal Spacings list render block */}
                {smartGuides.spacings.map((p, idx) => {
                  if (p.dir === 'x') {
                    return (
                      <div 
                        key={`x-spacing-${idx}`}
                        className="absolute h-4 flex items-center z-[998] pointer-events-none"
                        style={{ left: `${p.p1Start}px`, width: `${p.p1End - p.p1Start}px`, top: `${p.yOrX}px` }}
                      >
                        <div className="w-full h-[1px] bg-[#FF4081] relative">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-l-2 border-t-2 border-[#FF4081] -rotate-45" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-r-2 border-t-2 border-[#FF4081] rotate-45" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 text-[#FF4081] text-[9px] font-black px-1 border border-[#FF4081]/30 rounded shadow-xs whitespace-nowrap">
                            {p.gap}px
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div 
                        key={`y-spacing-${idx}`}
                        className="absolute w-4 flex justify-center z-[998] pointer-events-none"
                        style={{ top: `${p.p1Start}px`, height: `${p.p1End - p.p1Start}px`, left: `${p.yOrX}px` }}
                      >
                        <div className="h-full w-[1px] bg-[#FF4081] relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border-l-2 border-t-2 border-[#FF4081] rotate-45" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border-r-2 border-b-2 border-[#FF4081] rotate-45" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 text-[#FF4081] text-[9px] font-black px-1 border border-[#FF4081]/30 rounded shadow-xs whitespace-nowrap">
                            {p.gap}px
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}

                {/* Additional segments corresponding to second gap if needed */}
                {smartGuides.spacings.map((p, idx) => {
                  if (p.dir === 'x') {
                    return (
                      <div 
                        key={`x-spacing-2-${idx}`}
                        className="absolute h-4 flex items-center z-[998] pointer-events-none"
                        style={{ left: `${p.p2Start}px`, width: `${p.p2End - p.p2Start}px`, top: `${p.yOrX}px` }}
                      >
                        <div className="w-full h-[1px] bg-[#FF4081] relative">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-l-2 border-t-2 border-[#FF4081] -rotate-45" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-r-2 border-t-2 border-[#FF4081] rotate-45" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 text-[#FF4081] text-[9px] font-black px-1 border border-[#FF4081]/30 rounded shadow-xs whitespace-nowrap">
                            {p.gap}px
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div 
                        key={`y-spacing-2-${idx}`}
                        className="absolute w-4 flex justify-center z-[998] pointer-events-none"
                        style={{ top: `${p.p2Start}px`, height: `${p.p2End - p.p2Start}px`, left: `${p.yOrX}px` }}
                      >
                        <div className="h-full w-[1px] bg-[#FF4081] relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border-l-2 border-t-2 border-[#FF4081] rotate-45" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border-r-2 border-b-2 border-[#FF4081] rotate-45" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 text-[#FF4081] text-[9px] font-black px-1 border border-[#FF4081]/30 rounded shadow-xs whitespace-nowrap">
                            {p.gap}px
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </main>

          {/* 4. SIDE DRAWER-WIDGET VISIBILITY CONTROLLER */}
          {showWidgetToggleDrawer && (
            <div className="fixed inset-0 bg-transparent z-45 flex justify-end animate-fade-in no-drag">
              <div 
                className="w-80 h-full bg-[#85C1E9]/20 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col justify-between"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <span>바탕화면 위젯 제어</span>
                    </span>
                    <button
                      onClick={() => setShowWidgetToggleDrawer(false)}
                      className="text-white/60 hover:text-white font-bold text-xs cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 mb-4 leading-relaxed font-semibold">
                    바탕화면에 상주할 위젯을 켜거나 끌 수 있습니다. 필요치 않은 카드는 숨김처리하여 넓은 칠판 바탕을 만들어 사용하세요.
                  </p>

                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {widgets.map(w => (
                      <div 
                        key={w.id}
                        className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => handleToggleWidgetVisible(w.id)}
                      >
                        <span className="text-[11px] font-bold text-slate-150 uppercase tracking-wider">
                          {w.type === 'clock' && '⏰ 시계 & 날짜'}
                          {w.type === 'weather' && '🌤️ 날씨 등교정보'}
                          {w.type === 'todo' && '📋 오늘의 할 일'}
                          {w.type === 'memo' && '📝 포스트잇 노트'}
                          {w.type === 'lunch' && '🍗 오늘의 급식'}
                          {w.type === 'schedule' && '📅 월간 학사일정'}
                          {w.type === 'roster' && '👥 학생 관리명렬'}
                          {w.type === 'tools' && '🎯 수업 보조도구'}
                          {w.type === 'dday' && '📆 시험 디데이'}
                          {w.type === 'timetable-class' && '🏫 학급 시간표'}
                          {w.type === 'timetable-teacher' && '💼 나의 교사시간표'}
                          {w.type === 'grade-analysis' && '📊 성적 분석'}
                          {w.type === 'lesson-progress' && '📖 진도 체크'}
                        </span>
                        
                        <button className="cursor-pointer p-0.5">
                          {w.isHidden ? (
                            <EyeOff className="w-4 h-4 text-slate-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/15 pt-4 space-y-2">
                  <button
                    onClick={realignAllWidgetsToScreen}
                    className="cursor-pointer w-full bg-emerald-700 hover:bg-emerald-650 text-white p-2.5 border border-emerald-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs"
                    title="화면 영역을 벗어난 모든 카드를 현재 모니터 화면 크기에 강제 맞춤 및 정렬합니다."
                  >
                    <RefreshCw className="w-4 h-4 animate-spin-once" />
                    <span>잃어버린 위젯 현화면 정렬</span>
                  </button>
                  <button
                    onClick={resetWidgetPositions}
                    className="cursor-pointer w-full bg-slate-805 hover:bg-slate-700 text-slate-300 hover:text-white p-2.5 border border-white/10 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <span>기본 바둑판 배치로 초기화</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. APP GLOBAL SETTINGS MODAL */}
          {showSettingsModal && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
              <div 
                className="bg-white/95 dark:bg-slate-905/95 text-slate-800 dark:text-white border border-slate-205 dark:border-white/10 p-6 rounded-[28px] w-full max-w-lg shadow-2xl animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4 mb-4">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-apple-blue" />
                    <span>초기 설정 및 NEIS 통합 연동</span>
                  </span>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:text-white/60 dark:hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    닫기
                  </button>
                </div>

                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  
                  {/* Backdrop Wall Selection */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">바탕화면 벽지 스킨</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(WALLPAPERS).map(wpKey => (
                        <button
                          key={wpKey}
                          onClick={() => setSettings(prev => ({ ...prev, wallpaper: wpKey }))}
                          className={`cursor-pointer text-[11px] p-2 rounded-xl text-center border font-semibold transition-all ${
                            settings.wallpaper === wpKey
                              ? 'bg-apple-blue/10 border-apple-blue text-apple-blue'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-white/10'
                          }`}
                        >
                          {WALLPAPER_NAMES[wpKey] || wpKey}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dark mode switcher & Always on Top simulation */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/50 dark:border-white/5">
                      <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold block">다크 모드</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">테마 적용 여부</span>
                        <input
                          type="checkbox"
                          checked={settings.useDarkTheme}
                          onChange={(e) => setSettings(prev => ({ ...prev, useDarkTheme: e.target.checked }))}
                          className="w-4 h-4 text-apple-blue rounded bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-white/15 focus:ring-0 outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/50 dark:border-white/5">
                      <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold block">바탕화면 항상 위</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">포커스 상주 고정</span>
                        <input
                          type="checkbox"
                          checked={settings.alwaysOnTop}
                          onChange={(e) => setSettings(prev => ({ ...prev, alwaysOnTop: e.target.checked }))}
                          className="w-4 h-4 text-apple-blue rounded bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-white/15 focus:ring-0 outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Minimized Design Style Picker Selection (Request 4-1) */}
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2.5">
                    <span className="text-[11px] text-apple-blue dark:text-sky-400 font-bold block flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>최소화 상태 위젯 아이콘 디자인 선택</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, minimizedStyle: 'swiss-railroad' }))}
                        className={`cursor-pointer p-2.5 rounded-xl border text-center transition-all flex flex-col justify-center items-center gap-1 ${
                          settings.minimizedStyle !== 'clean-calendar'
                            ? 'bg-apple-blue/15 border-apple-blue text-apple-blue font-bold shadow-xs'
                            : 'bg-white dark:bg-black/45 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <span className="font-extrabold text-[11px]">스위스 철도 시계 (Classic)</span>
                        <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">아날로그 스위스 시계 + 캘린더 일자</span>
                      </button>

                      <button
                        onClick={() => setSettings(prev => ({ ...prev, minimizedStyle: 'clean-calendar' }))}
                        className={`cursor-pointer p-2.5 rounded-xl border text-center transition-all flex flex-col justify-center items-center gap-1 ${
                          settings.minimizedStyle === 'clean-calendar'
                            ? 'bg-apple-blue/15 border-apple-blue text-apple-blue font-bold shadow-xs'
                            : 'bg-white dark:bg-black/45 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <span className="font-extrabold text-[11px]">스마트 LED 탁상시계 (Modern)</span>
                        <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">Cyber Cyan 디지털 전자시계 & 날씨 인포</span>
                      </button>
                    </div>
                  </div>

                  {/* Minimization Mode Settings (Request Sidebar / Icon picker) */}
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2.5">
                    <span className="text-[11px] text-apple-blue dark:text-sky-400 font-bold block flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>최소화 모드</span>
                    </span>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({ ...prev, minimizeMode: 'clock-icon' }));
                          setIsSidebarActive(false);
                        }}
                        className={`cursor-pointer p-3 rounded-xl border text-left transition-all flex flex-col justify-start gap-1 ${
                          (settings.minimizeMode !== 'right-sidebar')
                            ? 'bg-apple-blue/15 border-apple-blue text-apple-blue font-bold shadow-xs'
                            : 'bg-white dark:bg-black/45 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <span className="font-extrabold text-[11px]">시계 아이콘 모드</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                          - 시계 아이콘 모드: 위젯을 최소화하면 기존처럼 시계 아이콘 형태로 표시합니다.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, minimizeMode: 'right-sidebar' }))}
                        className={`cursor-pointer p-3 rounded-xl border text-left transition-all flex flex-col justify-start gap-1 ${
                          settings.minimizeMode === 'right-sidebar'
                            ? 'bg-apple-blue/15 border-apple-blue text-apple-blue font-bold shadow-xs'
                            : 'bg-white dark:bg-black/45 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <span className="font-extrabold text-[11px]">오른쪽 사이드바 아이콘 모드</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                          - 오른쪽 사이드바 아이콘 모드: 위젯을 최소화하면 오른쪽 사이드바에 작은 아이콘만 표시합니다. 마우스로 드래그해서 사이드바를 왼쪽에 세로로 위치시킬 수 있어야 합니다.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Monitor Target Control */}
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-3">
                    <span className="text-[11px] text-apple-blue dark:text-sky-400 font-bold block flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" />
                      <span>위젯 출력 모니터 지정 (다중 디스플레이)</span>
                    </span>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                        대시보드를 표시할 주모니터 또는 보조모니터 선택
                      </span>
                      {displays.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {displays.map((disp) => (
                            <button
                              key={disp.id}
                              onClick={() => handleDisplayChange(String(disp.id))}
                              className={`cursor-pointer text-[11px] p-2.5 rounded-xl border font-semibold text-left transition-all flex flex-col justify-between ${
                                selectedDisplayId === String(disp.id)
                                  ? 'bg-apple-blue/15 border-apple-blue text-apple-blue font-bold shadow-xs'
                                  : 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10'
                              }`}
                            >
                              <span className="truncate block font-bold">{disp.label}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                                영역: {disp.workArea.width}x{disp.workArea.height} {disp.isPrimary ? ' (주)' : ' (보조)'}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-400 bg-white/50 dark:bg-black/25 p-3 rounded-xl border border-dotted border-slate-200 dark:border-white/5">
                          현재 웹 에뮬레이션 주소입니다. 데스크탑 Electron 클라이언트로 다중 모니터 상에서 구동 시 시스템 하드웨어를 자동 감지하여 주모니터/보조모니터 전환 스위치가 활성화됩니다.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NEIS API configuration & School Lookup */}
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-3">
                    <span className="text-[11px] text-apple-blue dark:text-sky-400 font-bold block">국가 교육행정 정보시스템(NEIS) 연계</span>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">교육청 인증 KEY (선택사항)</span>
                        <span className="text-[8px] text-amber-500 font-semibold">※ 없을 경우 일시적 제한 가능성</span>
                      </div>
                      <input
                        type="password"
                        value={settings.neisConfig.apiKey}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          neisConfig: { ...prev.neisConfig, apiKey: e.target.value }
                        }))}
                        className="w-full text-xs bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-800 dark:text-white outline-none focus:border-apple-blue"
                        placeholder="NEIS OpenAPI 인증키를 기재하십시오..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">소속 학교 검색 및 동화</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="학교 검색 (예: 서울선정초)"
                          className="flex-1 text-xs bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-800 dark:text-white outline-none focus:border-apple-blue"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSchoolSearch(); }}
                        />
                        <button
                          onClick={handleSchoolSearch}
                          disabled={searching}
                          className="cursor-pointer bg-apple-blue hover:bg-apple-blue/90 font-medium text-white text-xs px-4 rounded-lg shadow-sm flex items-center gap-1 shrink-0 transition-opacity"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>검색</span>
                        </button>
                      </div>
                    </div>

                    {/* Results map */}
                    {searchResults.length > 0 && (
                      <div className="bg-white dark:bg-black/50 border border-slate-200 dark:border-white/15 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                        {searchResults.map((row, rIdx) => (
                          <div 
                            key={rIdx} 
                            onClick={() => handleSelectSchool(row)}
                            className="p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] flex justify-between items-center transition-all text-left"
                          >
                            <div>
                              <span className="font-semibold block text-slate-800 dark:text-slate-200">{row.schoolName}</span>
                              <span className="text-[9px] text-slate-400 block truncate max-w-72">{row.address}</span>
                            </div>
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-1.5 py-0.5 rounded-sm">{row.schoolType}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Registered credentials display */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-[10px] text-slate-500 dark:text-slate-350 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">인식된 소속학교:</span>
                        <span className="font-bold text-apple-blue">{settings.neisConfig.schoolName || '미지정 (샘플 데이터 모드)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">기관 코드 (Office):</span>
                        <span className="font-mono">{settings.neisConfig.officeCode || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">학교 코드 (School):</span>
                        <span className="font-mono">{settings.neisConfig.schoolCode || '-'}</span>
                      </div>
                    </div>

                  </div>

                </div>

                <div className="border-t border-slate-100 dark:border-white/10 pt-4 mt-6 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-apple-blue" />
                      <span>100% 로컬 드라이브 저장</span>
                    </span>
                    <button
                      onClick={handleMasterReset}
                      className="cursor-pointer bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-tight transition-all"
                    >
                      시스템 전체 초기화
                    </button>
                  </div>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="cursor-pointer bg-apple-blue hover:bg-apple-blue/90 text-white rounded-xl px-5 py-2 text-xs font-semibold shadow-md transition-all active:scale-95 text-center"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. RIGHT SIDEBAR WIDGET DOCK */}
          {!isMinimizedAll && settings.minimizeMode === 'right-sidebar' && isSidebarActive && (
            <div 
              style={{
                position: 'fixed',
                top: '50%',
                transform: 'translateY(-50%)',
                [sidebarPosition]: '12px',
                zIndex: 45
              }}
              className="flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xl select-none transition-all duration-300 pointer-events-auto"
            >
              {/* Drag/Shift handle */}
              <div 
                onMouseDown={handleSidebarMouseDown}
                className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-slate-300/20 dark:hover:bg-white/5 text-slate-400 dark:text-slate-500 mb-1 flex items-center justify-center"
                title="드래그하여 반대쪽 사이드바로 이동"
              >
                <GripVertical className="w-4 h-4 cursor-grab" />
              </div>

              {/* Widget icon lists */}
              <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-0.5">
                {widgets.map(w => {
                  const info = WIDGET_INFO_MAP[w.id] || WIDGET_INFO_MAP[w.type] || { name: w.id, icon: LayoutGrid };
                  const IconComponent = info.icon;
                  const isMinimized = w.isHidden;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setWidgets(prev => prev.map(item => item.id === w.id ? { ...item, isHidden: !item.isHidden } : item));
                      }}
                      title={info.name}
                      aria-label={info.name}
                      className={`w-9.5 h-9.5 flex items-center justify-center rounded-xl transition-all duration-200 border relative group cursor-pointer ${
                        isMinimized 
                          ? 'bg-slate-150/40 dark:bg-slate-800/35 hover:bg-slate-200/80 hover:border-slate-350 select-none opacity-45 hover:opacity-100 border-dashed border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400' 
                          : 'bg-apple-blue/15 border-apple-blue text-apple-blue font-bold shadow-xs'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      
                      {/* Active Indicator dot */}
                      {!isMinimized && (
                        <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-apple-blue rounded-full" />
                      )}

                      {/* Tooltip */}
                      <span className={`absolute ${sidebarPosition === 'right' ? 'right-full mr-3.5' : 'left-full ml-3.5'} px-2.5 py-1 text-[10px] font-extrabold text-white bg-slate-950/95 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap pointer-events-none shadow-md z-[55]`}>
                        {info.name} {isMinimized ? '(최소화됨)' : '(화면 표시됨)'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
