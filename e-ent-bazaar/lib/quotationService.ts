import { supabase } from './supabase';

// Quotation types
export interface QuotationInsert {
  customer_id: string;
  manufacturer_id: string;
  product_id: string;
  quantity: number;
  quoted_price: number;
  total_amount: number;
  delivery_time?: string;
  payment_terms?: string;
  validity_period?: string;
  status?: string;
  message?: string;
}

export interface QuotationResponse {
  response_message: string;
  response_quantity: number;
  response_price: number;
  offer_expiry: string;
}

export interface Quotation extends QuotationInsert {
  id: string;
  created_at: string;
  updated_at: string;
  response_message?: string;
  response_quantity?: number;
  response_price?: number;
  offer_expiry?: string;
  responded_at?: string;
}

export interface QuotationWithDetails extends Quotation {
  customer_name: string;
  manufacturer_name: string;
  manufacturer_company_name?: string;
  product_name: string;
  product_description?: string;
  product_image_url?: string;
}

/**
 * Create a new quotation
 */
export const createQuotation = async (quotationData: QuotationInsert): Promise<Quotation | null> => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .insert({
        ...quotationData,
        status: quotationData.status || 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quotation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in createQuotation:', error);
    return null;
  }
};

/**
 * Get customer quotations with details
 */
export const getCustomerQuotations = async (customerId: string): Promise<QuotationWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers:customer_id(name),
        manufacturers:manufacturer_id(name, company_name),
        products:product_id(name, description, image_url)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer quotations:', error);
      return [];
    }

    return (data || []).map(quotation => ({
      ...quotation,
      customer_name: quotation.customers?.name || 'Unknown',
      manufacturer_name: quotation.manufacturers?.name || 'Unknown',
      manufacturer_company_name: quotation.manufacturers?.company_name,
      product_name: quotation.products?.name || 'Unknown',
      product_description: quotation.products?.description,
      product_image_url: quotation.products?.image_url
    }));
  } catch (error) {
    console.error('Exception in getCustomerQuotations:', error);
    return [];
  }
};

/**
 * Get quotation by ID with details
 */
export const getQuotationById = async (quotationId: string): Promise<QuotationWithDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers:customer_id(name),
        manufacturers:manufacturer_id(name, company_name),
        products:product_id(name, description, image_url)
      `)
      .eq('id', quotationId)
      .single();

    if (error) {
      console.error('Error fetching quotation:', error);
      return null;
    }

    return {
      ...data,
      customer_name: data.customers?.name || 'Unknown',
      manufacturer_name: data.manufacturers?.name || 'Unknown',
      manufacturer_company_name: data.manufacturers?.company_name,
      product_name: data.products?.name || 'Unknown',
      product_description: data.products?.description,
      product_image_url: data.products?.image_url
    };
  } catch (error) {
    console.error('Exception in getQuotationById:', error);
    return null;
  }
};

/**
 * Update quotation status and optionally add response
 */
export const updateQuotationStatus = async (
  quotationId: string, 
  status: string, 
  response?: QuotationResponse
): Promise<Quotation | null> => {
  try {
    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };

    if (response) {
      updateData.response_message = response.response_message;
      updateData.response_quantity = response.response_quantity;
      updateData.response_price = response.response_price;
      updateData.offer_expiry = response.offer_expiry;
      updateData.responded_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', quotationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quotation status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in updateQuotationStatus:', error);
    return null;
  }
};

/**
 * Get quotations by status
 */
export const getQuotationsByStatus = async (
  customerId: string,
  status: string
): Promise<QuotationWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers:customer_id(name),
        manufacturers:manufacturer_id(name, company_name),
        products:product_id(name, description, image_url)
      `)
      .eq('customer_id', customerId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotations by status:', error);
      return [];
    }

    return (data || []).map(quotation => ({
      ...quotation,
      customer_name: quotation.customers?.name || 'Unknown',
      manufacturer_name: quotation.manufacturers?.name || 'Unknown',
      manufacturer_company_name: quotation.manufacturers?.company_name,
      product_name: quotation.products?.name || 'Unknown',
      product_description: quotation.products?.description,
      product_image_url: quotation.products?.image_url
    }));
  } catch (error) {
    console.error('Exception in getQuotationsByStatus:', error);
    return [];
  }
};

/**
 * Accept quotation (creates an order from quotation)
 */
export const acceptQuotation = async (quotationId: string): Promise<boolean> => {
  try {
    // First get the quotation details
    const quotation = await getQuotationById(quotationId);
    if (!quotation) {
      console.error('Quotation not found');
      return false;
    }

    // Update quotation status to accepted
    const updatedQuotation = await updateQuotationStatus(quotationId, 'accepted');
    if (!updatedQuotation) {
      console.error('Failed to update quotation status');
      return false;
    }

    // Create an order from the quotation
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: quotation.customer_id,
        manufacturer_id: quotation.manufacturer_id,
        product_id: quotation.product_id,
        quantity: quotation.quantity,
        price: quotation.quoted_price,
        total_amount: quotation.total_amount,
        delivery_address: '', // Will be filled by customer
        contact_number: '', // Will be filled by customer
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order from quotation:', orderError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception in acceptQuotation:', error);
    return false;
  }
};

/**
 * Get customer quotations with details
 */
export const getCustomerQuotationsWithDetails = async (customerId: string): Promise<QuotationWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        manufacturers(name, company_name),
        products(name, description, image_url)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer quotations:', error);
      return [];
    }

    return (data || []).map(quotation => ({
      ...quotation,
      customer_name: '', // Will be filled by customer context
      manufacturer_name: quotation.manufacturers?.name || '',
      manufacturer_company_name: quotation.manufacturers?.company_name || '',
      product_name: quotation.products?.name || '',
      product_description: quotation.products?.description || '',
      product_image_url: quotation.products?.image_url || '',
    }));
  } catch (error) {
    console.error('Exception in getCustomerQuotationsWithDetails:', error);
    return [];
  }
}; 