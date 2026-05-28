/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AttendanceStatus =
  | '출석'
  | '질병결석'
  | '질병조퇴'
  | '질병지각'
  | '미인정결석'
  | '미인정지각'
  | '미인정조퇴'
  | '인정결석'
  | '인정지각'
  | '인정조퇴'
  | '결과'
  | '미인정결과';

export interface Student {
  id: string;
  grade?: number;      // 학년
  groupClass?: number; // 반
  number: number;
  name: string;
  memo: string;
  stickers: number;
}

export interface ClassInfo {
  id: string; // e.g. "class-1"
  className: string; // e.g. "3학년 1반"
  students: Student[];
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
}

export interface CounselingLog {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  content: string;
  tag?: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  dueDate?: string; // YYYY-MM-DD
}

export interface Memo {
  id: string;
  content: string;
  color: string; // hex or tailwind bg class
  updatedAt: string;
}

export interface TimetableData {
  // Key represents day of week "월", "화", "수", "목", "금"
  // Value is string[] of size 7 representing periods 1 to 7
  [day: string]: string[];
}

export interface DDay {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
}

export type LessonProgressRecord = {
  id: string;
  subject: string;
  grade: string;
  className: string;
  unitName: string;
  page: string;
  lessonSummary: string;
  createdAt: string;
  updatedAt?: string;
};

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  isNeis?: boolean;
}

export interface NeisConfig {
  apiKey: string;
  schoolName: string;
  officeCode: string; // e.g. "B10" (SEOUL)
  schoolCode: string; // e.g. "7010537"
}

export type WidgetSize = 'small' | 'medium' | 'large' | 'wide';

export interface WidgetLayout {
  id: string; // matches widgetId
  type: string; // 'clock', 'weather', 'classroomTools', 'todo', 'lunch', 'schoolSchedule', 'studentRoster', 'dday', 'memo', 'timetable-class', 'timetable-teacher'
  x: number; // grid layout coordinates or absolute pixel offsets
  y: number;
  w: number; // flex-basis or visual layouts
  h: number;
  isHidden: boolean;
  isFolded: boolean;
  size: WidgetSize;
}

export interface DashboardSettings {
  alwaysOnTop: boolean;
  useDarkTheme: boolean;
  wallpaper: string; // 'warm-sunset', 'glass-clear', 'aurora-dark', 'school-slate'
  neisConfig: NeisConfig;
  minimizedStyle?: 'swiss-railroad' | 'clean-calendar';
  minimizeMode?: 'clock-icon' | 'right-sidebar';
}
