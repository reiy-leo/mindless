import { Solar } from 'lunar-javascript';

export interface LunarInfo {
  year: number;
  month: number;
  day: number;
  monthStr: string;  // e.g. "正月", "腊月"
  dayStr: string;    // e.g. "初一", "十五"
  yearStr: string;   // e.g. "甲辰龙年"
  isLeapMonth: boolean;
  festivals: string[];  // Traditional festivals on this lunar date
  solarTerms: string[]; // Solar terms (节气) for this date
}

export function getLunarInfo(year: number, month: number, day: number): LunarInfo {
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  const monthChinese = lunar.getMonthInChinese();
  // Append "月" to get full month name like "正月", "腊月"
  const monthStr = monthChinese.endsWith('月') ? monthChinese : monthChinese + '月';

  return {
    year: lunar.getYear(),
    month: lunar.getMonth(),
    day: lunar.getDay(),
    monthStr,
    dayStr: lunar.getDayInChinese(),
    yearStr: lunar.getYearInGanZhi() + lunar.getYearShengXiao(),
    isLeapMonth: lunar.getMonth() < 0,
    festivals: lunar.getFestivals(),
    solarTerms: lunar.getJieQi() ? [lunar.getJieQi()] : [],
  };
}

export function getLunarDayStr(year: number, month: number, day: number): string {
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  // Show festival name if any
  const festivals = lunar.getFestivals();
  if (festivals.length > 0) return festivals[0];
  // Show solar term if any
  const jieQi = lunar.getJieQi();
  if (jieQi) return jieQi;
  // Show month name on first day of lunar month
  if (lunar.getDay() === 1) {
    const m = lunar.getMonthInChinese();
    return m.endsWith('月') ? m : m + '月';
  }
  return lunar.getDayInChinese();
}

export function solarTermsForMonth(year: number, month: number): { name: string; day: number }[] {
  const terms: { name: string; day: number }[] = [];
  // Check each day of the month for solar terms
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const solar = Solar.fromYmd(year, month, d);
    const lunar = solar.getLunar();
    const jq = lunar.getJieQi();
    if (jq) {
      terms.push({ name: jq, day: d });
    }
  }
  return terms;
}
