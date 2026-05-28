/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, AttendanceRecord, CounselingLog } from '../types/dashboard';

/**
 * Downloads a string as a CSV file in the browser environment.
 * Handled safely with UTF-8 BOM so Excel opens Korean characters correctly.
 */
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates an Excel-compatible CSV of student roster, complete with attendance and counseling tallies.
 */
export function exportRosterToCSV(
  className: string,
  students: Student[],
  attendance: AttendanceRecord[],
  counselLog: CounselingLog[]
): string {
  let csv = `학급 정보,${className}\n\n`;
  csv += `학년,반,번호,성명,칭찬 스티커 개수,개인 메모,출석 횟수,결석 횟수,지각/조퇴 횟수,등록 상담 일지 수\n`;
  
  students.forEach(st => {
    const stAttendance = attendance.filter(a => a.studentId === st.id);
    const present = stAttendance.filter(a => a.status === '출석').length;
    const absent = stAttendance.filter(a => ['질병결석', '미인정결석', '인정결석'].includes(a.status)).length;
    const others = stAttendance.filter(a => ['질병지각', '질병조퇴', '미인정지각', '미인정조퇴', '인정지각', '인정조퇴'].includes(a.status)).length;
    const counselorsCount = counselLog.filter(c => c.studentId === st.id).length;
    
    // Escaping comma and double-quotes
    const cleanMemo = st.memo ? `"${st.memo.replace(/"/g, '""')}"` : '';
    
    csv += `${st.grade || ''},${st.groupClass || ''},${st.number},"${st.name}",${st.stickers},${cleanMemo},${present},${absent},${others},${counselorsCount}\n`;
  });
  
  return csv;
}

/**
 * Parses a roster CSV string and converts it to a Student array.
 * Robust fallback for Grade, Class, Number, Name structures.
 */
export function parseCSVToStudents(csvText: string): Partial<Student>[] {
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const students: Partial<Student>[] = [];
  
  if (lines.length === 0) return [];
  
  // Default column indexes mapping
  let colGrade = 0;
  let colClass = 1;
  let colNumber = 2;
  let colName = 3;
  let colMemo = 4;
  
  // Try to find correct indices matching headers in the first line
  const firstLineParts = parseCSVLine(lines[0]);
  const hasHeader = firstLineParts.some(p => p.includes('학년') || p.includes('반') || p.includes('번호') || p.includes('성명') || p.includes('이름'));
  
  let startIdx = 0;
  if (hasHeader) {
    startIdx = 1;
    firstLineParts.forEach((p, idx) => {
      const clean = p.trim();
      if (clean.includes('학년')) colGrade = idx;
      else if (clean === '반') colClass = idx;
      else if (clean.includes('번호')) colNumber = idx;
      else if (clean.includes('성명') || clean.includes('이름') || clean === '학생 이름') colName = idx;
      else if (clean.includes('메모') || clean.includes('비고') || clean.includes('특기') || clean.includes('주안점')) colMemo = idx;
    });
  } else {
    // If no header, and there are fewer than 4 columns but has at least 2, assume fallback mapping [Number, Name, Memo]
    if (firstLineParts.length < 4 && firstLineParts.length >= 2) {
      colGrade = -1;
      colClass = -1;
      colNumber = 0;
      colName = 1;
      colMemo = 2;
    }
  }
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    if (parts.length >= 2) {
      const parsedGrade = colGrade >= 0 && parts[colGrade] ? parseInt(parts[colGrade].replace(/[^0-9]/g, ''), 10) : NaN;
      const parsedClass = colClass >= 0 && parts[colClass] ? parseInt(parts[colClass].replace(/[^0-9]/g, ''), 10) : NaN;
      const parsedNum = colNumber >= 0 && parts[colNumber] ? parseInt(parts[colNumber].replace(/[^0-9]/g, ''), 10) : NaN;
      
      const num = isNaN(parsedNum) ? students.length + 1 : parsedNum;
      const name = parts[colName] ? parts[colName].trim() : '';
      const memo = colMemo >= 0 && parts[colMemo] ? parts[colMemo].trim() : '';
      
      const grade = isNaN(parsedGrade) ? undefined : parsedGrade;
      const groupClass = isNaN(parsedClass) ? undefined : parsedClass;
      
      if (name && name !== '이름' && name !== '성명' && name !== '학생 이름') {
        students.push({
          grade,
          groupClass,
          number: num,
          name,
          memo,
          stickers: 0
        });
      }
    }
  }
  
  // Sort primarily by Grade, Class, and Number
  return students.sort((a, b) => {
    if (a.grade !== b.grade && a.grade !== undefined && b.grade !== undefined) return a.grade - b.grade;
    if (a.groupClass !== b.groupClass && a.groupClass !== undefined && b.groupClass !== undefined) return a.groupClass - b.groupClass;
    return (a.number || 0) - (b.number || 0);
  });
}

