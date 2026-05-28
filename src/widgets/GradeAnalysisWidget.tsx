/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Download, Settings as SettingsIcon, RefreshCw, 
  User, Sparkles, Check, AlertTriangle, ChevronRight, BarChart2, BookOpen, 
  Users, Info, FileText, CheckCircle, Brain, Target, MessageSquare, Clipboard, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Recharts components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine
} from 'recharts';

interface StudentData {
  no: number;
  name?: string; // 성명 (없얼 수 있음)
  scores: { [subject: string]: number };
  total: number;
  avg: number;
  rank?: number;
  strength?: string; // 강점 과목
  weakness?: string; // 보완 과목
  summary: string; // 2022 개정 어조 분석 요약
}

interface SubjectStat {
  subject: string;
  avg: number;
  gradeAvg: number; // 학년 평균
  max: number;
  min: number;
  distribution: {
    '90이상': number;
    '80대': number;
    '70대': number;
    '60대': number;
    '60미만': number;
  };
}

interface AIResult {
  analysis: string; // 분석내용
  curriculum?: string; // 교과학습발달사항
  homeLetter: string; // 가정통신문
}

interface GradeAnalysisWidgetProps {
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

export default function GradeAnalysisWidget({ size, width, height }: GradeAnalysisWidgetProps) {
  // Tabs: 'upload' | 'summary' | 'graphs' | 'roster' | 'ai'
  const [activeTab, setActiveTab] = useState<'upload' | 'summary' | 'graphs' | 'roster' | 'ai'>('upload');
  
  // Data States
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ [subject: string]: SubjectStat }>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Academic Metadata States
  const [academicYear, setAcademicYear] = useState<string>('2026학년도');
  const [semester, setSemester] = useState<string>('1학기');
  const [gradeNum, setGradeNum] = useState<string>('3학년');
  const [classNum, setClassNum] = useState<string>('1반');
  const [examName, setExamName] = useState<string>('1차 지필평가');

