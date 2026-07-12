import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as facilityApi from '../api/facilityApi';
import { MOCK_FACILITIES } from '../api/mockData';

const FacilityContext = createContext(null);

export function FacilityProvider({ children }) {
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupFilter, setGroupFilter] = useState(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  const loadFacilities = async (filters = {}) => {
    setIsLoading(true);
    setError(null);

    // DEV mock bypass removed

    /* ── PROD PATH ───────────────────────────────────────────────────────── */
    try {
      const data = await facilityApi.fetchFacilities(filters);
      setFacilities(data);
    } catch (err) {
      console.error('Failed to load facilities:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load facilities');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load facilities on mount
  useEffect(() => {
    loadFacilities();
  }, []);

  const getFacilitiesByGroup = useMemo(() => {
    return () => {
      const map = { Courts: [], Classrooms: [], Labs: [], Halls: [] };
      facilities.forEach((facility) => {
        const group = facility.group;
        if (map[group]) {
          map[group].push(facility);
        } else {
          // Fallback/dynamic groups
          map[group] = [facility];
        }
      });
      return map;
    };
  }, [facilities]);

  return (
    <FacilityContext.Provider
      value={{
        facilities,
        isLoading,
        error,
        groupFilter,
        setGroupFilter,
        availableOnly,
        setAvailableOnly,
        loadFacilities,
        getFacilitiesByGroup
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacilities() {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacilities must be used within a FacilityProvider');
  }
  return context;
}