/**
 * Standard CSV line parser that properly handles quoted values with commas inside them
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Exporter of Counseling Diary logs
 */
export function exportCounselingToCSV(
  students: Student[],
  logs: CounselingLog[]
): string {
  let csv = `상담일자,학번/이름,상담 내용,기타 메모\n`;
  
  logs.forEach(log => {
    const student = students.find(s => s.id === log.studentId);
    const code = student ? `[${student.number}번] ${student.name}` : '알 수 없음';
    const cleanContent = log.content ? `"${log.content.replace(/"/g, '""')}"` : '';
    const cleanTag = log.tag ? `"${log.tag.replace(/"/g, '""')}"` : '';
    
    csv += `${log.date},"${code}",${cleanContent},${cleanTag}\n`;
  });
  
  return csv;
}

/**
 * Formatted sample templates for user download
 */
export function getRosterCSVTemplate(): string {
  return `학년,반,번호,성명,개인 메모\n3,1,1,강재희,학급 반장, 성실함\n3,1,2,김민수,수학 부장\n3,1,3,박서하,미술 도우미\n3,1,4,안지환,체육 부장\n3,1,5,이윤서,독서왕`;
}

export function getTimetableCSVTemplate(): string {
  return `교시,월,화,수,목,금\n1교시,국어,영어,수학,사회,과학\n2교시,수학,미술,과학,체육,음악\n3교시,체육,국어,영어,자율,수학\n4교시,창체,수학,도덕,실과,영어\n5교시,음악,과학,사회,국어,진로\n6교시,영어,체육,컴퓨터,동아리,한문\n7교시,동아리,,,독서,`;
}

/**
 * Helper to parse a cell value into subject and teacher fields.
 * Format: Subject(Teacher) or just Subject
 */
export function parseSubjectAndTeacher(cell: string): { subject: string | null; teacher: string | null } {
  const text = cell.trim();
  if (!text || text === '-' || text === ',') {
    return { subject: null, teacher: null };
  }
  
  // Match Subject(Teacher)
  const match = text.match(/^([^(]+)\(([^)]+)\)$/);
  if (match) {
    const subject = match[1].trim();
    const teacher = match[2].trim();
    if (subject) {
      return { subject, teacher };
    }
  }
  
  return {
    subject: text,
    teacher: null
  };
}

/**
 * Parses timetable CSV into 1-7 period x Mon-Fri grid.
 * Supports both standard single-row and complex double-row layout dynamically.
 */
