declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromDate(date: Date): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    static fromDate(date: Date): Lunar;
    static getLeapMonthDays(year: number): number;
    static getMonthDays(year: number, month: number): number;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInGanZhi(): string;
    getYearShengXiao(): string;
    getFestivals(): string[];
    getOtherFestivals(): string[];
    getJieQi(): string;
    getJieQiList(): string[];
    isLeapMonth(): boolean;
    getLeapMonth(): number;
    getSolar(): Solar;
  }
}
