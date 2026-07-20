import { createContext, useContext, useState } from 'react';
import * as bookingApi from '../api/bookingApi';
import { useAuth } from "../../../shared/hooks/useAuth";
import { useNotification } from "../../../shared/hooks/useNotification";
import { getSlotIndex } from '../utils/bookingHelpers';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [multiSelectMode, setMultiSelectModeState] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [multiSelectFacility, setMultiSelectFacility] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState('reservation'); // 'reservation' | 'changeStatus' | 'unavailableDetails' | 'pastDetails'
  const [drawerMode, setDrawerMode] = useState('new'); // 'new' | 'view' | 'cancel' | 'multi'
  const [cancellationPreview, setCancellationPreview] = useState(null);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  
  // A simple trigger to tell FacilityCalendarPage or other slot loaders to refresh slots
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const normalizeSlotKey = (slot) => `${slot.startTime || slot.start_time}-${slot.endTime || slot.end_time}`;
  const sortSlotList = (slots) => [...slots].sort((a, b) => getSlotIndex(a.startTime || a.start_time, '07:00', 10) - getSlotIndex(b.startTime || b.start_time, '07:00', 10));
  const areSlotsConsecutive = (slots) => {
    if (slots.length <= 1) return true;
    const sorted = sortSlotList(slots);
    for (let i = 1; i < sorted.length; i += 1) {
      const prevIndex = getSlotIndex(sorted[i - 1].startTime || sorted[i - 1].start_time, '07:00', 10);
      const currIndex = getSlotIndex(sorted[i].startTime || sorted[i].start_time, '07:00', 10);
      if (currIndex !== prevIndex + 1) {
        return false;
      }
    }
    return true;
  };

  const clearSelectedSlots = () => {
    setSelectedSlots([]);
    setMultiSelectFacility(null);
    setSelectedFacility(null);
  };

  const setMultiSelectMode = (enabled) => {
    setMultiSelectModeState(enabled);
    if (!enabled) {
      clearSelectedSlots();
    }
  };

  const toggleSlotSelection = (slot, facility) => {
    if (!slot || (slot.status && slot.status !== 'AVAILABLE')) {
      notify.warning('Only green available slots can be selected.');
      return;
    }

    if (selectedSlots.length > 0 && facility?.id !== multiSelectFacility?.id) {
      notify.warning('Please select slots from the same facility only.');
      return;
    }

    const slotKey = normalizeSlotKey(slot);
    const alreadySelected = selectedSlots.some((selected) => normalizeSlotKey(selected) === slotKey);
    if (alreadySelected) {
      const remaining = selectedSlots.filter((selected) => normalizeSlotKey(selected) !== slotKey);
      setSelectedSlots(remaining);
      if (remaining.length === 0) {
        setMultiSelectFacility(null);
      }
      return;
    }

    const nextSelection = sortSlotList([...selectedSlots, slot]);
    if (!areSlotsConsecutive(nextSelection)) {
      notify.warning('Selected slots must be adjacent and without gaps.');
      return;
    }

    setSelectedSlots(nextSelection);
    setMultiSelectFacility(facility);
  };

  const selectSlotRange = (slots, facility) => {
    if (!slots || slots.length === 0) return;
    if (slots.some((slot) => slot.status !== 'AVAILABLE')) {
      notify.warning('Only green available slots can be selected.');
      return;
    }
    if (selectedSlots.length > 0 && facility?.id !== multiSelectFacility?.id) {
      notify.warning('Please select slots from the same facility only.');
      return;
    }

    const slotMap = new Map();
    selectedSlots.forEach((slot) => slotMap.set(normalizeSlotKey(slot), slot));
    slots.forEach((slot) => slotMap.set(normalizeSlotKey(slot), slot));

    const nextSelection = sortSlotList(Array.from(slotMap.values()));
    if (!areSlotsConsecutive(nextSelection)) {
      notify.warning('Selected slots must be adjacent and without gaps.');
      return;
    }

    setSelectedSlots(nextSelection);
    setMultiSelectFacility(facility);
  };

  const reserveSelectedSlots = () => {
    if (selectedSlots.length === 0) {
      notify.warning('Select available slots before reserving.');
      return;
    }
    if (!multiSelectFacility) {
      notify.warning('Please select slots from the same facility before reserving.');
      return;
    }
    setSelectedSlot(null);
    setDrawerType('reservation');
    setDrawerMode('multi');
    setIsDrawerOpen(true);
  };

  const changeStatusSelectedSlots = () => {
    if (selectedSlots.length === 0) {
      notify.warning('Select slots before changing status.');
      return;
    }
    if (!multiSelectFacility) {
      notify.warning('Please select slots from the same facility.');
      return;
    }
    setSelectedSlot(null);
    setDrawerType('changeStatus');
    setDrawerMode('multi');
    setIsDrawerOpen(true);
  };

  const getSelectedSlotsStats = () => {
    if (!selectedSlots.length) {
      return { count: 0, totalDuration: 0, startTime: '', endTime: '', sortedSlots: [] };
    }
    const sortedSlots = sortSlotList(selectedSlots);
    const totalDuration = sortedSlots.reduce((sum, slot) => {
      const start = slot.startTime || slot.start_time;
      const end = slot.endTime || slot.end_time;
      const diff = (getSlotIndex(end, '07:00', 10) - getSlotIndex(start, '07:00', 10)) * 10;
      return sum + diff;
    }, 0);
    const startTime = sortedSlots[0].startTime || sortedSlots[0].start_time;
    const endTime = sortedSlots[sortedSlots.length - 1].endTime || sortedSlots[sortedSlots.length - 1].end_time;
    const startSlotId = sortedSlots[0].id;
    const endSlotId = sortedSlots[sortedSlots.length - 1].id;
    return { count: sortedSlots.length, totalDuration, startTime, endTime, startSlotId, endSlotId, sortedSlots };
  };

  const confirmMultiSelectBooking = async (selectedDateStr) => {
    if (selectedSlots.length === 0) return;
    setIsBookingInProgress(true);
    setBookingError(null);

    const facilityName = selectedFacility?.name || 'Facility';

    try {
      const stats = getSelectedSlotsStats();
      const payload = {
        facility_id: multiSelectFacility.id,
        booking_date: selectedDateStr,
        start_slot_id: stats.startSlotId,
        end_slot_id: stats.endSlotId
      };
      await bookingApi.createBooking(payload);
      
      triggerRefresh();
      await loadMyBookings();
      setMultiSelectModeState(false); // directly turn off state
      clearSelectedSlots();
      closeDrawer();

      if (selectedFacility?.requiresApproval) {
        notify.info(`Booking request submitted. Awaiting approval.`);
      } else {
        notify.success(`Booking confirmed for ${facilityName}!`);
      }
    } catch (err) {
      console.error('Multi-slot booking failed:', err);
      const is422 = err.response?.status === 422;
      const msg = is422 
        ? "This slot is probably already booked. Please refresh the page to see the latest availability."
        : err.response?.data?.message || err.message || 'Something went wrong.';
      setBookingError(msg);
      notify.error(`Booking failed: ${msg}`);
      throw err;
    } finally {
      setIsBookingInProgress(false);
    }
  };

  const loadMyBookings = async (statusFilter) => {
    setBookingError(null);
    try {
      const bookings = await bookingApi.fetchMyBookings(statusFilter);
      setMyBookings(bookings);
    } catch (err) {
      console.error('Failed to load my bookings:', err);
      setBookingError(err.response?.data?.message || err.message || 'Failed to load bookings');
    }
  };

  const openBookingDrawer = (slot, facility) => {
    setSelectedSlot(slot);
    setSelectedFacility(facility);
    setBookingError(null);
    setCancellationPreview(null);
    
    const isAdmin = user?.accountType === 'admin' && (user?.role === 'super_admin' || user?.role === 'facility_admin');

    if (slot.status === 'PAST') {
      if (isAdmin) {
        setDrawerType('pastDetails');
        setIsDrawerOpen(true);
      }
      return; // Do nothing for students/professors
    }

    if (slot.status === 'UNAVAILABLE') {
      if (isAdmin) {
        setDrawerType('changeStatus');
      } else {
        setDrawerType('unavailableDetails');
      }
      setIsDrawerOpen(true);
      return;
    }

    if (slot.status === 'AVAILABLE' && isAdmin) {
      setDrawerType('changeStatus');
      setIsDrawerOpen(true);
      return;
    }

    // Default reservation drawer flow for available/booked slots
    setDrawerType('reservation');
    if (slot.status === 'MY_BOOKING') {
      setDrawerMode('view');
    } else if (slot.status === 'AVAILABLE') {
      setDrawerMode('new');
    } else {
      setDrawerMode('view');
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSlot(null);
    setSelectedFacility(null);
    setCancellationPreview(null);
    setBookingError(null);
  };

  const confirmBooking = async () => {
    if (!selectedSlot) return;
    setIsBookingInProgress(true);
    setBookingError(null);

    try {
      const payload = {
        facility_id: selectedFacility.id,
        booking_date: window.selectedDateStr || selectedSlot.date || '',
        start_slot_id: selectedSlot.id,
        end_slot_id: selectedSlot.id
      };
      await bookingApi.createBooking(payload);
      
      triggerRefresh();
      await loadMyBookings();
      closeDrawer();

      const facilityName = selectedFacility?.name || 'Facility';
      if (selectedFacility?.requiresApproval) {
        notify.info(`Booking request submitted. Awaiting approval.`);
      } else {
        notify.success(`Booking confirmed for ${facilityName}!`);
      }
    } catch (err) {
      console.error('Booking failed:', err);
      const is422 = err.response?.status === 422 || err.response?.status === 409;
      const msg = is422 
        ? "This slot is probably already booked. Please refresh the page to see the latest availability."
        : err.response?.data?.message || err.message || 'Something went wrong.';
      setBookingError(msg);
      notify.error(`Booking failed: ${msg}`);
      throw err;
    } finally {
      setIsBookingInProgress(false);
    }
  };

  const initiateCancellation = async (bookingId) => {
    setBookingError(null);

    try {
      const preview = await bookingApi.previewCancellation(bookingId);
      setCancellationPreview(preview);
      setDrawerMode('cancel');
    } catch (err) {
      console.error('Failed to fetch cancellation preview:', err);
      setBookingError(err.response?.data?.message || err.message || 'Failed to fetch cancellation preview');
    }
  };

  const confirmCancellation = async (bookingId, reason) => {
    setIsBookingInProgress(true);
    setBookingError(null);

    try {
      await bookingApi.cancelBooking(bookingId, reason);
      triggerRefresh();
      setMyBookings(prev => prev.filter(b => b.id !== bookingId));
      closeDrawer();

      const penalty = cancellationPreview?.penaltyAmount ?? cancellationPreview?.penalty_amount ?? 0;
      const refund = cancellationPreview?.refundAmount ?? cancellationPreview?.refund_amount ?? selectedSlot?.deposit ?? 0;
      if (penalty > 0) {
        notify.warning(`Booking cancelled. You forfeited ${penalty} tokens.`);
      } else {
        notify.success(`Booking cancelled. ${refund} tokens refunded.`);
      }
    } catch (err) {
      console.error('Cancellation failed:', err);
      setBookingError(err.response?.data?.message || err.message || 'Cancellation failed');
      notify.error(`Cancellation failed: ${err.response?.data?.message || err.message || 'Something went wrong.'}`);
      throw err;
    } finally {
      setIsBookingInProgress(false);
    }
  };

  return (
    <BookingContext.Provider
      value={{
        myBookings,
        selectedSlot,
        selectedFacility,
        multiSelectMode,
        selectedSlots,
        multiSelectFacility,
        isDrawerOpen,
        drawerType,
        drawerMode,
        setDrawerMode,
        cancellationPreview,
        isBookingInProgress,
        bookingError,
        refreshTrigger,
        triggerRefresh,
        loadMyBookings,
        openBookingDrawer,
        closeDrawer,
        confirmBooking,
        initiateCancellation,
        confirmCancellation,
        setMultiSelectMode,
        toggleSlotSelection,
        selectSlotRange,
        clearSelectedSlots,
        reserveSelectedSlots,
        changeStatusSelectedSlots,
        confirmMultiSelectBooking,
        getSelectedSlotsStats,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
