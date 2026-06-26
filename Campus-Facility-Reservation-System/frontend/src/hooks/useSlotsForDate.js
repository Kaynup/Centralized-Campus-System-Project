import { useState, useEffect, useCallback } from 'react';
import { generateMockSlotsForAllFacilities } from '../api/mockData';
import { fetchFacilitySlots } from '../api/facilityApi';
import { markPastBookings } from '../utils/slotLogic';

/**
 * useSlotsForDate
 *
 * Centralised slot-loading hook that mirrors the same DEV / PROD pattern
 * used by AuthContext:
 *
 *   DEV  (import.meta.env.DEV === true)
 *        → generateMockSlotsForAllFacilities() — no network, always works
 *
 *   PROD (import.meta.env.DEV === false)
 *        → Promise.all(facilities.map(f => fetchFacilitySlots(f.id, date)))
 *
 * @param {Array}  facilities     - flat list of facility objects
 * @param {string} selectedDate   - YYYY-MM-DD
 * @param {number} refreshTrigger - increment this to force a re-fetch
 *                                  (BookingContext.refreshTrigger)
 */
export function useSlotsForDate(facilities, selectedDate, refreshTrigger = 0) {
  const [slotsMap, setSlotsMap]   = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);

  // Internal fetch-id so callers can imperatively trigger a refetch
  const [fetchId, setFetchId] = useState(0);
  const refetch = useCallback(() => setFetchId(id => id + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      /* ── DEV PATH ─────────────────────────────────────────────────────────
       * Use mock data generator — no backend required.
       * refreshTrigger increments cause re-generation (simulates live update).
       * ─────────────────────────────────────────────────────────────────── */
      if (import.meta.env.DEV) {
        const raw = generateMockSlotsForAllFacilities(selectedDate);
        const processed = {};
        Object.entries(raw).forEach(([fid, bookings]) => {
          processed[fid] = markPastBookings(bookings, selectedDate);
        });
        if (!cancelled) {
          setSlotsMap(processed);
          setIsLoading(false);
        }
        return;
      }

      /* ── PROD PATH ────────────────────────────────────────────────────────
       * Fetch slots for all facilities in parallel.
       * Wait until we actually have facilities before attempting requests.
       * ─────────────────────────────────────────────────────────────────── */
      if (facilities.length === 0) {
        if (!cancelled) { setSlotsMap({}); setIsLoading(false); }
        return;
      }

      try {
        const results = await Promise.all(
          facilities.map(f => fetchFacilitySlots(f.id, selectedDate))
        );
        const processed = {};
        facilities.forEach((f, i) => {
          processed[f.id] = markPastBookings(results[i] ?? [], selectedDate);
        });
        if (!cancelled) {
          setSlotsMap(processed);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[useSlotsForDate] Failed to fetch slots:', err);
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load slots');
          setIsLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };

    // Re-run whenever the date changes, a booking triggers a refresh,
    // or the caller manually calls refetch().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, refreshTrigger, fetchId, facilities.length]);

  return { slotsMap, isLoading, error, refetch };
}
