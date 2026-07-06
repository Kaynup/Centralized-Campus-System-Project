export const formatTime = (value) => {
  if (!value) return '';
  const raw = String(value);
  if (raw.includes('T')) {
    const [, timePart = ''] = raw.split('T');
    return timePart.slice(0, 5);
  }
  return raw.slice(0, 5);
};
