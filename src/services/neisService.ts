/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NeisConfig, ScheduleEvent } from '../types/dashboard';

// Allergy code to Korean description map
export const ALLERGY_MAP: { [key: string]: string } = {
  '1': '난류',
  '2': '우유',
  '3': '메밀',
  '4': '땅콩',
  '5': '대두',
  '6': '밀',
  '7': '고등어',
  '8': '게',
  '9': '새우',
  '10': '돼지고기',
  '11': '복숭아',
  '12': '토마토',
  '13': '아황산류',
  '14': '호두',
  '15': '닭고기',
  '16': '쇠고기',
  '17': '오징어',
  '18': '조개류',
  '19': '잣'
};

/**
 * Parses allergen numbers inside parenthesis e.g., "닭강정(1.5.6.13.15)" or "밀(6)"
 * and returns matched human-readable names: "닭강정 [알레르기: 난류, 대두, 밀, 아황산류, 닭고기]"
 */
export function interpretAllergens(dish: string): { name: string; allergens: string[] } {
  const match = dish.match(/(.+?)\(([\d.]+)\)/);
  if (!match) {
    return { name: dish.trim(), allergens: [] };
  }
  
  const name = match[1].trim();
  const codes = match[2].split('.');
  const allergens = codes
    .map(code => ALLERGY_MAP[code])
    .filter(Boolean);
    
  return { name, allergens };
}

/**
 * Robust mock local data for meals depending on the day of the week, used if NEIS config is empty or fails.
 */
export const MOCK_MEALS: { [day: number]: string[] } = {
  0: ['일요일은 급식이 없습니다.'], // Sunday
  1: ['흑미밥', '순두부찌개(1.5)0', '삼겹살오븐구이(10)', '부추겉절이', '상추쌈(5.6)', '배추김치(9)', '조각수박'], 
  2: ['돈까스하이라이스(1.2.5.6.10)', '맑은콩나물국', '소시지맛살볶음(1.2.5.6.10.15.16)', '치즈샐러드(2)', '배추김치(9)', '감귤오렌지주스'],
  3: ['비빔밥(1.5)', '아욱국', '수제양념닭강정(1.5.6.12.13.15)', '동그랑땡전(1.5.6.10)', '백김치', '아이스망고'],
  4: ['발아현미밥', '설렁탕(16)', '고등어무조림(5.6.7)', '새콤유자단무지', '석박지(9)', '바나나(12)', '츄러스'],
  5: ['토마토스파게티(1.2.5.6.12)', '수프(2.5.6)', '마늘바게트(2.6)', '케이준치킨샐러드(1.5.6.15)', '수제오이피클', '요구르트(2)'],
  6: ['토요일은 급식이 없습니다.']  // Saturday
};

/**
 * Robust mock events for School Schedule depending on date, used for preview.
 */
export const MOCK_EVENTS = [
  { id: 'mock-1', title: '개학식 및 현황조사', date: '2026-03-02', description: '새 학기 준비' },
  { id: 'mock-2', title: '학급 자치 임원 선거', date: '2026-03-12', description: '5교시 학급활동' },
  { id: 'mock-3', title: '1학기 학부모 총회', date: '2026-03-19', description: '시청각실 19:00' },
  { id: 'mock-4', title: '과학 탐구 대회', date: '2026-04-10', description: '전 교단 참여' },
  { id: 'mock-5', title: '대통령 취임일 (법정휴업일)', date: '2026-05-10', description: '휴업일' },
  { id: 'mock-6', title: '중간고사 (1일차)', date: '2026-05-13', description: '국어, 수학' },
  { id: 'mock-7', title: '중간고사 (2일차)', date: '2026-05-14', description: '영어, 과학' },
  { id: 'mock-8', title: '스승의 날 행사', date: '2026-05-15', description: '카네이션 교부' },
  { id: 'mock-9', title: '현장 체험 학습 (경주 소풍)', date: '2026-05-22', description: '출발 오전 8시' },
  { id: 'mock-10', title: '호국보훈의 달 기념 행사', date: '2026-06-05', description: '글짓기/포스터 그리기' },
  { id: 'mock-11', title: '기말고사 대장정', date: '2026-07-02', description: '전 학년' },
  { id: 'mock-12', title: '1학기 방학식', date: '2026-07-22', description: '여름방학 돌입' }
];

/**
 * School Search API
 */
