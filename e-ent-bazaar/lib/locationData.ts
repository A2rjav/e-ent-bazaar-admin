// Location data for India and Nepal
export interface StateDistrict {
  state: string;
  districts: string[];
}

export interface DistrictCity {
  district: string;
  cities: string[];
}

import { indianStatesDistricts } from '../data/indian_states_districts';
import { nepalProvincesDistricts, getProvinces, getDistrictsByProvince } from '../data/nepal_provinces_districts';

// Get all Indian states
export const getStates = (): string[] => {
  return Object.keys(indianStatesDistricts);
};

// Get districts by state
export const getDistrictsByState = (stateName: string): string[] => {
  return indianStatesDistricts[stateName] || [];
};

// Get all Nepali provinces
export const getNepalProvinces = (): string[] => {
  return getProvinces();
};

// Get districts by province (Nepal)
export const getNepalDistrictsByProvince = (provinceName: string): string[] => {
  return getDistrictsByProvince(provinceName);
};

// Get all available states/provinces based on country
export const getAvailableStates = (country: string): string[] => {
  if (country === 'India') {
    return getStates();
  } else if (country === 'Nepal') {
    return getNepalProvinces();
  }
  return [];
};

// Get available districts based on country and state/province
export const getAvailableDistricts = (country: string, stateName: string): string[] => {
  if (country === 'India') {
    return getDistrictsByState(stateName);
  } else if (country === 'Nepal') {
    return getNepalDistrictsByProvince(stateName);
  }
  return [];
};

// Extract unique cities from manufacturers data
export const extractCitiesFromManufacturers = (manufacturers: any[]): string[] => {
  const cities = new Set<string>();
  manufacturers.forEach(manufacturer => {
    if (manufacturer.city) {
      cities.add(manufacturer.city);
    }
  });
  return Array.from(cities).sort();
};

// Extract unique states from manufacturers data
export const extractStatesFromManufacturers = (manufacturers: any[]): string[] => {
  const states = new Set<string>();
  manufacturers.forEach(manufacturer => {
    if (manufacturer.state) {
      states.add(manufacturer.state);
    }
  });
  return Array.from(states).sort();
};

// Extract unique districts from manufacturers data for a specific state
export const extractDistrictsFromManufacturers = (manufacturers: any[], stateName: string): string[] => {
  const districts = new Set<string>();
  manufacturers.forEach(manufacturer => {
    if (manufacturer.state === stateName && manufacturer.district) {
      districts.add(manufacturer.district);
    }
  });
  return Array.from(districts).sort();
};

// Location validation
export const validateLocation = (country: string, state: string, district: string): boolean => {
  if (country === 'India') {
    const states = getStates();
    if (!states.includes(state)) {
      return false;
    }
    
    const districts = getDistrictsByState(state);
    return districts.includes(district);
  } else if (country === 'Nepal') {
    const provinces = getNepalProvinces();
    if (!provinces.includes(state)) {
      return false;
    }
    
    const districts = getNepalDistrictsByProvince(state);
    return districts.includes(district);
  }
  return false;
}; 