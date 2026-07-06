// Date helper utilities used throughout the calendar UI.

export function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(dateTimeString) {
  if (!dateTimeString) return '';
  const [datePart, timePart = ''] = dateTimeString.split('T');
  const time = timePart || datePart;
  const [hours, minutes] = time.split(':');
  if (hours == null || minutes == null) return '';
  return `${hours.padStart(2, '0')}:${minutes.slice(0, 2).padEnd(2, '0')}`;
}

export function formatTimeRange(startTime, endTime) {
  return `${formatTime(startTime)}–${formatTime(endTime)}`;
}

export function isToday(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function isFuture(dateTimeString) {
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

export function getDayOfWeek(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getWeekDates(anchorDate) {
  const date = new Date(anchorDate);
  if (Number.isNaN(date.getTime())) return [];

  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));

  return Array.from({ length: 5 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return next.toISOString().split('T')[0];
  });
}

export function minutesSince0700(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return Math.max(0, hours * 60 + minutes - 7 * 60);
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
