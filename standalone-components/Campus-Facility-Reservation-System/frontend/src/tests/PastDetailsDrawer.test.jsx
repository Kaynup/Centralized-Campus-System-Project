import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PastDetailsDrawer from '../components/calendar/PastDetailsDrawer';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../contexts/ToastContext';
import * as adminApi from '../api/adminApi';

vi.mock('../contexts/BookingContext', () => ({
  useBooking: vi.fn(),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/adminApi', () => ({
  getSlotHistory: vi.fn(),
}));

describe('PastDetailsDrawer', () => {
  const mockCloseDrawer = vi.fn();
  const mockShowError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showError: mockShowError });
  });

  const setupContext = (overrides = {}) => {
    useBooking.mockReturnValue({
      isDrawerOpen: true,
      drawerType: 'pastDetails',
      closeDrawer: mockCloseDrawer,
      selectedSlot: { id: 1, start_time: '10:00', end_time: '11:00' },
      selectedFacility: { id: 1, name: 'Lab 3' },
      ...overrides,
    });
  };

  it('renders nothing if not open or wrong type', () => {
    setupContext({ isDrawerOpen: false });
    const { container: container1 } = render(<PastDetailsDrawer selectedDate="2023-10-10" />);
    expect(container1).toBeEmptyDOMElement();
  });

  it('renders basic slot info and shows loading initially', async () => {
    setupContext();
    adminApi.getSlotHistory.mockReturnValue(new Promise(() => {})); // pending promise
    
    render(<PastDetailsDrawer selectedDate="2023-10-10" />);
    
    expect(screen.getByText('Past Slot Details')).toBeInTheDocument();
    expect(screen.getByText('Lab 3')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders history correctly when loaded', async () => {
    setupContext();
    const mockHistory = {
      is_available: true,
      bookings: [
        { userName: 'John Doe', userEmail: 'john@edu.com', status: 'COMPLETED', depositPaid: 2 }
      ]
    };
    adminApi.getSlotHistory.mockResolvedValueOnce(mockHistory);

    render(<PastDetailsDrawer selectedDate="2023-10-10" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe (john@edu.com)')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('renders no bookings recorded correctly', async () => {
    setupContext();
    adminApi.getSlotHistory.mockResolvedValueOnce({
      is_available: true,
      bookings: []
    });

    render(<PastDetailsDrawer selectedDate="2023-10-10" />);

    await waitFor(() => {
      expect(screen.getByText('No bookings recorded for this slot.')).toBeInTheDocument();
    });
  });

  it('shows error toast on history fetch failure', async () => {
    setupContext();
    adminApi.getSlotHistory.mockRejectedValueOnce(new Error('Failed'));

    render(<PastDetailsDrawer selectedDate="2023-10-10" />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to load slot history');
    });
  });
});
