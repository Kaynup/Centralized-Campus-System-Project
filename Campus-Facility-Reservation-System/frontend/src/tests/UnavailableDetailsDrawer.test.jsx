import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UnavailableDetailsDrawer from '../components/calendar/UnavailableDetailsDrawer';
import { useBooking } from '../contexts/BookingContext';

vi.mock('../contexts/BookingContext', () => ({
  useBooking: vi.fn(),
}));

describe('UnavailableDetailsDrawer', () => {
  const mockCloseDrawer = vi.fn();

  const setupContext = (overrides = {}) => {
    useBooking.mockReturnValue({
      isDrawerOpen: true,
      drawerType: 'unavailableDetails',
      closeDrawer: mockCloseDrawer,
      selectedSlot: { id: 1, start_time: '10:00', end_time: '11:00', unavailability_reason: 'Closed for maintenance' },
      selectedFacility: { name: 'Lab 2' },
      ...overrides,
    });
  };

  it('renders nothing if not open or wrong type', () => {
    setupContext({ isDrawerOpen: false });
    const { container: container1 } = render(<UnavailableDetailsDrawer selectedDate="2023-10-10" />);
    expect(container1).toBeEmptyDOMElement();

    setupContext({ isDrawerOpen: true, drawerType: 'other' });
    const { container: container2 } = render(<UnavailableDetailsDrawer selectedDate="2023-10-10" />);
    expect(container2).toBeEmptyDOMElement();
  });

  it('renders correctly when open', () => {
    setupContext();
    render(<UnavailableDetailsDrawer selectedDate="2023-10-10" />);
    
    expect(screen.getByText('Slot Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Lab 2')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('Closed for maintenance')).toBeInTheDocument();
  });

  it('renders default text when no unavailability reason is provided', () => {
    setupContext({
      selectedSlot: { id: 1, start_time: '10:00', end_time: '11:00' }
    });
    render(<UnavailableDetailsDrawer selectedDate="2023-10-10" />);
    
    expect(screen.getByText(/This slot is currently unavailable for booking/i)).toBeInTheDocument();
  });
});
