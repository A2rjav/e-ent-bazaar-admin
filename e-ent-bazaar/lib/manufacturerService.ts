import { supabase } from './supabase';

// Manufacturer types
export interface Manufacturer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  gst_number: string;
  pan_number: string;
  exim_code?: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  address: string;
  latitude?: number;
  longitude?: number;
  business_type: string;
  interested_in_industry_quiz?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManufacturerInsert {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  gst_number: string;
  pan_number: string;
  exim_code?: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  address: string;
  latitude?: number;
  longitude?: number;
  business_type: string;
  interested_in_industry_quiz?: boolean;
}

export interface ManufacturerWithProducts extends Manufacturer {
  products: any[];
  distance?: number;
}

/**
 * Get manufacturer by ID
 */
export const getManufacturerById = async (manufacturerId: string): Promise<Manufacturer | null> => {
  try {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('*')
      .eq('id', manufacturerId)
      .single();

    if (error) {
      console.error('Error fetching manufacturer:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getManufacturerById:', error);
    return null;
  }
};

/**
 * Get manufacturer by phone number
 */
export const getManufacturerByPhone = async (phone: string): Promise<Manufacturer | null> => {
  try {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error) {
      console.error('Error fetching manufacturer by phone:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getManufacturerByPhone:', error);
    return null;
  }
};

/**
 * Get manufacturer by email
 */
export const getManufacturerByEmail = async (email: string): Promise<Manufacturer | null> => {
  try {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching manufacturer by email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getManufacturerByEmail:', error);
    return null;
  }
};

/**
 * Update manufacturer profile
 */
export const updateManufacturerProfile = async (
  manufacturerId: string,
  updates: Partial<ManufacturerInsert>
): Promise<Manufacturer | null> => {
  try {
    const { data, error } = await supabase
      .from('manufacturers')
      .update(updates)
      .eq('id', manufacturerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating manufacturer:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in updateManufacturerProfile:', error);
    return null;
  }
};

/**
 * Get nearby manufacturers
 */
export const getNearbyManufacturers = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 100
): Promise<ManufacturerWithProducts[]> => {
  try {
    // Get all manufacturers with their products
    const { data, error } = await supabase
      .from('manufacturers')
      .select(`
        *,
        products(*)
      `);

    if (error) {
      console.error('Error fetching manufacturers:', error);
      return [];
    }

    // Filter manufacturers within radius and calculate distance
    const nearbyManufacturers = (data || [])
      .filter(manufacturer => 
        manufacturer.latitude && 
        manufacturer.longitude
      )
      .map(manufacturer => {
        const distance = calculateDistance(
          latitude,
          longitude,
          manufacturer.latitude!,
          manufacturer.longitude!
        );
        return {
          ...manufacturer,
          distance
        };
      })
      .filter(manufacturer => manufacturer.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return nearbyManufacturers;
  } catch (error) {
    console.error('Exception in getNearbyManufacturers:', error);
    return [];
  }
};

/**
 * Get manufacturers by location filters
 */
export const getManufacturersByLocation = async (
  state?: string,
  district?: string,
  city?: string
): Promise<ManufacturerWithProducts[]> => {
  try {
    let query = supabase
      .from('manufacturers')
      .select(`
        *,
        products(*)
      `);

    if (state && state !== '__all__') {
      query = query.eq('state', state);
    }
    if (district && district !== '__all__') {
      query = query.eq('district', district);
    }
    if (city && city !== '__all__') {
      query = query.eq('city', city);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching manufacturers by location:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getManufacturersByLocation:', error);
    return [];
  }
};

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Save a manufacturer rating
 */
export const saveManufacturerRating = async ({
  customer_id,
  manufacturer_id,
  rating,
  comment,
}: {
  customer_id: string;
  manufacturer_id: string;
  rating: number;
  comment?: string;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('manufacturer_ratings')
      .insert([
        {
          customer_id,
          manufacturer_id,
          rating,
          comment,
        },
      ]);
    if (error) {
      console.error('Error saving manufacturer rating:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Exception in saveManufacturerRating:', error);
    return false;
  }
}; 