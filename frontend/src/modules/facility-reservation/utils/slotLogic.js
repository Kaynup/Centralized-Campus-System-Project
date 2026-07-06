import { timeToMinutes, getSlotIndex, SlotStatus } from './bookingHelpers';
import { getLocalDateString } from './dateHelpers';

export function isDateBeforeToday(dateStr) {
  const today = getLocalDateString();
  return dateStr < today;
}

export function isDateToday(dateStr) {
  const today = getLocalDateString();
  return dateStr === today;
}

export function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function bookingStartsBeforeNow(booking) {
  const startTime = booking?.startTime || booking?.start_time;
  if (!booking || !startTime) return false;
  return timeToMinutes(startTime) <= nowMinutes();
}

export function bookingEndsBeforeNow(booking) {
  const endTime = booking?.endTime || booking?.end_time;
  if (!booking || !endTime) return false;
  const end = timeToMinutes(endTime);
  return end <= nowMinutes();
}

export function slotIndexToPastStartBooking(booking, start = '07:00', slotMinutes = 10) {
  const startTime = booking?.startTime || booking?.start_time;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + slotMinutes;
  const h = Math.floor(endMinutes / 60);
  const m = endMinutes % 60;
  const endTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return {
    ...booking,
    status: SlotStatus.PAST,
    endTime,
    userName: 'Canceled pending',
    deposit: 0,
  };
}

const mapToEndStatus = (status) => {
  if (status === SlotStatus.RESERVED) return 'RESERVED-END';
  if (status === SlotStatus.PENDING) return 'PENDING-END';
  if (status === SlotStatus.UNAVAILABLE) return 'UNAVAILABLE-END';
  if (status === SlotStatus.MY_BOOKING) return 'MY_BOOKING-END';
  return SlotStatus.END;
};

export function markPastBookings(bookings = [], dateStr, start = '07:00', slotMinutes = 10) {
  if (!bookings || bookings.length === 0) return bookings;

  const beforeToday = isDateBeforeToday(dateStr);
  const today = isDateToday(dateStr);

  return bookings.flatMap((booking) => {
    if (booking.status === SlotStatus.PAST || booking.status?.endsWith('-END')) return [booking];

    if (beforeToday) {
      const newStatus = booking.status === SlotStatus.AVAILABLE ? SlotStatus.PAST : mapToEndStatus(booking.status);
      return [{ ...booking, status: newStatus }];
    }

    if (today) {
      if (bookingEndsBeforeNow(booking)) {
        const newStatus = booking.status === SlotStatus.AVAILABLE ? SlotStatus.PAST : mapToEndStatus(booking.status);
        return [{ ...booking, status: newStatus }];
      }

      if (bookingStartsBeforeNow(booking)) {
        if (booking.status === SlotStatus.AVAILABLE) return [{ ...booking, status: SlotStatus.PAST }];
        if (booking.status === SlotStatus.PENDING) {
          return [slotIndexToPastStartBooking(booking, start, slotMinutes)];
        }
        return [{ ...booking }];
      }
    }

    return [booking];
  });
}

export function slotIndexToTime(index, start = '07:00', slotMinutes = 10) {
  const startMinutes = timeToMinutes(start);
  const minutes = startMinutes + index * slotMinutes;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isSlotBeforeNow(index, dateStr, start = '07:00', slotMinutes = 10) {
  if (isDateBeforeToday(dateStr)) return true;
  if (!isDateToday(dateStr)) return false;
  const minutes = timeToMinutes(slotIndexToTime(index, start, slotMinutes));
  return minutes < nowMinutes();
}
