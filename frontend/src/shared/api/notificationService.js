// ---------------------------------------------------------------------
// MOCK MODE (temporary — backend endpoints don't exist yet)
//
// Everything below `USE_MOCK_DATA` simulates the same 4 functions this
// file will call the real API for once the backend ships. To switch:
//   1. Set USE_MOCK_DATA = false
//   2. That's it — NotificationContext.jsx and every component only ever
//      import these 4 function names, never which implementation backs
//      them, so nothing else in the app needs to change.
// ---------------------------------------------------------------------

import { authClient } from './axiosClient';

const BASE_URL = '/api/notifications';

const USE_MOCK_DATA = true; // <-- flip to false once the backend is live

// Notifications are a cross-domain, user-scoped feed (recipient_id -> a
// user, spanning equipment/facility/marketplace/core) — same reasoning as
// `walletClient`, this belongs on the centralized_core service.
const MOCK_USER_ID = 'user_1001';

function minutesAgo(mins) {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}
function hoursAgo(hrs) {
  return minutesAgo(hrs * 60);
}
function daysAgo(days) {
  return hoursAgo(days * 24);
}

// 15 realistic notifications, all 4 domains, mixed read/unread and ages —
// fields match the backend model exactly (no invented fields).
let mockNotifications = [
  {
    id: 1,
    recipient_id: MOCK_USER_ID,
    domain: 'core',
    notification_type: 'wallet_topup',
    title: 'Wallet top-up successful',
    message: 'Your wallet was credited with ₹500. New balance: ₹1,240.',
    is_read: false,
    reference_id: null,
    created_at: minutesAgo(6),
  },
  {
    id: 2,
    recipient_id: MOCK_USER_ID,
    domain: 'facility',
    notification_type: 'booking_approved',
    title: 'Booking approved',
    message: 'Your reservation for Seminar Hall B on Jul 8, 10:00 AM has been approved.',
    is_read: false,
    reference_id: 204,
    created_at: minutesAgo(25),
  },
  {
    id: 3,
    recipient_id: MOCK_USER_ID,
    domain: 'equipment',
    notification_type: 'return_reminder',
    title: 'Equipment return reminder',
    message: 'Your rented DSLR Camera is due for return tomorrow by 5:00 PM.',
    is_read: false,
    reference_id: 58,
    created_at: hoursAgo(2),
  },
  {
    id: 4,
    recipient_id: MOCK_USER_ID,
    domain: 'marketplace',
    notification_type: 'item_sold',
    title: 'Marketplace item sold',
    message: 'Your listing "Scientific Calculator (Casio fx-991)" was purchased by another student.',
    is_read: false,
    reference_id: 812,
    created_at: hoursAgo(3),
  },
  {
    id: 5,
    recipient_id: MOCK_USER_ID,
    domain: 'core',
    notification_type: 'announcement',
    title: 'New campus announcement',
    message: 'Semester exam schedule has been published on the student portal.',
    is_read: true,
    reference_id: null,
    created_at: hoursAgo(5),
  },
  {
    id: 6,
    recipient_id: MOCK_USER_ID,
    domain: 'core',
    notification_type: 'password_changed',
    title: 'Password changed',
    message: "Your account password was changed successfully. If this wasn't you, contact support immediately.",
    is_read: true,
    reference_id: null,
    created_at: hoursAgo(9),
  },
  {
    id: 7,
    recipient_id: MOCK_USER_ID,
    domain: 'facility',
    notification_type: 'booking_rejected',
    title: 'Booking rejected',
    message: 'Your request for Basketball Court on Jul 6 was rejected due to a scheduling conflict.',
    is_read: true,
    reference_id: 198,
    created_at: hoursAgo(14),
  },
  {
    id: 8,
    recipient_id: MOCK_USER_ID,
    domain: 'equipment',
    notification_type: 'rental_approved',
    title: 'Rental approved',
    message: 'Your request to rent a Projector has been approved. Pick up from the equipment desk today.',
    is_read: false,
    reference_id: 61,
    created_at: hoursAgo(20),
  },
  {
    id: 9,
    recipient_id: MOCK_USER_ID,
    domain: 'marketplace',
    notification_type: 'new_offer',
    title: 'New offer received',
    message: 'Someone made an offer of ₹350 on your listing "Engineering Drawing Kit".',
    is_read: true,
    reference_id: 799,
    created_at: daysAgo(1),
  },
  {
    id: 10,
    recipient_id: MOCK_USER_ID,
    domain: 'equipment',
    notification_type: 'overdue_reminder',
    title: 'Equipment overdue',
    message: 'Your rented Tripod Stand is overdue. Late fees may apply if not returned within 24 hours.',
    is_read: false,
    reference_id: 47,
    created_at: daysAgo(1),
  },
  {
    id: 11,
    recipient_id: MOCK_USER_ID,
    domain: 'facility',
    notification_type: 'reservation_reminder',
    title: 'Reservation starting soon',
    message: 'Your slot for Conference Room A starts in 1 hour.',
    is_read: true,
    reference_id: 210,
    created_at: daysAgo(2),
  },
  {
    id: 12,
    recipient_id: MOCK_USER_ID,
    domain: 'marketplace',
    notification_type: 'listing_flagged',
    title: 'Listing under review',
    message: 'Your listing "Used Chemistry Lab Coat" was flagged and is being reviewed by an admin.',
    is_read: true,
    reference_id: 780,
    created_at: daysAgo(3),
  },
  {
    id: 13,
    recipient_id: MOCK_USER_ID,
    domain: 'core',
    notification_type: 'security_alert',
    title: 'New device login detected',
    message: 'Your account was accessed from a new device in Lucknow, Uttar Pradesh.',
    is_read: true,
    reference_id: null,
    created_at: daysAgo(4),
  },
  {
    id: 14,
    recipient_id: MOCK_USER_ID,
    domain: 'facility',
    notification_type: 'facility_added',
    title: 'New facility added',
    message: 'Sports Complex Hall is now open for reservations campus-wide.',
    is_read: true,
    reference_id: 230,
    created_at: daysAgo(6),
  },
  {
    id: 15,
    recipient_id: MOCK_USER_ID,
    domain: 'equipment',
    notification_type: 'return_confirmed',
    title: 'Equipment return confirmed',
    message: 'Your return of the Whiteboard Marker Kit has been confirmed. Thanks for returning it on time!',
    is_read: true,
    reference_id: 39,
    created_at: daysAgo(7),
  },
];

function mockDelay() {
  const ms = 300 + Math.round(Math.random() * 200); // 300–500ms
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortedByNewest(list) {
  return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ---------------------------------------------------------------------
// Public API — same 4 exported functions regardless of USE_MOCK_DATA
// ---------------------------------------------------------------------

export async function fetchNotifications() {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return sortedByNewest(mockNotifications);
  }

  const { data } = await authClient.get(BASE_URL);
  return data;
}

export async function markNotificationRead(id) {
  if (USE_MOCK_DATA) {
    await mockDelay();
    mockNotifications = mockNotifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    return { success: true };
  }

  const { data } = await authClient.patch(`${BASE_URL}/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  if (USE_MOCK_DATA) {
    await mockDelay();
    mockNotifications = mockNotifications.map((n) => ({ ...n, is_read: true }));
    return { success: true };
  }

  const { data } = await authClient.patch(`${BASE_URL}/read-all`);
  return data;
}

export async function clearReadNotifications() {
  if (USE_MOCK_DATA) {
    await mockDelay();
    mockNotifications = mockNotifications.filter((n) => !n.is_read);
    return { success: true };
  }

  const { data } = await authClient.delete(`${BASE_URL}/read`);
  return data;
}

export default {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
};