export async function searchSchool(schoolName: string, apiKey: string = ''): Promise<any[]> {
  if (!schoolName) return [];
  
  const queryParam = apiKey ? `&KEY=${apiKey}` : '';
  const url = `https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=30&SCHUL_NM=${encodeURIComponent(schoolName)}${queryParam}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data?.schoolInfo?.[1]?.row) {
      return data.schoolInfo[1].row.map((item: any) => ({
        schoolName: item.SCHUL_NM,
        officeCode: item.ATPT_OFCDC_SC_CODE,
        schoolCode: item.SD_SCHUL_CODE,
        schoolType: item.SCHUL_KND_SC_NM,
        address: item.ORG_RDNMA
      }));
    }
  } catch (e) {
    console.warn('Failed to search school from NEIS:', e);
  }
  return [];
}

/**
 * Fetch school meals for a single date
 * date format: YYYY-MM-DD
 */
export async function fetchSchoolMeal(config: NeisConfig, dateStr: string): Promise<string[]> {
  const cleanDate = dateStr.replace(/-/g, ''); // "2026-05-26" -> "20260526"
  const { apiKey, officeCode, schoolCode } = config;
  
  if (!schoolCode || !officeCode) {
    // Return mock based on day index
    const dateObj = new Date(dateStr);
    const day = isNaN(dateObj.getTime()) ? 1 : dateObj.getDay();
    return MOCK_MEALS[day] || ['급식 데이터가 없습니다.'];
  }
  
  const keyParam = apiKey ? `&KEY=${apiKey}` : '';
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${cleanDate}${keyParam}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data?.mealServiceDietInfo?.[1]?.row?.[0]?.DDISH_NM) {
      const ddishString = data.mealServiceDietInfo[1].row[0].DDISH_NM;
      // NEIS returns dishes split with <br/> or \n
      return ddishString
        .split(/<br\s*\/?>|\n/)
        .map((dish: string) => dish.trim())
        .filter(Boolean);
    }
  } catch (e) {
    console.warn('NEIS Meal API failed, loading mock fallback:', e);
  }
  
  // Back to mock fallback on network failure
  const parsedDay = new Date(dateStr).getDay();
  return MOCK_MEALS[parsedDay] || ['네트워크 오류로 식단 정보를 가져오지 못했습니다.'];
}

/**
 * Fetch academic calendar events for a date range e.g. "2026-05-01" / "2026-05-31"
 */
export async function fetchSchoolSchedule(config: NeisConfig, startDateStr: string, endDateStr: string): Promise<ScheduleEvent[]> {
  const fromYmd = startDateStr.replace(/-/g, '');
  const toYmd = endDateStr.replace(/-/g, '');
  const { apiKey, officeCode, schoolCode } = config;
  
  if (!schoolCode || !officeCode) {
    // Return mock calendar events overlapping this range
    return MOCK_EVENTS.map(ev => ({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      description: ev.description,
      isNeis: false
    })).filter(ev => ev.date >= startDateStr && ev.date <= endDateStr);
  }
  
  const keyParam = apiKey ? `&KEY=${apiKey}` : '';
  const url = `https://open.neis.go.kr/hub/SchoolSchedule?Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&AA_FROM_YMD=${fromYmd}&AA_TO_YMD=${toYmd}${keyParam}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data?.SchoolSchedule?.[1]?.row) {
      return data.SchoolSchedule[1].row
        .filter((row: any) => row.SCHUL_NM !== '' && row.EVENT_NM)
        .map((row: any, index: number) => {
          // Date format in NEIS: "20260515"
          const dateYmd = row.AA_YMD;
          const formattedDate = `${dateYmd.slice(0, 4)}-${dateYmd.slice(4, 6)}-${dateYmd.slice(6, 8)}`;
          return {
            id: `neis-sched-${index}-${dateYmd}`,
            title: row.EVENT_NM,
            date: formattedDate,
            description: row.SBJ_EST_YN === 'Y' ? '수업일수 확보' : (row.ONE_GRADE_EVENT_NM || '기본 학교 행사'),
            isNeis: true
          };
        });
    }
  } catch (e) {
    console.warn('NEIS Schedule API failed:', e);
  }
  
  // Return local storage fallback on failure
  return MOCK_EVENTS.map(ev => ({
    id: ev.id,
    title: ev.title,
    date: ev.date,
    description: ev.description,
    isNeis: false
  })).filter(ev => ev.date >= startDateStr && ev.date <= endDateStr);
}
