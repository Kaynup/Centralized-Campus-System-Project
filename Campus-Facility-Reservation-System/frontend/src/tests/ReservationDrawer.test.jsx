import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReservationDrawer from '../components/calendar/ReservationDrawer';
import { useBooking } from '../contexts/BookingContext';
import { useAuth } from '../contexts/AuthContext';
import * as adminApi from '../api/adminApi';

vi.mock('../contexts/BookingContext', () => ({
  useBooking: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/adminApi', () => ({
  forceCancelBooking: vi.fn(),
}));

describe('ReservationDrawer - AdminCancelMode', () => {
  const mockCloseDrawer = vi.fn();
  const mockSetDrawerMode = vi.fn();
  const mockTriggerRefresh = vi.fn();
  const mockLoadMyBookings = vi.fn().mockResolvedValue([]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupContext = (role = 'admin', mode = 'view', overrides = {}) => {
    useAuth.mockReturnValue({
      user: { id: 1, role, token_balance: 50 },
    });
    
    useBooking.mockReturnValue({
      isDrawerOpen: true,
      drawerMode: mode,
      drawerType: 'reservation',
      setDrawerMode: mockSetDrawerMode,
      closeDrawer: mockCloseDrawer,
      triggerRefresh: mockTriggerRefresh,
      loadMyBookings: mockLoadMyBookings,
      initiateCancellation: vi.fn(),
      confirmMultiSelectBooking: vi.fn(),
      getSelectedSlotsStats: vi.fn(),
      cancellationPreview: null,
      isBookingInProgress: false,
      bookingError: null,
      multiSelectFacility: null,
      selectedSlot: { 
        id: 1, 
        start_time: '10:00', 
        end_time: '11:00',
        status: 'RESERVED',
        booking_id: 101,
      },
      selectedFacility: { name: 'Lab 1', token_cost_per_hour: 2 },
      selectedSlots: [],
      ...overrides,
    });
  };

  it('renders Force Cancel button for admin in view mode with RESERVED slot', () => {
    setupContext('admin', 'view');
    render(<ReservationDrawer selectedDate="2023-10-10" />);
    
    expect(screen.getByRole('button', { name: /Force Cancel \(Admin\)/i })).toBeInTheDocument();
  });

  it('does not render Force Cancel button for student in view mode', () => {
    setupContext('student', 'view');
    render(<ReservationDrawer selectedDate="2023-10-10" />);
    
    expect(screen.queryByRole('button', { name: /Force Cancel \(Admin\)/i })).not.toBeInTheDocument();
  });

  it('navigates to admin_cancel mode when clicking Force Cancel', async () => {
    setupContext('admin', 'view');
    const user = userEvent.setup();
    render(<ReservationDrawer selectedDate="2023-10-10" />);
    
    const forceBtn = screen.getByRole('button', { name: /Force Cancel \(Admin\)/i });
    await user.click(forceBtn);
    
    expect(mockSetDrawerMode).toHaveBeenCalledWith('admin_cancel');
  });

  it('renders AdminCancelMode UI when in admin_cancel mode', () => {
    setupContext('admin', 'admin_cancel');
    render(<ReservationDrawer selectedDate="2023-10-10" />);
    
    expect(screen.getByText('Force Cancel Booking')).toBeInTheDocument();
    expect(screen.getByText(/bypassing the cancellation policy/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Reason for force cancellation/i)).toBeInTheDocument();
  });

  it('disables Force Cancel button if reason is empty', () => {
    setupContext('admin', 'admin_cancel');
    render(<ReservationDrawer selectedDate="2023-10-10" />);
    
    const confirmBtn = screen.getByRole('button', { name: /^Force Cancel$/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('calls forceCancelBooking with bookingId and reason on submit', async () => {
    setupContext('admin', 'admin_cancel');
    adminApi.forceCancelBooking.mockResolvedValueOnce({ id: 101, status: 'CANCELLED' });
    const user = userEvent.setup();
    
    render(<ReservationDrawer selectedDate="2023-10-10" />);
    
    const reasonInput = screen.getByPlaceholderText(/Reason for force cancellation/i);
    await user.type(reasonInput, 'Emergency closing');
    
    const confirmBtn = screen.getByRole('button', { name: /^Force Cancel$/i });
    await user.click(confirmBtn);
    
    await waitFor(() => {
      expect(adminApi.forceCancelBooking).toHaveBeenCalledWith(101, { reason: 'Emergency closing' });
      expect(mockTriggerRefresh).toHaveBeenCalled();
    });
  });
});
