import { supabase } from './supabase';

// Customer types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  state: string;
  district: string;
  city: string;
  pin_code: string;
  address?: string;
  gst_details?: string;
  vat_number?: string;
  pan_number?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerInsert {
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  state: string;
  district: string;
  city: string;
  pin_code: string;
  address?: string;
  gst_details?: string;
  vat_number?: string;
  pan_number?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// Order types
export interface OrderInsert {
  customer_id: string;
  manufacturer_id: string;
  product_id: string;
  quantity: number;
  price: number;
  total_amount: number;
  delivery_address: string;
  contact_number: string;
  status?: string;
  tracking_number?: string;
}

export interface Order extends OrderInsert {
  id: string;
  created_at: string;
  updated_at: string;
}

// Rating types
export interface RatingInsert {
  customer_id: string;
  manufacturer_id: string;
  rating: number;
  comment?: string;
}

export interface Rating extends RatingInsert {
  id: string;
  created_at: string;
}

// Inquiry types
export interface InquiryInsert {
  customer_id: string;
  manufacturer_id: string;
  subject: string;
  message: string;
  status?: string;
}

export interface Inquiry extends InquiryInsert {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get customer by ID
 */
export const getCustomerById = async (customerId: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from('endcustomers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getCustomerById:', error);
    return null;
  }
};

/**
 * Get customer by phone number
 */
export const getCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from('endcustomers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error) {
      console.error('Error fetching customer by phone:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getCustomerByPhone:', error);
    return null;
  }
};

/**
 * Update customer profile
 */
export const updateCustomerProfile = async (
  customerId: string,
  updates: Partial<CustomerInsert>
): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from('endcustomers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in updateCustomerProfile:', error);
    return null;
  }
};

/**
 * Save customer rating
 */
export const saveRating = async (ratingData: RatingInsert): Promise<Rating | null> => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .insert(ratingData)
      .select()
      .single();

    if (error) {
      console.error('Error saving rating:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in saveRating:', error);
    return null;
  }
};

/**
 * Get manufacturer ratings
 */
export const getManufacturerRatings = async (manufacturerId: string): Promise<Rating[]> => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('manufacturer_id', manufacturerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching manufacturer ratings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getManufacturerRatings:', error);
    return [];
  }
};

/**
 * Get customer's average rating for a manufacturer
 */
export const getCustomerRatingForManufacturer = async (
  customerId: string,
  manufacturerId: string
): Promise<Rating | null> => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('customer_id', customerId)
      .eq('manufacturer_id', manufacturerId)
      .single();

    if (error) {
      console.error('Error fetching customer rating:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getCustomerRatingForManufacturer:', error);
    return null;
  }
}; 