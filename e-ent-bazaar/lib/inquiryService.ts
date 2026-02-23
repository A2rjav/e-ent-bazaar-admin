import { supabase } from './supabase';

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

export interface InquiryWithDetails extends Inquiry {
  customer_name: string;
  manufacturer_name: string;
  manufacturer_company_name?: string;
  reply?: string;
  reply_by?: string;
  reply_at?: string;
}

/**
 * Create a new inquiry
 */
export const createInquiry = async (inquiryData: InquiryInsert): Promise<Inquiry | null> => {
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        ...inquiryData,
        status: inquiryData.status || 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating inquiry:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in createInquiry:', error);
    return null;
  }
};

/**
 * Get customer inquiries with details
 */
export const getCustomerInquiries = async (customerId: string): Promise<InquiryWithDetails[]> => {
  try {
    // First, fetch all inquiries for this customer
    const { data: inquiries, error: inquiriesError } = await supabase
      .from('inquiries')
      .select(`
        *,
        customers:customer_id(name),
        manufacturers:manufacturer_id(name, company_name)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (inquiriesError) {
      console.error('Error fetching customer inquiries:', inquiriesError);
      return [];
    }

    // Get inquiry IDs to fetch responses
    const inquiryIds = (inquiries || []).map(inquiry => inquiry.id);
    let responses: any[] = [];

    if (inquiryIds.length > 0) {
      // Fetch responses for these inquiries
      const { data: responsesData, error: responsesError } = await supabase
        .from('inquiry_responses')
        .select('*')
        .in('inquiry_id', inquiryIds);

      if (responsesError) {
        console.error('Error fetching inquiry responses:', responsesError);
      } else {
        responses = responsesData || [];
      }
    }

    // Combine inquiries with their latest responses
    return (inquiries || []).map(inquiry => {
      // Find the latest response for this inquiry
      const inquiryResponses = responses
        .filter(response => response.inquiry_id === inquiry.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const latestResponse = inquiryResponses[0];

      return {
        ...inquiry,
        customer_name: inquiry.customers?.name || 'Unknown',
        manufacturer_name: inquiry.manufacturers?.name || 'Unknown',
        manufacturer_company_name: inquiry.manufacturers?.company_name,
        reply: latestResponse?.response_text || undefined,
        reply_by: latestResponse?.created_by_name || undefined,
        reply_at: latestResponse?.created_at || undefined,
      };
    });
  } catch (error) {
    console.error('Exception in getCustomerInquiries:', error);
    return [];
  }
};

/**
 * Get inquiry by ID with details
 */
export const getInquiryById = async (inquiryId: string): Promise<InquiryWithDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select(`
        *,
        customers:customer_id(name),
        manufacturers:manufacturer_id(name, company_name)
      `)
      .eq('id', inquiryId)
      .single();

    if (error) {
      console.error('Error fetching inquiry:', error);
      return null;
    }

    return {
      ...data,
      customer_name: data.customers?.name || 'Unknown',
      manufacturer_name: data.manufacturers?.name || 'Unknown',
      manufacturer_company_name: data.manufacturers?.company_name
    };
  } catch (error) {
    console.error('Exception in getInquiryById:', error);
    return null;
  }
};

/**
 * Update inquiry status
 */
export const updateInquiryStatus = async (
  inquiryId: string,
  status: string
): Promise<Inquiry | null> => {
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inquiryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating inquiry status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in updateInquiryStatus:', error);
    return null;
  }
};

/**
 * Get inquiries by status
 */
export const getInquiriesByStatus = async (
  customerId: string,
  status: string
): Promise<InquiryWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select(`
        *,
        customers:customer_id(name),
        manufacturers:manufacturer_id(name, company_name)
      `)
      .eq('customer_id', customerId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inquiries by status:', error);
      return [];
    }

    return (data || []).map(inquiry => ({
      ...inquiry,
      customer_name: inquiry.customers?.name || 'Unknown',
      manufacturer_name: inquiry.manufacturers?.name || 'Unknown',
      manufacturer_company_name: inquiry.manufacturers?.company_name
    }));
  } catch (error) {
    console.error('Exception in getInquiriesByStatus:', error);
    return [];
  }
}; 