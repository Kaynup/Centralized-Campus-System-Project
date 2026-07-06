import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FacilityCalendarPage from '../pages/FacilityCalendarPage';
import { useBooking } from '../contexts/BookingContext';
import { useAuth } from '../contexts/AuthContext';
import { useFacilities } from '../contexts/FacilityContext';
import { useSlotsForDate } from '../hooks/useSlotsForDate';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/BookingContext', () => ({
  useBooking: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/FacilityContext', () => ({
  useFacilities: vi.fn(),
}));

vi.mock('../hooks/useSlotsForDate', () => ({
  useSlotsForDate: vi.fn(),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(() => ({ showWarning: vi.fn() })),
}));

// Mock the Drawer components
vi.mock('../components/calendar/ReservationDrawer', () => ({
  default: () => <div data-testid="reservation-drawer" />
}));
vi.mock('../components/calendar/ChangeStatusDrawer', () => ({
  default: () => <div data-testid="change-status-drawer" />
}));
vi.mock('../components/calendar/UnavailableDetailsDrawer', () => ({
  default: () => <div data-testid="unavailable-details-drawer" />
}));
vi.mock('../components/calendar/PastDetailsDrawer', () => ({
  default: () => <div data-testid="past-details-drawer" />
}));

describe('FacilityCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    useAuth.mockReturnValue({ user: { id: 1, role: 'student', token_balance: 50 } });
    useFacilities.mockReturnValue({ facilities: [], isLoading: false, error: null, loadFacilities: vi.fn() });
    useSlotsForDate.mockReturnValue({ slotsMap: {}, isLoading: false, error: null, refetch: vi.fn() });
  });

  const setupBookingContext = (drawerType) => {
    useBooking.mockReturnValue({
      drawerType,
      isDrawerOpen: true,
      openBookingDrawer: vi.fn(),
      refreshTrigger: 0,
      multiSelectMode: false,
      selectedSlots: [],
      multiSelectFacility: null,
      selectedFacility: null,
      setMultiSelectMode: vi.fn(),
      toggleSlotSelection: vi.fn(),
      selectSlotRange: vi.fn(),
      reserveSelectedSlots: vi.fn(),
    });
  };

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <FacilityCalendarPage />
      </MemoryRouter>
    );
  };

  it('renders without any drawer when type is null', () => {
    setupBookingContext(null);
    renderPage();
    expect(screen.queryByTestId('reservation-drawer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('change-status-drawer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unavailable-details-drawer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('past-details-drawer')).not.toBeInTheDocument();
  });

  it('renders ReservationDrawer when drawerType is reservation', () => {
    setupBookingContext('reservation');
    renderPage();
    expect(screen.getByTestId('reservation-drawer')).toBeInTheDocument();
  });

  it('renders ChangeStatusDrawer when drawerType is changeStatus', () => {
    setupBookingContext('changeStatus');
    renderPage();
    expect(screen.getByTestId('change-status-drawer')).toBeInTheDocument();
  });

  it('renders UnavailableDetailsDrawer when drawerType is unavailableDetails', () => {
    setupBookingContext('unavailableDetails');
    renderPage();
    expect(screen.getByTestId('unavailable-details-drawer')).toBeInTheDocument();
  });

  it('renders PastDetailsDrawer when drawerType is pastDetails', () => {
    setupBookingContext('pastDetails');
    renderPage();
    expect(screen.getByTestId('past-details-drawer')).toBeInTheDocument();
  });
});
