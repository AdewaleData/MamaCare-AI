const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatToken(date: Date, token: string): string {
  switch (token) {
    case 'yyyy':
      return String(date.getFullYear());
    case 'MMMM':
      return MONTHS_LONG[date.getMonth()];
    case 'MMM':
      return MONTHS_SHORT[date.getMonth()];
    case 'dd':
      return pad(date.getDate());
    case 'd':
      return String(date.getDate());
    case 'EEE':
      return WEEKDAYS_SHORT[date.getDay()];
    case 'HH':
      return pad(date.getHours());
    case 'h': {
      const hours = date.getHours() % 12 || 12;
      return String(hours);
    }
    case 'mm':
      return pad(date.getMinutes());
    case 'a':
      return date.getHours() >= 12 ? 'PM' : 'AM';
    default:
      return token;
  }
}

export function formatDate(value: Date | string | number, pattern: string): string {
  const date = toDate(value);
  const tokens = /(yyyy|MMMM|MMM|dd|d|EEE|HH|h|mm|a)/g;
  return pattern.replace(tokens, (token) => formatToken(date, token));
}

export function formatDistanceToNow(value: Date | string | number, options?: { addSuffix?: boolean }): string {
  const date = toDate(value);
  const diffMs = date.getTime() - Date.now();
  const suffix = options?.addSuffix ? (diffMs < 0 ? ' ago' : ' from now') : '';
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  let valueNumber: number;
  let unit: string;

  if (absMs < hour) {
    valueNumber = Math.max(1, Math.round(absMs / minute));
    unit = valueNumber === 1 ? 'minute' : 'minutes';
  } else if (absMs < day) {
    valueNumber = Math.round(absMs / hour);
    unit = valueNumber === 1 ? 'hour' : 'hours';
  } else if (absMs < month) {
    valueNumber = Math.round(absMs / day);
    unit = valueNumber === 1 ? 'day' : 'days';
  } else if (absMs < year) {
    valueNumber = Math.round(absMs / month);
    unit = valueNumber === 1 ? 'month' : 'months';
  } else {
    valueNumber = Math.round(absMs / year);
    unit = valueNumber === 1 ? 'year' : 'years';
  }

  return `${valueNumber} ${unit}${suffix}`;
}