export function parseCSVToTimetable(csvText: string): { [day: string]: string[] } {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const grid: { [day: string]: string[] } = {
    '월': Array(7).fill(''),
    '화': Array(7).fill(''),
    '수': Array(7).fill(''),
    '목': Array(7).fill(''),
    '금': Array(7).fill('')
  };
  
  if (lines.length < 1) return grid;
  
  // 1. Dynamic Weekday Header Mapping
  const daysToMatch = [
    { key: '월', patterns: ['월요일', '월', 'monday', 'mon'] },
    { key: '화', patterns: ['화요일', '화', 'tuesday', 'tue'] },
    { key: '수', patterns: ['수요일', '수', 'wednesday', 'wed'] },
    { key: '목', patterns: ['목요일', '목', 'thursday', 'thu'] },
    { key: '금', patterns: ['금요일', '금', 'friday', 'fri'] }
  ];
  
  let headerLineIdx = -1;
  let dayColMap: { [day: string]: number } = {};
  
  for (let i = 0; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]).map(p => p.trim());
    let matchCount = 0;
    const tempColMap: { [day: string]: number } = {};
    
    daysToMatch.forEach(dm => {
      const colIdx = parts.findIndex(p => {
        const clean = p.trim().toLowerCase();
        return dm.patterns.some(pat => clean === pat || clean.replace(/\s+/g, '') === pat);
      });
      if (colIdx !== -1) {
        tempColMap[dm.key] = colIdx;
        matchCount++;
      }
    });
    
    if (matchCount >= 3) { // Identified header row with at least 3 matching weekdays
      headerLineIdx = i;
      dayColMap = tempColMap;
      break;
    }
  }
  
  // Fallback if header not detected
  if (headerLineIdx === -1) {
    // Keep standard fallback
    const startRow = lines[0].includes('월') || lines[0].includes('화') ? 1 : 0;
    for (let r = startRow; r < lines.length && r < startRow + 7; r++) {
      const parts = parseCSVLine(lines[r]);
      const periodIndex = r - startRow;
      if (periodIndex < 7) {
        if (parts[1]?.trim()) grid['월'][periodIndex] = parts[1].trim();
        if (parts[2]?.trim()) grid['화'][periodIndex] = parts[2].trim();
        if (parts[3]?.trim()) grid['수'][periodIndex] = parts[3].trim();
        if (parts[4]?.trim()) grid['목'][periodIndex] = parts[4].trim();
        if (parts[5]?.trim()) grid['금'][periodIndex] = parts[5].trim();
      }
    }
    return grid;
  }
  
  // 2. Determine Double-Row vs Single-Row Layout
  let isDoubleRow = false;
  // Look for the first period row past header
  for (let r = headerLineIdx + 1; r < lines.length; r++) {
    const parts = parseCSVLine(lines[r]);
    const hasPeriodLabel = parts.some(p => {
      const txt = p.trim();
      return txt.replace(/\s+/g, '').match(/(\d+)교시/) || txt.match(/^[1-7]$/);
    });
    if (hasPeriodLabel && r + 1 < lines.length) {
      const nextParts = parseCSVLine(lines[r + 1]);
      const nextHasPeriodLabel = nextParts.some(p => {
        const txt = p.trim();
        return txt.replace(/\s+/g, '').match(/(\d+)교시/) || txt.match(/^[1-7]$/);
      });
      // If the immediate next row does NOT have a period label, it's double-row layout (Metadata Row -> Subject Row)
      if (!nextHasPeriodLabel) {
        isDoubleRow = true;
      }
      break;
    }
  }
  
  // 3. Scan and parse
  let seqPeriodIndex = 0; // fallback counter if period can't be computed from cell text
  for (let r = headerLineIdx + 1; r < lines.length; r++) {
    const parts = parseCSVLine(lines[r]);
    // Find period N
    let periodNum = -1;
    for (let c = 0; c < parts.length; c++) {
      const val = parts[c].trim();
      const cleanVal = val.replace(/\s+/g, '');
      const match = cleanVal.match(/(\d+)교시/);
      if (match) {
        periodNum = parseInt(match[1], 10);
        break;
      }
      // Or if first or second column contains plain number
      if (c < 2 && val.match(/^[1-7]$/)) {
        periodNum = parseInt(val, 10);
        break;
      }
    }
    
    // Fallback: If no periodNum is found, but lines have valid data, assume sequential periods (1 to 7)
    if (periodNum === -1) {
      if (isDoubleRow) {
        periodNum = Math.floor(seqPeriodIndex / 2) + 1;
      } else {
        periodNum = seqPeriodIndex + 1;
      }
    }
    
    if (periodNum >= 1 && periodNum <= 7) {
      const periodIdx = periodNum - 1;
      
      if (isDoubleRow) {
        // Read from Row 2 (Subject Row)
        if (r + 1 < lines.length) {
          const subjectParts = parseCSVLine(lines[r + 1]);
          // Map each day to the target column of the subject row
          Object.keys(dayColMap).forEach(day => {
            const colIdx = dayColMap[day];
            if (colIdx < subjectParts.length) {
              const { subject, teacher } = parseSubjectAndTeacher(subjectParts[colIdx]);
              if (subject) {
                grid[day][periodIdx] = teacher ? `${subject}(${teacher})` : subject;
              } else {
                grid[day][periodIdx] = '';
              }
            }
          });
          // Skip the Subject Row (which is r+1) in the next iteration
          r++;
          seqPeriodIndex += 2;
        }
      } else {
        // Single row format
        Object.keys(dayColMap).forEach(day => {
          const colIdx = dayColMap[day];
          if (colIdx < parts.length) {
            const { subject, teacher } = parseSubjectAndTeacher(parts[colIdx]);
            if (subject) {
              grid[day][periodIdx] = teacher ? `${subject}(${teacher})` : subject;
            } else {
              grid[day][periodIdx] = '';
            }
          }
        });
        seqPeriodIndex += 1;
      }
    } else {
      seqPeriodIndex += 1;
    }
  }
  
  return grid;
}