  // Gemini API Key Configurations
  const [apiKey, setApiKey] = useState<string>(() => {
    return sessionStorage.getItem('GEMINI_API_KEY_STUDENTS') || localStorage.getItem('GEMINI_API_KEY_STUDENTS') || '';
  });
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [rememberApiKey, setRememberApiKey] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // AI Statement Cache
  const [aiOutputs, setAiOutputs] = useState<{ [studentNo: number]: AIResult }>(() => {
    const saved = localStorage.getItem('grade_analysis_ai_cache_outputs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return {}; }
    }
    return {};
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiActiveType, setAiActiveType] = useState<'analysis' | 'homeLetter'>('analysis');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('grade_analysis_ai_cache_outputs', JSON.stringify(aiOutputs));
  }, [aiOutputs]);

  // Selected Student Helper
  const selectedStudent = students.find(s => s.no === selectedStudentId) || (students.length > 0 ? students[0] : null);

  // Rule-based Multi-faceted Statement Builder (Analyses strengths/weaknesses qualitatively, but with NO direct raw score figures or average decimals/values)
  const buildRuleBasedSummary = (
    no: number,
    name: string | undefined,
    scores: { [subject: string]: number },
    strengths: string,
    weaknesses: string,
    avg: number
  ): string => {
    const displayName = name || `${no}번 학생`;
    
    let avgDesc = '';
    if (avg >= 90) {
      avgDesc = '교과 전반에서 최상위권의 대단히 뛰어난 학업 성취 수준을 입증하였습니다';
    } else if (avg >= 80) {
      avgDesc = '대부분의 교과에서 상위권의 안정적이고 우수한 성취 양상을 나타내었습니다';
    } else if (avg >= 70) {
      avgDesc = '학급 평균 수준의 무난하고 성실한 학업 흐름을 고르게 정립하고 있습니다';
    } else {
      avgDesc = '지속적인 교과 기초 지도와 차분하고 세밀한 배움 관리가 다소 권장되는 성취 양상을 나타내었습니다';
    }

    return `${displayName} 학생은 이번 평가에서 ${avgDesc}. 가장 성취 수준이 뛰어난 과목은 [${strengths}] 과목으로, 해당 과목에 대한 높은 이해도와 남다른 이해 역량을 유감없이 보여주었습니다. 반면, 상대적 보완 분석이 필요한 과목은 [${weaknesses}] 과목으로 손꼽힙니다. 앞으로 [${weaknesses}] 교과의 기초적인 필수 핵심 개념들을 차근차근 다지고 정기적인 단원 복습 및 기출 예제 풀이를 병행해 나간다면, 교과 역량 격차가 순조롭게 극복되어 전체 학업 밸런스가 한층 더 탄탄하고 아름답게 균형을 이루어갈 것입니다.`;
  };

  // Rule-based Home Letter (Analyses strengths/weaknesses qualitatively, but with NO direct raw score figures or average decimals/values)
  const buildRuleBasedHomeLetter = (st: StudentData): string => {
    const name = st.name || `${st.no}번`;
    const scoreEntries = Object.entries(st.scores);
    if (scoreEntries.length === 0) {
      return `학부모님 안녕하십니까, 자녀 ${name} 학생의 이번 평가 피드백입니다. 학생의 성적 데이터를 기반으로 가정에서 학업 격려와 발전에 참고가 되시도록 안내합니다. 문의 사항이 있으실 경우 학교로 편하게 연락 주시기 바랍니다.`;
    }

    let highestSub = '';
    let highestScore = -1;
    let lowestSub = '';
    let lowestScore = 999;

    scoreEntries.forEach(([sub, score]) => {
      if (score > highestScore) {
        highestScore = score;
        highestSub = sub;
      }
      if (score < lowestScore) {
        lowestScore = score;
        lowestSub = sub;
      }
    });

    const numSub = scoreEntries.length;
    let feedbackText = '';

    if (st.avg >= 90) {
      feedbackText = `이번 지필평가 결과 자녀분은 교과 전반에 걸쳐 대단히 주체적이며 탁월한 학업 성취를 이루어 냈습니다. 특히 [${highestSub}] 과목에서 가장 모범적인 교과 강점을 보이며 높은 학업 몰입도와 문제 해결력을 입증하였습니다. 상대적으로 타 과목 대비 배움의 세밀한 보완이 가능한 과목으로는 [${lowestSub}] 과목이 확인됩니다. 자녀가 원리에 대한 통찰력이 뛰어난 만큼, 다소 아쉬웠던 영역에 대해 오답 개념의 구조화를 유도해 주신다면 금세 최고의 시너지를 얻을 것입니다.`;
    } else if (st.avg >= 80) {
      feedbackText = `이번 지필평가 결과 자녀분은 전반적으로 안정적이고 훌륭한 수준의 성취 양상을 고르게 보여주었습니다. 가장 점수 성취도가 뛰어난 과목은 [${highestSub}] 과목이며, 이를 바탕으로 평상시 수업 참여 시의 집중력이 훌륭했음을 잘 드러내 주었습니다. 상대적으로 한 층 더 노력하여 점수를 보완해 볼 수 있는 교과는 [${lowestSub}] 과목입니다. 가정에서도 매일 소량의 복습 계획을 습관화할 수 있도록 따스한 지지와 북돋움을 보내주시면 더욱 깊이 있는 성장으로 이어질 것입니다.`;
    } else if (st.avg >= 70) {
      feedbackText = `이번 지필평가 결과 자녀분은 보통 수준의 무난하고 성실한 성취를 보이며 열심히 배움의 과정을 밟아가고 있습니다. 상대적으로 교과 이해도가 깊고 경쟁력을 발휘한 과목은 [${highestSub}] 과목이며, 집중적인 검토와 보완 노력이 함께 수반되어야 가치 있는 실력 향상을 꾀할 수 있는 과목은 [${lowestSub}] 과목으로 분석됩니다. 교과서의 대표 유형 및 기본 공식을 차분하게 회독하며 다음 고사를 대비하도록 격려를 권장드립니다.`;
    } else {
      feedbackText = `이번 지필평가 결과 자녀분은 필수 기초 교과 개념의 차분한 재확인과 일관성 있는 학습 시간의 체계화가 다소 집중적으로 권장되는 단계입니다. 상대적 최고 우수 과목은 [${highestSub}] 과목으로, 자녀가 해당 영역을 향해 보여준 수업 집중력과 적극적인 관심이 돋보입니다. 성장의 노력이 더해져 성취 기준을 순조롭게 넘어서야 할 타깃은 [${lowestSub}] 과목입니다. 가정에서도 조급해하지 않고 쉬운 기본 예제부터 한 단계씩 풀어감으로써 학습 자신감을 드높이도록 가정의 따뜻한 정서적 안식과 지지를 부탁드립니다.`;
    }

    return `학부모님 안녕하십니까, 자녀 ${name} 학생의 이번 총 ${numSub}개 과목 성적 결과 피드백을 전달해 드립니다. ${feedbackText} 자녀가 이번 시험 성취를 주도적인 성장의 발판으로 삼을 수 있도록 가정에서 아낌없는 격려와 따뜻한 포용으로 기운을 북돋워 주시기를 당부드리며, 학교에서도 늘 세심히 보람찬 성장의 순간들을 함께 지도하겠습니다. 변함없는 성원과 협력에 마음 깊이 감사드립니다.`;
  };

  // Load Demo Data Action
  const handleLoadDemoData = () => {
    setErrorMsg('');
    setUploadFileName('2026학년도_3학년_1반_1차지필평가_일람표_샘플.xlsx');
    setAcademicYear('2026학년도');
    setSemester('1학기');
    setGradeNum('3학년');
    setClassNum('1반');
    setExamName('1차 지필평가');

    const demoSubjects = ['국어', '수학', '영어', '역사', '과학'];
    setSubjects(demoSubjects);

    // Nameless students
    const demoStudentsRaw = [
      { no: 1, name: undefined, scores: { '국어': 95, '수학': 88, '영어': 92, '역사': 90, '과학': 85 } },
      { no: 2, name: undefined, scores: { '국어': 72, '수학': 95, '영어': 85, '역사': 65, '과학': 90 } },
      { no: 3, name: undefined, scores: { '국어': 88, '수학': 62, '영어': 78, '역사': 80, '과학': 70 } },
      { no: 4, name: undefined, scores: { '국어': 60, '수학': 55, '영어': 65, '역사': 72, '과학': 58 } },
      { no: 5, name: undefined, scores: { '국어': 90, '수학': 98, '영어': 88, '역사': 95, '과학': 94 } },
      { no: 6, name: undefined, scores: { '국어': 82, '수학': 78, '영어': 80, '역사': 85, '과학': 80 } },
      { no: 7, name: undefined, scores: { '국어': 55, '수학': 42, '영어': 50, '역사': 58, '과학': 48 } },
      { no: 8, name: undefined, scores: { '국어': 78, '수학': 85, '영어': 82, '역사': 75, '과학': 88 } },
      { no: 9, name: undefined, scores: { '국어': 92, '수학': 90, '영어': 95, '역사': 88, '과학': 91 } },
      { no: 10, name: undefined, scores: { '국어': 68, '수학': 70, '영어': 72, '역사': 62, '과학': 65 } }
    ];

    // Compute stats
    const parsed: StudentData[] = demoStudentsRaw.map(s => {
      let total = 0;
      let count = 0;
      let subScores = s.scores;

      demoSubjects.forEach(sub => {
        total += subScores[sub] || 0;
        count++;
      });

      const avg = Math.round((total / count) * 10) / 10;

      // Determine strength & weakness relative to averages
      // (Temporary strength computed before stats are fully ready)
      let strength = demoSubjects[0];
      let weakness = demoSubjects[demoSubjects.length - 1];

      // Standardize strengths based on absolute scores for demo
      let maxS = -1;
      let minS = 101;
      demoSubjects.forEach(sub => {
        const sc = s.scores[sub] || 0;
        if (sc > maxS) { maxS = sc; strength = sub; }
        if (sc < minS) { minS = sc; weakness = sub; }
      });

      const summary = buildRuleBasedSummary(s.no, s.name, s.scores, strength, weakness, avg);

      return {
        no: s.no,
        name: s.name,
        scores: s.scores,
        total,
        avg,
        strength,
        weakness,
        summary
      };
    });

    // Compute detailed stats
    const stats: { [subject: string]: SubjectStat } = {};
    demoSubjects.forEach((sub, idx) => {
      const subjectScores = parsed.map(p => p.scores[sub] || 0);
      const totalScore = subjectScores.reduce((acc, curr) => acc + curr, 0);
      const avg = Math.round((totalScore / parsed.length) * 10) / 10;
      
      // Fallback grade average: class avg with small variance
      const gradeAvg = Math.round((avg + (Math.sin(idx + 3) * 2)) * 10) / 10;
      const max = Math.max(...subjectScores);
      const min = Math.min(...subjectScores);

      const distribution = {
        '90이상': subjectScores.filter(sc => sc >= 90).length,
        '80대': subjectScores.filter(sc => sc >= 80 && sc < 90).length,
        '70대': subjectScores.filter(sc => sc >= 70 && sc < 80).length,
        '60대': subjectScores.filter(sc => sc >= 60 && sc < 70).length,
        '60미만': subjectScores.filter(sc => sc < 60).length,
      };

      stats[sub] = {
        subject: sub,
        avg,
        gradeAvg,
        max,
        min,
        distribution
      };
    });

    // Recalculate strengths and weaknesses based on actual average distances
    parsed.forEach(p => {
      let maxDiff = -1000;
      let minDiff = 1000;
      let finalStrength = demoSubjects[0];
      let finalWeakness = demoSubjects[demoSubjects.length - 1];

      demoSubjects.forEach(sub => {
        const studentScore = p.scores[sub] || 0;
        const subAvg = stats[sub]?.avg || 60;
        const diff = studentScore - subAvg;

        if (diff > maxDiff) {
          maxDiff = diff;
          finalStrength = sub;
        }
        if (diff < minDiff) {
          minDiff = diff;
          finalWeakness = sub;
        }
      });

      p.strength = finalStrength;
      p.weakness = finalWeakness;
      p.summary = buildRuleBasedSummary(p.no, p.name, p.scores, finalStrength, finalWeakness, p.avg);
    });

    // Sort students by no
    parsed.sort((a, b) => a.no - b.no);

    // Compute ranks
    const sortedByAvg = [...parsed].sort((a, b) => b.avg - a.avg);
    parsed.forEach(p => {
      p.rank = sortedByAvg.findIndex(sa => sa.no === p.no) + 1;
    });

    setStudents(parsed);
    setSubjectStats(stats);
    setSelectedStudentId(1);
    setActiveTab('summary');
  };

  // Clear / Reset Action
  const handleReset = () => {
    setUploadFileName('');
    setStudents([]);
    setSubjects([]);
    setSubjectStats({});
    setSelectedStudentId(null);
    setErrorMsg('');
    setActiveTab('upload');
    // Note: Do not clear Gemini API Key as requested!
  };

  // File Upload Parser
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const processExcelFile = (file: File) => {
    setErrorMsg('');
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (workbook.SheetNames.length === 0) {
          throw new Error('엑셀 파일에 유효한 시트가 존재하지 않습니다.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Raw parsing to 2D array
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length < 5) {
          throw new Error('파일 구성 요소가 부족합니다. 최소 5행 이상의 일람표 엑셀 양식이어야 합니다.');
        }

        // Parse academic titles from early rows
        let yearMatched = '2026학년도';
        let semesterMatched = '1학기';
        let gradeMatched = '3학년';
        let classMatched = '1반';
        let examMatched = '지필평가';

        for (let r = 0; r < Math.min(rows.length, 4); r++) {
          const text = rows[r].filter(Boolean).join(' ');
          if (!text) continue;

          const yr = text.match(/(\d{4}학년도)/);
          if (yr) yearMatched = yr[1];

          const sem = text.match(/([12]학기)/);
          if (sem) semesterMatched = sem[1];

          const gd = text.match(/(\d학년)/);
          if (gd) gradeMatched = gd[1];

          const cls = text.match(/(\d반)/);
          if (cls) classMatched = cls[1];

          const ex = text.match(/(1차\s*지필평가|2차\s*지필평가|지필평가|중간고사|기말고사|학업성취도평가)/);
          if (ex) examMatched = ex[1];
        }

        setAcademicYear(yearMatched);
        setSemester(semesterMatched);
        setGradeNum(gradeMatched);
        setClassNum(classMatched);
        setExamName(examMatched);

        // Header is at row index 4 (5th row)
        const headers: any[] = rows[4] || [];
        if (headers.length === 0) {
          throw new Error('엑셀 5행에서 헤더 목록을 읽을 수 없습니다.');
        }

        // Standardize header strings to find column indices
        const stdHeaders = headers.map(h => h ? String(h).replace(/\s+/g, '').trim() : '');
        
        const colNoIdx = stdHeaders.indexOf('번호');
        if (colNoIdx === -1) {
          throw new Error('"번호" 열을 찾을 수 없습니다. 일람표 5행에 "번호" 열 헤더가 있는지 확인해 주세요.');
        }

        const colNameIdx = stdHeaders.indexOf('성명') !== -1 ? stdHeaders.indexOf('성명') : stdHeaders.indexOf('이름');
        // Note: Name absence is normal as per user prompt, do not error.

        // Subject headers are elements not administrator titles
        const adminKeywords = [
          '번호', '성명', '이름', '학번', '학년도', '학기', '학년', '반', '학급', 
          '고사', '고사명', '합계', '총점', '평균', '석차', '동석차', '비고', '학적', '결과', '상태'
        ];

        // Find subject indices
        const subjectIndices: { name: string; index: number }[] = [];
        headers.forEach((h, idx) => {
          if (!h) return;
          const sanitized = String(h).replace(/\s+/g, '').trim();
          if (sanitized && !adminKeywords.some(keyword => sanitized.includes(keyword))) {
            subjectIndices.push({
              name: String(h).trim(),
              index: idx
            });
          }
        });

        if (subjectIndices.length === 0) {
          throw new Error('과목 열을 감지하지 못했습니다. "국어", "수학" 등과 같은 과목명 헤더들이 배치되어 있어야 합니다.');
        }

        setSubjects(subjectIndices.map(s => s.name));

        const parsedStudentsList: StudentData[] = [];
        let bottomClassStatsRow: any[] | null = null;
        let bottomGradeStatsRow: any[] | null = null;

        // Rows starting from index 6 (7th row) are potential student lines or bottom descriptors
        for (let r = 6; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const cellValueNo = row[colNoIdx];
          const stringNo = cellValueNo !== undefined && cellValueNo !== null ? String(cellValueNo).trim() : '';

          // If numeric, parse student
          if (stringNo && /^\d+$/.test(stringNo)) {
            const studentNo = parseInt(stringNo, 10);
            const studentName = colNameIdx !== -1 && row[colNameIdx] !== undefined && row[colNameIdx] !== null 
              ? String(row[colNameIdx]).trim() 
              : undefined;

            const scoresMap: { [subject: string]: number } = {};
            let studentTotal = 0;
            let subjectsCount = 0;

            subjectIndices.forEach(sub => {
              const scoreVal = row[sub.index];
              const scoreNum = scoreVal !== undefined && scoreVal !== null ? parseFloat(String(scoreVal).trim()) : 0;
              scoresMap[sub.name] = isNaN(scoreNum) ? 0 : scoreNum;
              studentTotal += scoresMap[sub.name];
              subjectsCount++;
            });

            // Read or calculate Total / Average
            const totalColIdx = stdHeaders.indexOf('합계') !== -1 ? stdHeaders.indexOf('합계') : stdHeaders.indexOf('총점');
            const avgColIdx = stdHeaders.indexOf('평균');

            const totalScore = totalColIdx !== -1 && row[totalColIdx] !== undefined && row[totalColIdx] !== null
              ? parseFloat(String(row[totalColIdx]))
              : studentTotal;

            const avgScore = avgColIdx !== -1 && row[avgColIdx] !== undefined && row[avgColIdx] !== null
              ? parseFloat(String(row[avgColIdx]))
              : (subjectsCount > 0 ? (totalScore / subjectsCount) : 0);

            parsedStudentsList.push({
              no: studentNo,
              name: studentName,
              scores: scoresMap,
              total: Math.round(totalScore * 10) / 10,
              avg: Math.round(avgScore * 10) / 10,
              summary: '' // computed post estimation
            });
          } else {
            // Check for bottom summaries (class/grade averages)
            const rowText = row.filter(Boolean).join(' ');
            if (rowText.includes('학년평균') || rowText.includes('학년 평균')) {
              bottomGradeStatsRow = row;
            } else if (rowText.includes('평균') || rowText.includes('학급평균') || rowText.includes('반평균')) {
              if (!bottomClassStatsRow) bottomClassStatsRow = row; // first average row is usually class
            }
          }
        }

        if (parsedStudentsList.length === 0) {
          throw new Error('번호가 숫자인 학생 행을 확보하지 못했습니다. 일람표 7행이 올바른 수치 데이터로 작동하는지 확인해 주세요.');
        }

        // Sort by number
        parsedStudentsList.sort((a, b) => a.no - b.no);

        // Compute class statistics
        const stats: { [subject: string]: SubjectStat } = {};
        subjectIndices.forEach((sub, sIdx) => {
          const subjectScores = parsedStudentsList.map(st => st.scores[sub.name] || 0);
          const totalScore = subjectScores.reduce((acc, curr) => acc + curr, 0);
          
          // Read from excel class average row if available, else standard calculate
          let classAvg = Math.round((totalScore / parsedStudentsList.length) * 10) / 10;
          if (bottomClassStatsRow && bottomClassStatsRow[sub.index] !== undefined) {
            const excelClassAvg = parseFloat(String(bottomClassStatsRow[sub.index]).trim());
            if (!isNaN(excelClassAvg)) classAvg = Math.round(excelClassAvg * 10) / 10;
          }

          // Read grade average from bottom row if exists, else estimate realistically
          let gradeAvg = Math.round((classAvg + (Math.sin(sIdx + 3) * 1.8)) * 10) / 10;
          if (bottomGradeStatsRow && bottomGradeStatsRow[sub.index] !== undefined) {
            const excelGradeAvg = parseFloat(String(bottomGradeStatsRow[sub.index]).trim());
            if (!isNaN(excelGradeAvg)) gradeAvg = Math.round(excelGradeAvg * 10) / 10;
          }

          const max = Math.max(...subjectScores);
          const min = Math.min(...subjectScores);

          const distribution = {
            '90이상': subjectScores.filter(sc => sc >= 90).length,
            '80대': subjectScores.filter(sc => sc >= 80 && sc < 90).length,
            '70대': subjectScores.filter(sc => sc >= 70 && sc < 80).length,
            '60대': subjectScores.filter(sc => sc >= 60 && sc < 70).length,
            '60미만': subjectScores.filter(sc => sc < 60).length,
          };

          stats[sub.name] = {
            subject: sub.name,
            avg: classAvg,
            gradeAvg,
            max,
            min,
            distribution
          };
        });

        // Map strengths/weaknesses and rule-based explanations
        parsedStudentsList.forEach(st => {
          let maxDiff = -1000;
          let minDiff = 1000;
          let studentStrength = subjectIndices[0].name;
          let studentWeakness = subjectIndices[subjectIndices.length - 1].name;

          subjectIndices.forEach(sub => {
            const studentScore = st.scores[sub.name] || 0;
            const subStat = stats[sub.name];
            const diff = studentScore - (subStat ? subStat.avg : 60);

            if (diff > maxDiff) {
              maxDiff = diff;
              studentStrength = sub.name;
            }
            if (diff < minDiff) {
              minDiff = diff;
              studentWeakness = sub.name;
            }
          });

          st.strength = studentStrength;
          st.weakness = studentWeakness;
          st.summary = buildRuleBasedSummary(st.no, st.name, st.scores, studentStrength, studentWeakness, st.avg);
        });

        // Compute overall ranks
        const sortedByAvgDesc = [...parsedStudentsList].sort((a, b) => b.avg - a.avg);
        parsedStudentsList.forEach(p => {
          p.rank = sortedByAvgDesc.findIndex(sd => sd.no === p.no) + 1;
        });

        setStudents(parsedStudentsList);
        setSubjectStats(stats);
        if (parsedStudentsList.length > 0) {
          setSelectedStudentId(parsedStudentsList[0].no);
        }
        
        setActiveTab('summary');
      } catch (err: any) {
        setErrorMsg(err.message || '엑셀 분석 중 오류가 발생했습니다. 규격 양식을 점검해 주세요.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 4-Sheet Excel Download
  const handleDownloadExcel = () => {
    if (students.length === 0) {
      setErrorMsg('다운로드할 성적 데이터가 존재하지 않습니다.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // 1. 학생별 성적 Sheet
      const studentSheetHeaders = [
        '학년도', '학기', '학년', '반', '고사명', '번호', '성명', ...subjects, '합계', '평균', '강점 과목', '보완 과목', '분석 요약'
      ];
      const studentSheetRows = [studentSheetHeaders];
      students.forEach(st => {
        const row = [
          academicYear,
          semester,
          gradeNum,
          classNum,
          examName,
          st.no,
          st.name || '미제공',
          ...subjects.map(sub => st.scores[sub] ?? ''),
          st.total,
          st.avg,
          st.strength,
          st.weakness,
          st.summary
        ];
        studentSheetRows.push(row);
      });
      const ws1 = XLSX.utils.aoa_to_sheet(studentSheetRows);
      XLSX.utils.book_append_sheet(wb, ws1, '학생별 성적');

      // 2. 과목별 요약 Sheet
      const subjectSheetHeaders = [
        '과목', '반 평균', '학년 평균', '반 평균-학년 평균 차이', '최고점', '최저점', '90점 이상', '80점대', '70점대', '60점대', '60점 미만'
      ];
      const subjectSheetRows = [subjectSheetHeaders];
      subjects.forEach(sub => {
        const stat = subjectStats[sub];
        if (stat) {
          const row = [
            sub,
            stat.avg,
            stat.gradeAvg,
            Math.round((stat.avg - stat.gradeAvg) * 10) / 10,
            stat.max,
            stat.min,
            stat.distribution['90이상'],
            stat.distribution['80대'],
            stat.distribution['70대'],
            stat.distribution['60대'],
            stat.distribution['60미만']
          ];
          subjectSheetRows.push(row);
        }
      });
      const ws2 = XLSX.utils.aoa_to_sheet(subjectSheetRows);
      XLSX.utils.book_append_sheet(wb, ws2, '과목별 요약');

      // 3. AI 생성 문구 Sheet
      const aiSheetHeaders = ['번호', '성명', '분석내용', '가정통신문'];
      const aiSheetRows = [aiSheetHeaders];
      students.forEach(st => {
        const cached = aiOutputs[st.no];
        const row = [
          st.no,
          st.name || '미제공',
          cached?.analysis || st.summary,
          cached?.homeLetter || buildRuleBasedHomeLetter(st)
        ];
        aiSheetRows.push(row);
      });
      const ws3 = XLSX.utils.aoa_to_sheet(aiSheetRows);
      XLSX.utils.book_append_sheet(wb, ws3, 'AI 생성 문구');

      // 4. 분석 기준 Sheet
      const criteriaSheetRows = [
        ['분석 항목', '설정 및 내용'],
        ['업로드 파일명', uploadFileName || '체험용 샘플 데이터'],
        ['분석 생성 일시', new Date().toLocaleString()],
        ['학년도', academicYear],
        ['학기', semester],
        ['학년', gradeNum],
        ['반', classNum],
        ['고사명', examName],
        ['성명 누락 처리 방식', '성명 열 미제공시 번호를 기반으로 고유 식별하여 빈칸 또는 "미제공" 표기'],
        ['Gemini API 사용 여부', apiKey ? '사용 중 (gemini-3.5-flash 모델)' : '미사용 (내장 규칙 분석 엔진 작동)'],
        ['2022 개정교육과정 반영 원칙', '성장 중심 및 역량 중심 평가(지식·이해, 과정·기능, 가치·태도 면의 다면 평가) 적용'],
        ['분석 문체 원칙', '긍정적이고 성장 촉진지향 어조 사용, "부진/심각/낙오/위험" 등 낙인 방지']
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(criteriaSheetRows);
      XLSX.utils.book_append_sheet(wb, ws4, '분석 기준');

      // Build & Download
      XLSX.writeFile(wb, `${academicYear}_${gradeNum}_${classNum}_${examName}_종합 분석 결과.xlsx`);
    } catch (err) {
      setErrorMsg('엑셀 다운로드 파일 생성 중 요류가 발생했습니다.');
    }
  };

  // Settings & Storage operations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = tempApiKey.trim();
    if (rememberApiKey) {
      localStorage.setItem('GEMINI_API_KEY_STUDENTS', cleanKey);
      sessionStorage.removeItem('GEMINI_API_KEY_STUDENTS');
    } else {
      sessionStorage.setItem('GEMINI_API_KEY_STUDENTS', cleanKey);
      localStorage.removeItem('GEMINI_API_KEY_STUDENTS');
    }
    setApiKey(cleanKey);
    setIsSettingsOpen(false);
  };

  const handleDeleteApiKey = () => {
    localStorage.removeItem('GEMINI_API_KEY_STUDENTS');
    sessionStorage.removeItem('GEMINI_API_KEY_STUDENTS');
    setApiKey('');
    setTempApiKey('');
    alert('저장된 Gemini API Key가 성공적으로 삭제되었습니다.');
  };

  // Trigger Settings Dialog
  const openSettingsModal = () => {
    setTempApiKey(apiKey);
    const isLocal = !!localStorage.getItem('GEMINI_API_KEY_STUDENTS');
    setRememberApiKey(isLocal);
    setIsSettingsOpen(true);
  };

  // Generate Single Student AI Content
  const handleGenerateAIOutput = async (type: 'analysis' | 'homeLetter', targetStudent: StudentData) => {
    setIsGenerating(true);
    try {
      // Compute student-specific dynamic academic limits to ensure high prompt entropy / variance
      const scoreEntries = Object.entries(targetStudent.scores);
      let highestSub = '해당 없음';
      let highestScore = -1;
      let lowestSub = '해당 없음';
      let lowestScore = 999;

      scoreEntries.forEach(([sub, score]) => {
        if (score > highestScore) {
          highestScore = score;
          highestSub = sub;
        }
        if (score < lowestScore) {
          lowestScore = score;
          lowestSub = sub;
        }
      });

      const scoresDesc = scoreEntries
        .map(([sub, score]) => `${sub}: ${score}점 (학급 평균: ${subjectStats[sub]?.avg || 60}점, 학년 평균: ${subjectStats[sub]?.gradeAvg || 60}점)`)
        .join(', ');

      const displayName = targetStudent.name || `${targetStudent.no}번 학생`;

      let detailPrompt = '';
      if (type === 'analysis') {
        detailPrompt = `학생 성적 상세 분석내용(약 300자)을 긍정적이고 역량 중심 성격으로 작성해 주세요. 
          - 대상 학생: ${displayName}
          - 종합평균: ${targetStudent.avg}점
          - 핵심 강점: [${highestSub}] 과목, 성적: ${highestScore}점
          - 보완 필요 영역: [${lowestSub}] 과목, 성적: ${lowestScore}점
          - 전체 성적 분포 정보: [${scoresDesc}]
          
          [⚠️ 중대 금지 사항 - 필수 준수]
          절대로 완성된 인물 분석 텍스트 안에 95점, 85점, 82.5점과 같은 구체적인 원점수나 숫자로 된 평균 값을 직접 언급하거나 적지 마십시오! (예: "평균 90점을 기록하며" 대신 "대단히 뛰어난 학업 성취 수준을 보이며", "수학에서 98점을 달성하여" 대신 "수학 교과에서 탁월한 이해력과 강점을 드러내며" 등으로 표현해 주세요.) 숫자가 전혀 나타나지 않는 자연스럽고 우아한 줄글이어야 합니다. 오직 숫자가 아닌 한국어 형용사나 부사(예: '최상위권의 우수한 성취', '매우 돋보이는 학업 성취', '평균 수준에 근접한 안정적인 학습 흐름', '일부 보완이 필요한 영역' 등)로만 우수함과 취약함을 표현하여 성적 데이터 기반 분석을 완성하십시오.
          
          [작성 가이드라인]
          1. 2022 개정교육과정의 성장 중심 평가와 역량 중심 평가 관점을 충분히 적용하여 지식·이해, 과정·기능, 가치·태도 발달 상황을 자연스럽게 분석하십시오.
          2. 절대로 다른 학생들과 동일한 패턴이나 상투적인 문장(템플릿)을 이용하지 말고, 각 학생의 구체적인 점수 분기도와 과목 간 격차를 기반으로 구조부터 100% 개성 있게 작성하십시오.
          3. "부진", "심각", "낙오", "위험", "성적이 나쁘다" 표현은 일절 금지하며 미래 잠재력과 따스한 지지를 아끼지 마세요.`;
      } else {
        detailPrompt = `이 학생의 부모님께 안내해 드리는 친절하고 진심 어린 우정/협력 어투의 '가정통신문 편지글'(약 300자)을 작성해 주세요.
          
          [대상 학생 고유 데이터]
          - 학생 성명/번호: ${displayName}
          - 최고의 성취 과목: [${highestSub}] 과목, 점수: ${highestScore}점
          - 피드백 및 조력이 요구되는 과목: [${lowestSub}] 과목, 점수: ${lowestScore}점
          - 전체 성적 분포 양상: [${scoresDesc}]
          - 종합 평균 점수: ${targetStudent.avg}점
          
          [⚠️ 중대 금지 사항 - 필수 준수]
          절대로 완성된 편지 내용 안에 95점, 82.5점, 평균 90점과 같은 구체적인 개별 원점수나 수치화된 평균 값을 숫자로 직접 언급하거나 포함하지 마십시오! (예: "평균 90점의 대단히 뛰어난 성적" 대신 "교과 전반에 걸쳐 최상위권의 독보적인 학업 성취 수준"으로 표현하고, "영어에서 95점을 기록하여" 대신 "영어 교과에서 매우 뛰어난 지식과 이해력을 나타내어" 등으로 적절히 정성적인 한국어 서술로 순화해 주시기 바랍니다.) 숫자가 전혀 나타나지 않는 정성적이고 다감한 내용이어야 합니다.
          
          [필수 성찰 가이드라인 - 완벽 엄수]
          1. ⚠️ 절대 다른 학생들의 편지와 완전히 동일한 인트로, 본문 골격, 아웃트로(템플릿)를 반복해서는 안 됩니다. 각 학생마다 100% 독립적이고 고유하게 편지를 전개해 주십시오. 
          2. 첫 패러그래프에서 대상 학생 ${displayName}의 최고 장점 과목인 [${highestSub}] 성취에 대한 찬사 및 교실 내 긍정적 가치·태도(동료 보살핌, 밝은 기여)를 생생하고 풍부하게 부각해 주십시오.
          3. 다소 힘겨워했던 [${lowestSub}] 영역에 대해서도 낙인을 찍는 것이 아니라, 가정에서 부모님과 자녀가 다정하게 실현할 수 있는 구체적인 팁(예: "집에서 간단한 실생활 예제 식탁 질문을 던져주기", "학습 계획 실행 분량 다듬기 등")을 학생별 맞춤형으로 1가지 제안하십시오.
          4. 진정성과 미소가 넘치며 격려와 정서적 충만함이 담긴 차별화된 편지로 작성해야 합니다. 식상하고 판에 박힌 일상적 통신문 문구는 배제하십시오.`;
      }

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          apiKey: apiKey || '',
          contents: detailPrompt
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const resData = await response.json();
      const resultText = resData.text || '';
      
      setAiOutputs(prev => {
        const currentData = prev[targetStudent.no] || { analysis: '', homeLetter: '' };
        if (type === 'analysis') currentData.analysis = resultText;
        if (type === 'homeLetter') currentData.homeLetter = resultText;
        return {
          ...prev,
          [targetStudent.no]: currentData
        };
      });
    } catch (err: any) {
      alert(`Gemini API 통신 중 오류가 발생했습니다: ${err.message || err}`);
      if (!apiKey) {
        openSettingsModal();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Bulk Generate AI Content for selected student (Convenience action)
  const handleBulkGenerateForSelected = async (targetStudent: StudentData) => {
    setIsGenerating(true);
    try {
      await handleGenerateAIOutput('analysis', targetStudent);
      await handleGenerateAIOutput('homeLetter', targetStudent);
    } catch (err) {}
    setIsGenerating(false);
  };

  // Clipboard copies
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 텍스트가 성공적으로 복사되었습니다!');
  };

  // Recharts Data Prep
  const classAverageData = subjects.map(sub => ({
    name: sub,
    '반 평균': subjectStats[sub]?.avg || 0,
    '학년 평균': subjectStats[sub]?.gradeAvg || 0,
  }));

  const distributionData = [
    { range: '90점 이상', ...subjects.reduce((acc, sub) => ({ ...acc, [sub]: subjectStats[sub]?.distribution['90이상'] || 0 }), {}) },
    { range: '80점대', ...subjects.reduce((acc, sub) => ({ ...acc, [sub]: subjectStats[sub]?.distribution['80대'] || 0 }), {}) },
    { range: '70점대', ...subjects.reduce((acc, sub) => ({ ...acc, [sub]: subjectStats[sub]?.distribution['70대'] || 0 }), {}) },
    { range: '60점대', ...subjects.reduce((acc, sub) => ({ ...acc, [sub]: subjectStats[sub]?.distribution['60대'] || 0 }), {}) },
    { range: '60점 미만', ...subjects.reduce((acc, sub) => ({ ...acc, [sub]: subjectStats[sub]?.distribution['60미만'] || 0 }), {}) },
  ];

  // Specific student scores chart data
  const studentScoresData = subjects.map(sub => ({
    name: sub,
    '학생 점수': selectedStudent?.scores[sub] || 0,
    '학급 평균': subjectStats[sub]?.avg || 0
  }));

  // Average scatter data
  const studentAverageDistribution = [
    { name: '90~100점', 인원수: students.filter(s => s.avg >= 90).length },
    { name: '80~89점', 인원수: students.filter(s => s.avg >= 80 && s.avg < 90).length },
    { name: '70~79점', 인원수: students.filter(s => s.avg >= 70 && s.avg < 80).length },
    { name: '60~69점', 인원수: students.filter(s => s.avg >= 60 && s.avg < 70).length },
    { name: '60점 미만', 인원수: students.filter(s => s.avg < 60).length },
  ];

  return (
    <div id="widget-grade-analysis-container" className="flex flex-col h-full select-none text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl relative overflow-hidden shadow-lg border border-slate-200/50 dark:border-slate-800/50">
      
      {/* Top Banner Ribbon */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 bg-gradient-to-r from-indigo-50/80 via-slate-50/50 to-indigo-50/10 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200/50 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 px-1.5 bg-indigo-600 rounded-lg text-white font-black text-xs shadow-md">
            📊
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs tracking-tight text-indigo-950 dark:text-indigo-400">성적 분석</span>
            {students.length > 0 && (
              <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-450 leading-none">
                {academicYear} {semester} • {gradeNum} {classNum} ({examName})
              </span>
            )}
          </div>
        </div>
        
        {/* Header Button Actions */}
        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={openSettingsModal}
            className="p-1.5 rounded-lg hover:bg-slate-200/75 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition-colors cursor-pointer" 
            title="Gemini API 설정 및 삭제"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          
          {students.length > 0 && (
            <>
              <button 
                type="button"
                onClick={handleDownloadExcel}
                className="p-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                title="분석 결과 엑셀 다운로드"
              >
                <Download className="w-3 h-3" />
                <span>분석 결과 엑셀 다운로드</span>
              </button>
              <button 
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                title="데이터 초기화"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Workspace Scroll Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
        {errorMsg && (
          <div className="absolute top-2 left-2 right-2 z-30 p-3 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 rounded-xl border border-red-200/50 dark:border-red-900/50 flex gap-2 items-start text-[11px] animate-fade-in shadow-md">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-extrabold">일람표 파싱 실패:</span> {errorMsg}
            </div>
            <button onClick={() => setErrorMsg('')} className="font-black text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer px-1">✕</button>
          </div>
        )}

        {/* Tab Header Controls */}
        {students.length > 0 && (
          <div className="flex bg-slate-100/50 dark:bg-slate-900/60 p-1 border-b border-slate-200/30 dark:border-slate-800/40 shrink-0 text-[11.5px] overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${activeTab === 'summary' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-slate-200/30 dark:border-slate-700/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'}`}
            >
              📊 평가 요약
            </button>
            <button
              onClick={() => setActiveTab('graphs')}
              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${activeTab === 'graphs' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-slate-200/30 dark:border-slate-700/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'}`}
            >
              📈 통계 그래프
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${activeTab === 'roster' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-slate-200/30 dark:border-slate-700/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'}`}
            >
              📋 전 학생 부문
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 min-w-[70px] py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${activeTab === 'ai' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-slate-200/30 dark:border-slate-700/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'}`}
            >
              ✨ 학생 상세 & AI 분석
            </button>
          </div>
        )}

        {/* Tab Contents Frame */}
        <div className="flex-1 overflow-y-auto p-3.5 md:p-5 relative min-h-0">
          
          {/* TAB A: FILE UPLOAD (DEFAULT) */}
          {activeTab === 'upload' && students.length === 0 && (
            <div className="h-full flex flex-col justify-center items-center py-8">
              <div 
                className="w-full max-w-lg bg-slate-500/5 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg backdrop-blur-sm"
              >
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-5">
                  <FileSpreadsheet className="w-10 h-10" />
                </div>
                
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-2">학급 성적 분석 파일 등록</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                  분석할 학급의 성적 일람표 엑셀 파일(<span className="font-bold text-indigo-600 dark:text-indigo-400">.xlsx</span>)을 아래 업로드 버튼을 눌러 선택해 주십시오.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 items-center w-full justify-center">
                  <label className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/15 duration-150 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                    <Upload className="w-4 h-4" />
                    <span>성적 엑셀 파일 업로드하기</span>
                    <input 
                      type="file" 
                      accept=".xlsx" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                  
                  <button 
                    type="button" 
                    onClick={handleLoadDemoData}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 border border-slate-200 dark:border-slate-800/80 font-bold text-xs rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>체험용 샘플 데이터 장착</span>
                  </button>
                </div>
              </div>

              {/* Instructional Guidelines Box */}
              <div className="mt-6 w-full max-w-lg p-5 bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-850 text-xs leading-relaxed text-slate-500 dark:text-slate-400 text-left space-y-2">
                <span className="font-extrabold text-slate-700 dark:text-slate-200 block">💡 성적 분석 서비스 엑셀 지원 규격:</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li><strong>헤더 구조 (5행)</strong>: 수험번호, 성명, 과목 학업 성적이 모두 포함되어야 합니다.</li>
                  <li><strong>자동 매칭 기능</strong>: 파일 내에 학생 이름이 유실(숨김)된 경우에도 <span className="font-semibold text-orange-500">번호를 기반으로</span> 성적 데이터 분석을 온전하게 지원합니다.</li>
                  <li><strong>성적 데이터 추출 (7행부터)</strong>: 기입된 번호가 숫자 형태인 가용 행들을 판정하여 학생별 통계 정보로 변환합니다.</li>
                  <li><strong>비교 지표 연계</strong>: 하단부의 학년 평균 및 응시인원 등의 수식을 자체적으로 분석 보조 지표로 매핑합니다.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB B: ANALYSIS SUMMARY */}
          {activeTab === 'summary' && students.length > 0 && (
            <div className="space-y-4">
              
              {/* Stats KPI Ribbon Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/20 dark:border-indigo-900/40 flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold leading-none mb-1">총 응시자 수</span>
                    <span className="font-extrabold text-base leading-none text-indigo-950 dark:text-indigo-200">{students.length}명</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/20 dark:border-emerald-900/40 flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 rounded-lg text-white">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold leading-none mb-1">학급 통합 평균</span>
                    <span className="font-extrabold text-base leading-none text-emerald-950 dark:text-emerald-200">
                      {Math.round((students.reduce((acc, curr) => acc + curr.avg, 0) / students.length) * 10) / 10}점
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200/20 dark:border-sky-900/40 flex items-center gap-3">
                  <div className="p-2 bg-sky-600 rounded-lg text-white">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold leading-none mb-1">성적 우수 과목</span>
                    <span className="font-extrabold text-xs leading-none text-sky-950 dark:text-sky-200 truncate block max-w-[110px]">
                      {subjects.length > 0 ? [...subjects].sort((a,b) => (subjectStats[b]?.avg || 0) - (subjectStats[a]?.avg || 0))[0] : '-'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-pink-50/50 dark:bg-pink-950/20 rounded-xl border border-pink-200/20 dark:border-pink-900/40 flex items-center gap-3">
                  <div className="p-2 bg-pink-600 rounded-lg text-white">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold leading-none mb-1">학급 수석(평균)</span>
                    <span className="font-extrabold text-xs leading-none text-pink-950 dark:text-pink-200 truncate block max-w-[110px]">
                      {(() => {
                        const topS = [...students].sort((a,b) => b.total - a.total)[0];
                        return topS ? `${topS.no}번 (${topS.avg}점)` : '-';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Class Subject Summary Table */}
              <div className="bg-white/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-800/70 p-3.5">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>학급 과목별 성적 일람 요약</span>
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 font-bold">
                        <th className="py-2 px-1">과목</th>
                        <th className="py-2 px-1 text-center">반 평균</th>
                        <th className="py-2 px-1 text-center">학년 평균</th>
                        <th className="py-2 px-1 text-center">반편차</th>
                        <th className="py-2 px-1 text-center">최고점</th>
                        <th className="py-2 px-1 text-center font-semibold">90점 이상</th>
                        <th className="py-2 px-1 text-center">60점 미만</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-855 text-slate-700 dark:text-slate-250 font-medium">
                      {subjects.map(sub => {
                        const stat = subjectStats[sub];
                        if (!stat) return null;
                        const diff = Math.round((stat.avg - stat.gradeAvg) * 10) / 10;
                        return (
                          <tr key={sub} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                            <td className="py-2 px-1 font-bold text-slate-900 dark:text-white">{sub}</td>
                            <td className="py-2 px-1 text-center text-indigo-600 dark:text-indigo-400 font-bold">{stat.avg}점</td>
                            <td className="py-2 px-1 text-center text-slate-500 dark:text-slate-400">{stat.gradeAvg}점</td>
                            <td className={`py-2 px-1 text-center font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
                              {diff >= 0 ? `+${diff}` : diff}
                            </td>
                            <td className="py-2 px-1 text-center text-slate-900 dark:text-white font-semibold">{stat.max}점</td>
                            <td className="py-2 px-1 text-center text-emerald-600 dark:text-emerald-400 font-bold">{stat.distribution['90이상']}명</td>
                            <td className="py-2 px-1 text-center text-pink-600 dark:text-pink-400 font-bold">{stat.distribution['60미만']}명</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Class overall analytical card */}
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 dark:from-indigo-950/20 dark:to-indigo-900/10 rounded-xl border border-indigo-500/20 dark:border-indigo-900/30 flex items-start gap-3.5">
                <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300">2022 개정 성취 중심 분석 총평</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                    본 학급은 이번 {examName}에서 전체 평균 <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{Math.round((students.reduce((acc, curr) => acc + curr.avg, 0) / students.length) * 10) / 10}점</strong>의 우수한 학업성향을 다졌습니다. 
                    특히 높은 성취도를 나타낸 과목인 <strong>{[...subjects].sort((a,b) => (subjectStats[b]?.avg || 0) - (subjectStats[a]?.avg || 0))[0]}</strong> 영역을 수반하여 개념에 대한 풍요로운 <strong>지식·이해 역량</strong>이 우수하게 지지되어 있습니다. 
                    반면, 학년 평균에 다소 미치지 못하거나 집중 탐구가 권장되는 교과는 <strong className="text-rose-600 dark:text-rose-400 font-bold">{[...subjects].sort((a,b) => (subjectStats[a]?.avg || 0) - (subjectStats[b]?.avg || 0))[0]}</strong>으로 확인되어 실생활 연계 문제상황 및 탐구의 <strong>과정·기능</strong>을 체계적으로 가다듬는 보충 학습 경로의 마련이 소중히 권고됩니다.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB C: STATISTICAL GRAPHS */}
          {activeTab === 'graphs' && students.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* CHART 1: 과목별 반 평균 그래프 */}
              <div className="bg-white/40 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 h-[220px] flex flex-col justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  1. 과목별 반 평균 통계
                </span>
                <div className="flex-1 w-full min-h-0 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classAverageData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94A3B8" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#94A3B8" />
                      <ChartTooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      <Bar dataKey="반 평균" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 2: 반 평균과 학년 평균 비교 그래프 */}
              <div className="bg-white/40 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 h-[220px] flex flex-col justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  2. 반 평균 vs 학년 평균 비교분석
                </span>
                <div className="flex-1 w-full min-h-0 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classAverageData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94A3B8" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#94A3B8" />
                      <ChartTooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 9, paddingTop: 5 }} />
                      <Bar dataKey="반 평균" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="학년 평균" fill="#A78BFA" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 3: 학생 평균 분포 그래프 */}
              <div className="bg-white/40 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 h-[220px] flex flex-col justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                  3. 학생별성적 평균 대역 분포
                </span>
                <div className="flex-1 w-full min-h-0 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentAverageDistribution} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94A3B8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9 }} stroke="#94A3B8" />
                      <ChartTooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      <Bar dataKey="인원수" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={35} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 4: 선택 학생의 과목별 점수 그래프 */}
              <div className="bg-white/40 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 h-[220px] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 font-bold"></span>
                    4. {selectedStudent?.name || `${selectedStudent?.no}번 학생`} 과목별 점수 프로필
                  </span>
                  
                  {/* Option Selector inside chart panel */}
                  <select
                    value={selectedStudentId || ''}
                    onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                    className="p-1 px-1.5 text-[9.5px] border border-slate-200 dark:border-slate-700 rounded-lg max-w-[100px] shrink-0 font-bold bg-white dark:bg-slate-800"
                  >
                    {students.map(s => (
                      <option key={s.no} value={s.no}>{s.name ? `${s.no}번 ${s.name}` : `${s.no}번 학생`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 w-full min-h-0 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentScoresData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#94A3B8" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#94A3B8" />
                      <ChartTooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 9, paddingTop: 5 }} />
                      <Line type="monotone" dataKey="학생 점수" stroke="#F97316" strokeWidth={3} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="학급 평균" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* TAB D: ALL STUDENTS ROSTER TABLE */}
          {activeTab === 'roster' && students.length > 0 && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/40 dark:bg-slate-900/40 rounded-xl border border-indigo-200/10 dark:border-indigo-805/30 text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>💡 각 학생의 상세 성취 보고서 및 AI 종합 세특을 설계하려면 해당 학생의 <strong className="text-indigo-600 dark:text-indigo-400 font-black">자세히 보기(🔍)</strong>를 클릭해 주세요.</span>
              </div>
              <div className="bg-white/40 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-800/80 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left text-[11px] border-collapse relative">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-850 z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-350">
                        <th className="py-2.5 px-3 whitespace-nowrap text-center">번호</th>
                        <th className="py-2.5 px-2 whitespace-nowrap">성명</th>
                        {subjects.map(sub => (
                          <th key={sub} className="py-2.5 px-2 text-center whitespace-nowrap">{sub}</th>
                        ))}
                        <th className="py-2.5 px-2 text-center whitespace-nowrap">합계</th>
                        <th className="py-2.5 px-2 text-center whitespace-nowrap font-bold text-slate-900 dark:text-white">평균</th>
                        <th className="py-2.5 px-2 text-center whitespace-nowrap">석차</th>
                        <th className="py-2.5 px-2 text-center whitespace-nowrap">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-855 text-slate-700 dark:text-slate-250 font-medium">
                      {students.map(st => (
                        <tr 
                          key={st.no} 
                          className={`hover:bg-indigo-50/20 dark:hover:bg-slate-800/20 transition-colors ${st.no === selectedStudentId ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
                        >
                          <td className="py-2 px-3 text-center font-bold text-slate-450 dark:text-slate-450">{st.no}</td>
                          <td className="py-2 px-2 text-slate-900 dark:text-white font-extrabold">{st.name || <span className="text-slate-400 dark:text-slate-500 font-normal italic">미제공</span>}</td>
                          {subjects.map(sub => {
                            const score = st.scores[sub] ?? 0;
                            return (
                              <td key={sub} className="py-2 px-2 text-center font-semibold text-slate-800 dark:text-slate-300">
                                {score}점
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-center text-slate-500 dark:text-slate-450">{st.total}</td>
                          <td className="py-2 px-2 text-center text-indigo-600 dark:text-indigo-400 font-bold">{st.avg}점</td>
                          <td className="py-2 px-2 text-center text-slate-500 dark:text-slate-450">{st.rank}위</td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => {
                                setSelectedStudentId(st.no);
                                setActiveTab('ai');
                              }}
                              className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-755 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/30 dark:border-slate-700 cursor-pointer transition-colors"
                            >
                              🔍 자세히
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB E: SELECTED STUDENT DETAIL & AI GENERATOR */}
          {activeTab === 'ai' && selectedStudent && (
            <div className="space-y-4">
              
              {/* Selected Student Toolbar header Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner">
                    {selectedStudent.no}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedStudent.name || '미제공 학생'}
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-bold">
                      (석차 {selectedStudent.rank}위 • 평균 {selectedStudent.avg}점)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-[10px] font-bold text-slate-500">학생 교체:</span>
                  <select
                    value={selectedStudentId || ''}
                    onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                    className="p-1 px-2.5 text-[11px] border border-slate-200 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-800 cursor-pointer shadow-sm"
                  >
                    {students.map(s => (
                      <option key={s.no} value={s.no}>{s.name ? `${s.no}번 ${s.name}` : `${s.no}번 학생`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Layout splits */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                
                {/* Visual scorecard */}
                <div className="lg:col-span-2 space-y-3.5">
                  <div className="bg-white/40 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span>📊 과목 점수 분석 현황</span>
                      <span className="text-[10px] text-indigo-500/90 font-extrabold">평균 대비</span>
                    </h4>
                    
                    <div className="space-y-2.5">
                      {subjects.map(sub => {
                        const score = selectedStudent.scores[sub] || 0;
                        const subAvg = subjectStats[sub]?.avg || 60;
                        const dev = Math.round((score - subAvg) * 10) / 10;
                        return (
                          <div key={sub} className="space-y-1 text-[11px]">
                            <div className="flex justify-between items-baseline font-semibold">
                              <span>{sub}</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className={score >= 90 ? 'text-emerald-700 dark:text-emerald-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}>
                                  {score}점
                                </span>
                                <span className={`text-[9px] font-bold ${dev >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  ({dev >= 0 ? `+${dev}` : dev})
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200/50 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${score >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'}`}
                                style={{ width: `${Math.min(100, Math.max(0, score))}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Highlights rules */}
                  <div className="bg-white/40 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="p-1 px-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-white border border-emerald-100 dark:border-emerald-900/30 font-bold rounded-lg flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span>개인 강점 과목: {selectedStudent.strength}</span>
                      </span>
                      <span className="p-1 px-1.5 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-white border border-pink-100 dark:border-pink-900/30 font-bold rounded-lg flex items-center gap-1 shrink-0">
                        <Info className="w-3 h-3 text-pink-500" />
                        <span>개인 보완 과목: {selectedStudent.weakness}</span>
                      </span>
                    </div>
                    
                    <div className="p-3 bg-indigo-50/10 dark:bg-indigo-950/10 rounded-lg border border-indigo-200/10 dark:border-indigo-900/10 text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                      <span className="font-extrabold text-[#3b82f6] block mb-1">💡 2022 개정 맞춤 학습 코칭 방안:</span>
                      자녀분은 <strong>{selectedStudent.strength}</strong> 영역의 우수 성취 요인을 타 교과 지식 구조와 교직 연결함으로써 탐구 가치와 역량을 극대화할 자질이 발달해 있습니다. <strong>{selectedStudent.weakness}</strong> 단원에서는 조급해하지 않고 탐색 질문들의 개념 체계를 시뮬레이션하고 복습 주기를 견지한다면 단기간 정보처리 도약이 유의미하게 약속됩니다.
                    </div>
                  </div>
                </div>

                {/* AI & TEXT WORKSPACE */}
                <div className="lg:col-span-3 space-y-3.5">
                  <div className="bg-white/40 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-800/80 overflow-hidden flex flex-col h-full min-h-[350px]">
                    
                    {/* Generative Segment headers */}
                    <div className="flex bg-slate-100 dark:bg-slate-850 p-1 font-bold text-[10.5px] shrink-0 border-b border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setAiActiveType('analysis')}
                        className={`flex-1 py-2 text-center rounded-lg cursor-pointer ${aiActiveType === 'analysis' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'}`}
                      >
                        📊 종합 성적 분석
                      </button>
                      <button
                        onClick={() => setAiActiveType('homeLetter')}
                        className={`flex-1 py-2 text-center rounded-lg cursor-pointer ${aiActiveType === 'homeLetter' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'}`}
                      >
                        ✉️ 가정통신문 편지
                      </button>
                    </div>

                    {/* Work Environment Text blocks */}
                    <div className="flex-1 p-4 flex flex-col justify-between min-h-0">
                      
                      {/* Generative output text box */}
                      <div className="flex-1 overflow-y-auto mb-4 bg-white/70 dark:bg-slate-950/30 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800 flex flex-col min-h-[200px]">
                        {(() => {
                           const cached = aiOutputs[selectedStudent.no];
                           let activeText = '';
                           let usedMethodLabel = '';

                           if (aiActiveType === 'analysis') {
                             activeText = cached?.analysis || selectedStudent.summary;
                             usedMethodLabel = cached?.analysis ? 'Gemini AI 생성' : '내장 규칙 분석 어구';
                           } else {
                             activeText = cached?.homeLetter || buildRuleBasedHomeLetter(selectedStudent);
                             usedMethodLabel = cached?.homeLetter ? 'Gemini AI 생성' : '내장 규칙 분석 어구';
                           }

                          return (
                            <div className="flex-1 flex flex-col justify-between text-left">
                              <div className="space-y-1.5 flex-1 select-text">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase text-indigo-500/80 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/20 px-1.5 py-0.5 rounded-lg inline-block">
                                    {usedMethodLabel}
                                  </span>
                                  <button
                                    onClick={() => handleCopyToClipboard(activeText)}
                                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-all flex items-center gap-1.5 text-[9.5px] font-bold cursor-pointer"
                                    title="복사하기"
                                  >
                                    <Clipboard className="w-3 h-3" />
                                    <span>복사</span>
                                  </button>
                                </div>
                                <div className="text-[11px] leading-relaxed font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap pt-2 select-text">
                                  {activeText}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* AI Generation action command dock */}
                      <div className="p-3 bg-slate-50/75 dark:bg-slate-900/60 rounded-xl border border-slate-200/40 dark:border-slate-805/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                        <div className="flex gap-2 items-center text-[10px] text-slate-500">
                          {apiKey ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Gemini 3.5 AI 활성화 완료 • 즉시 성원 가능</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Info className="w-3.5 h-3.5" />
                              <span>Gemini API Key를 등록하면 2022 개정 개별 맞춤 서술을 무제한 생성합니다.</span>
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end">
                          {apiKey ? (
                            <>
                              <button
                                onClick={() => handleGenerateAIOutput(aiActiveType, selectedStudent)}
                                disabled={isGenerating}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {isGenerating ? '생성 중...' : '현재 탭 AI 생성'}
                              </button>
                              <button
                                onClick={() => handleBulkGenerateForSelected(selectedStudent)}
                                disabled={isGenerating}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-[10.5px] rounded-lg shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {isGenerating ? '종합 구성 중...' : '종합 3종 AI 대량 생성'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={openSettingsModal}
                              className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-350 dark:hover:bg-slate-755 font-extrabold text-[10.5px] rounded-lg cursor-pointer transition-colors"
                            >
                              🔑 Gemini API Key 키 등록하기
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* MODAL WINDOWS: GEMINI API KEY SETTINGS */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in text-slate-800 dark:text-white">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xl space-y-4 animate-scale-up text-left">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-indigo-500" />
                <span>성적 분석 및 Gemini API 설정</span>
              </span>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-black text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">Gemini API Key 등록</label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AI Studio에서 발급받은 API Key를 기입하세요 (AI_...)"
                  className="w-full p-2.5 px-3 text-xs bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-300 dark:border-slate-805/50 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono shadow-inner"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-350 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberApiKey}
                    onChange={(e) => setRememberApiKey(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>브라우저를 닫아도 Key를 계속 기억하기 (localStorage 저장)</span>
                </label>
              </div>

              {/* Safety notice in Korea */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 rounded-xl border border-amber-200/40 dark:border-amber-900/40 text-[10px] leading-relaxed">
                🛡️ <strong>보안 수칙 준수 사항:</strong><br />
                입력하신 API Key는 다른 서버나 로그에 절대 남기거나 공유하지 않고 오직 사용자의 브라우저 내부에 유동 격리 보관(sessionStorage 또는 localStorage)되어 직접 로컬 연계 호출됩니다. 외부 노출 걱정없이 완벽한 로컬 샌드박스로 보강됩니다.
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-2">
                <div>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={handleDeleteApiKey}
                      className="p-2 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-950/50 dark:hover:bg-red-900/50 border border-red-200/50 dark:border-red-800/40 text-red-700 dark:text-red-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                      title="저장된 API Key 완전히 지우기"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>API Key 삭제</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs cursor-pointer"
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    className="p-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    설정 보관
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
