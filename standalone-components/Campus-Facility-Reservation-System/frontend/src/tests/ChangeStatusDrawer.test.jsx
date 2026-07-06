import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChangeStatusDrawer from '../components/calendar/ChangeStatusDrawer';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../contexts/ToastContext';
import * as adminApi from '../api/adminApi';

vi.mock('../contexts/BookingContext', () => ({
  useBooking: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'admin' } })),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/adminApi', () => ({
  toggleSlotAvailability: vi.fn(),
}));

describe('ChangeStatusDrawer', () => {
  const mockCloseDrawer = vi.fn();
  const mockTriggerRefresh = vi.fn();
  const mockSetMultiSelectMode = vi.fn();
  const mockShowError = vi.fn();
  const mockShowSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    });
    // Mock window.location.reload for JSDOM
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn() },
    });
  });

  const setupContext = (overrides = {}) => {
    useBooking.mockReturnValue({
      isDrawerOpen: true,
      drawerType: 'changeStatus',
      closeDrawer: mockCloseDrawer,
      selectedSlot: { id: 1, start_time: '2023-10-10T10:00:00Z', end_time: '2023-10-10T11:00:00Z', is_available: true },
      selectedFacility: { id: 1, name: 'Lab 1' },
      selectedSlots: [],
      drawerMode: 'single',
      triggerRefresh: mockTriggerRefresh,
      setMultiSelectMode: mockSetMultiSelectMode,
      ...overrides,
    });
  };

  it('renders nothing if drawer is not open', () => {
    setupContext({ isDrawerOpen: false });
    const { container } = render(<ChangeStatusDrawer selectedDate="2023-10-10" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly when open', () => {
    setupContext();
    render(<ChangeStatusDrawer selectedDate="2023-10-10" />);
    expect(screen.getByText('Manage Slot Status')).toBeInTheDocument();
    expect(screen.getByText('Lab 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Maintenance/i)).toBeInTheDocument();
  });

  it('disables Confirm Unavailable button if reason is not provided', async () => {
    setupContext();
    render(<ChangeStatusDrawer selectedDate="2023-10-10" />);

    const makeUnavailableBtn = screen.getByRole('button', { name: /Make Unavailable/i });
    expect(makeUnavailableBtn).toBeDisabled();
  });

  it('calls API and closes drawer on successful status change', async () => {
    setupContext();
    adminApi.toggleSlotAvailability.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<ChangeStatusDrawer selectedDate="2023-10-10" />);

    const textarea = screen.getByPlaceholderText(/e\.g\. Maintenance/i);
    await user.type(textarea, 'Maintenance required');

    const makeUnavailableBtn = screen.getByRole('button', { name: /Make Unavailable/i });
    await user.click(makeUnavailableBtn);

    expect(adminApi.toggleSlotAvailability).toHaveBeenCalledWith({
      facility_id: 1,
      booking_date: '2023-10-10',
      slot_ids: [1],
      is_available: false,
      reason: 'Maintenance required',
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('Successfully marked 1 slot(s) as unavailable.');
      expect(mockTriggerRefresh).toHaveBeenCalled();
      expect(mockCloseDrawer).toHaveBeenCalled();
      expect(mockSetMultiSelectMode).toHaveBeenCalledWith(false);
    });
  });

  it('shows error if API call fails', async () => {
    setupContext();
    adminApi.toggleSlotAvailability.mockRejectedValueOnce(new Error('Network Error'));
    const user = userEvent.setup();
    render(<ChangeStatusDrawer selectedDate="2023-10-10" />);

    const textarea = screen.getByPlaceholderText(/e\.g\. Maintenance/i);
    await user.type(textarea, 'Maintenance');

    const makeUnavailableBtn = screen.getByRole('button', { name: /Make Unavailable/i });
    await user.click(makeUnavailableBtn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to toggle slots');
    });
    expect(mockCloseDrawer).not.toHaveBeenCalled();
  });
});
