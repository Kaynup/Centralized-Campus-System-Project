import { useState, useEffect, useCallback } from "react";
import { fetchFacilitySlots } from "../api/facilityApi";
import { markPastBookings } from "../utils/slotLogic";

export function useSlotsForDate(
  facilities,
  selectedDate,
  refreshTrigger = 0
) {
  const [slotsMap, setSlotsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fetchId, setFetchId] = useState(0);

  const refetch = useCallback(() => {
    setFetchId((id) => id + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      if (!facilities.length) {
        setSlotsMap({});
        setIsLoading(false);
        return;
      }

      try {
        const results = await Promise.all(
          facilities.map((facility) =>
            fetchFacilitySlots(facility.id, selectedDate)
          )
        );

        const map = {};

        facilities.forEach((facility, index) => {
          const rawSlots = results[index] || [];
          map[facility.id] = markPastBookings(rawSlots, selectedDate);
        });

        if (!cancelled) {
          setSlotsMap(map);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load slots"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [facilities, selectedDate, refreshTrigger, fetchId]);

  return {
    slotsMap,
    isLoading,
    error,
    refetch,
  };
}