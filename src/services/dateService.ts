/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns the current date in Korea Standard Time (KST) as a string formatted as YYYY-MM-DD
 */
export function getKSTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object into 'YYYY년 MM월 DD일 (요일)' in Korean KST
 */
export function formatKSTFullDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  return formatter.format(date);
}

/**
 * Strips any formatting and returns Date object representing Seoul time
 */
export function getKSTDate(date: Date = new Date()): Date {
  // Convert local host date to Asia/Seoul timestamp
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const formatted = formatter.format(date);
  return new Date(formatted);
}

/**
 * Helper to get day name of week (e.g., '월', '화', '수' ...) for timetable highlighting
 */
export function getKSTDayOfWeek(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  });
  return formatter.format(date); // '월', '화' etc.
}
