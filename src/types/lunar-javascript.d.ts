declare module 'lunar-javascript' {
  export class Lunar {
    static fromDate(date: Date): Lunar
    getYear(): number
    getMonth(): number
    getDay(): number
    getYearInGanZhi(): string
    getYearShengXiao(): string
    getMonthInChinese(): string
    getDayInChinese(): string
    toString(): string
  }
}
