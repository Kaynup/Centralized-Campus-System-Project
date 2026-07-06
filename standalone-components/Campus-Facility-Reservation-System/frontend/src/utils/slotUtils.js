/**
 * Shared utility for processing and grouping facility slots and user bookings.
 */

export const formatTime = (value) => {
  if (!value) return '';
  const raw = typeof value === 'string' ? value : String(value);
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  const isoTimeMatch = raw.match(/\d{4}-\d{2}-\d{2}[T ](\d{2}:\d{2})/);
  if (isoTimeMatch) return isoTimeMatch[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const normalizeStatus = (status) => String(status || '').toUpperCase();

export const slotsAreMergeable = (prev, next) => {
  if (!prev || !next) return false;

  const prevStatus = normalizeStatus(prev.status);
  const nextStatus = normalizeStatus(next.status);
  
  // Never merge AVAILABLE slots unless required by a specific use case,
  // but for user bookings, they aren't AVAILABLE anyway.
  if (prevStatus === 'AVAILABLE' || nextStatus === 'AVAILABLE') return false;
  
  if (prevStatus !== nextStatus) return false;

  // For facility slots (which have userName or requesterName)
  const prevUser = String(prev.userName || prev.requesterName || '');
  const nextUser = String(next.userName || next.requesterName || '');
  if (prevUser !== nextUser) return false;

  // For My Bookings (which have facilityName and date)
  if (prev.facilityName && next.facilityName && prev.facilityName !== next.facilityName) return false;
  if (prev.date && next.date && prev.date !== next.date) return false;

  // Check availability mismatch if present
  if (prev.isAvailable !== undefined && next.isAvailable !== undefined) {
    if (prev.isAvailable !== next.isAvailable) return false;
  }

  if (!prev.endTime || !next.startTime) return false;
  return prev.endTime === next.startTime;
};

export const mergeSlots = (base, next) => {
  const merged = {
    ...base,
    endTime: next.endTime,
    deposit: (Number(base.deposit) || 0) + (Number(next.deposit) || 0),
  };

  // If these are user bookings, collect their IDs so multi-cancellation works
  if (base.ids || next.id) {
    merged.ids = [...(base.ids || [base.id]), next.id].filter(Boolean);
  }

  // Also collect bookingIds if present (for approvals)
  if (base.bookingIds || next.bookingId) {
    merged.bookingIds = [...(base.bookingIds || [base.bookingId]), next.bookingId].filter(Boolean);
  }

  return merged;
};

export const groupConsecutiveSlots = (items = []) => {
  // Normalize time for reliable comparison and sorting
  const normalized = items.map(item => ({
    ...item,
    startTime: formatTime(item.startTime),
    endTime: formatTime(item.endTime),
  }));

  // Sort by date, then facilityName, then startTime
  normalized.sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.facilityName && b.facilityName && a.facilityName !== b.facilityName) {
      return a.facilityName.localeCompare(b.facilityName);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  const grouped = [];
  let current = null;

  normalized.forEach((item) => {
    if (!current) {
      current = { ...item };
      if (item.id && !current.ids) {
        current.ids = [item.id];
      }
      return;
    }

    if (slotsAreMergeable(current, item)) {
      current = mergeSlots(current, item);
      return;
    }

    grouped.push(current);
    current = { ...item };
    if (item.id && !current.ids) {
      current.ids = [item.id];
    }
  });

  if (current) grouped.push(current);

  // Map `id` to the array or single value for the UI
  return grouped.map(g => {
    if (g.ids && g.ids.length > 0) {
      g.id = g.ids.length === 1 ? g.ids[0] : g.ids;
    }
    if (g.bookingIds && g.bookingIds.length > 0) {
      g.bookingId = g.bookingIds.length === 1 ? g.bookingIds[0] : g.bookingIds;
    }
    return g;
  });
};
