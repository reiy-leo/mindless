import type { TimeFormat, DateFormat, TimezoneFormat } from '@/stores/useAppStore';
import type { TFunction } from 'i18next';

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const CN_UNITS = ['', '十', '二十', '三十', '四十', '五十'];

function cnNumber(n: number): string {
  if (n <= 10) return CN_DIGITS[n];
  if (n < 20) return '十' + CN_DIGITS[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return CN_UNITS[tens] + (ones === 0 ? '' : CN_DIGITS[ones]);
}

export function formatTime(time: string, format: TimeFormat): string {
  if (!time) return '';
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h) || isNaN(m)) return time;

  switch (format) {
    case '24h':
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    case 'en_12h': {
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    }
    case 'cn_24h': {
      const period = h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上';
      return `${period} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    case 'cn_12h': {
      const period = h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${period} ${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    case 'cn_natural': {
      const period = h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const minuteStr = m === 0 ? '整' : (m < 10 ? '零' : '') + cnNumber(m) + '分';
      return `${period}${cnNumber(h12)}点${minuteStr}`;
    }
    default:
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

export function formatDisplayDate(dateStr: string, format: DateFormat, t: TFunction): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];

  switch (format) {
    case 'relative': {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);
      const dayBeforeStr = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2, '0')}-${String(dayBefore.getDate()).padStart(2, '0')}`;

      if (dateStr === todayStr) return t('today');
      if (dateStr === yesterdayStr) return t('yesterday');
      if (dateStr === dayBeforeStr) return t('datetime.relative.day_before', { defaultValue: '前天' });
      return `${y}/${m}/${d}`;
    }
    case 'yyyy_slash_mm_dd':
      return `${y}/${m}/${d}`;
    case 'yyyy_dash_mm_dd':
      return `${y}-${m}-${d}`;
    case 'mm_dd_yyyy':
      return `${m}/${d} ${y}`;
    case 'mm_dd':
      return `${m}/${d}`;
    default:
      return `${y}/${m}/${d}`;
  }
}

function getTimezoneOffsetMinutes(tz: string): number {
  const now = new Date();
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = now.toLocaleString('en-US', { timeZone: tz });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

export function formatTimezoneOffset(tz: string, format: TimezoneFormat): string {
  if (!tz) return '';

  switch (format) {
    case 'iana':
      return tz;
    case 'short_offset': {
      const mins = getTimezoneOffsetMinutes(tz);
      const sign = mins >= 0 ? '+' : '-';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return m === 0 ? `${sign}${h}` : `${sign}${h}:${String(m).padStart(2, '0')}`;
    }
    case 'compact': {
      const mins = getTimezoneOffsetMinutes(tz);
      const sign = mins >= 0 ? '+' : '-';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `${sign}${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
    }
    case 'gmt': {
      const mins = getTimezoneOffsetMinutes(tz);
      const sign = mins >= 0 ? '+' : '-';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${String(m).padStart(2, '0')}`;
    }
    case 'utc_colon': {
      const mins = getTimezoneOffsetMinutes(tz);
      const sign = mins >= 0 ? '+' : '-';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
    }
    case 'iso_colon': {
      const mins = getTimezoneOffsetMinutes(tz);
      const sign = mins >= 0 ? '+' : '-';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    case 'cn_zone': {
      const mins = getTimezoneOffsetMinutes(tz);
      const sign = mins >= 0 ? '东' : '西';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      return `${sign}${cnNumber(h)}区`;
    }
    default:
      return tz;
  }
}
