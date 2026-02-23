import { supabase } from "@/lib/supabase";

export interface SampleOrderInsert {
  customer_id: string;
  manufacturer_id: string;
  product_id: string;
  quantity: number;
  delivery_address: string;
  contact_number: string;
}

export interface SampleOrder extends SampleOrderInsert {
  id: string;
  status: string;
  admin_response?: string;
  admin_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new sample order
 */
export const createSampleOrder = async (order: SampleOrderInsert): Promise<SampleOrder | null> => {
  const { data, error } = await supabase
    .from("sample_orders")
    .insert([order])
    .select()
    .single();
  if (error) {
    console.error("Error creating sample order:", error);
    return null;
  }
  return data;
};

/**
 * Get all sample orders for a specific customer
 */
export const getCustomerSampleOrders = async (customerId: string): Promise<SampleOrder[]> => {
  const { data, error } = await supabase
    .from("sample_orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching customer sample orders:", error);
    return [];
  }
  return data || [];
};

/**
 * Get a specific sample order by ID
 */
export const getSampleOrderById = async (id: string): Promise<SampleOrder | null> => {
  const { data, error } = await supabase
    .from("sample_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("Error fetching sample order by ID:", error);
    return null;
  }
  return data;
};

/**
 * Get sample order with product and manufacturer details
 */
export const getSampleOrderWithDetails = async (
  sampleOrderId: string,
): Promise<any | null> => {
  try {
    // First get the sample order
    const { data: order, error } = await supabase
      .from("sample_orders")
      .select("*")
      .eq("id", sampleOrderId)
      .single();
    if (error || !order) return null;

    // Get product details
    const { data: productData } = await supabase
      .from("products")
      .select("name, description")
      .eq("id", order.product_id)
      .single();

    // Get manufacturer details
    const { data: manufacturerData } = await supabase
      .from("manufacturers")
      .select("name, company_name")
      .eq("id", order.manufacturer_id)
      .single();

    return {
      ...order,
      product_name: productData?.name || "Unknown Product",
      product_description: productData?.description,
      manufacturer_name:
        manufacturerData?.company_name || manufacturerData?.name || "Unknown Manufacturer",
    };
  } catch (err) {
    console.error("Exception in getSampleOrderWithDetails:", err);
    return null;
  }
};

/**
 * Get all sample orders for a specific manufacturer
 */
export const getManufacturerSampleOrders = async (
  manufacturerId: string,
): Promise<SampleOrder[]> => {
  try {
    const { data, error } = await supabase
      .from("sample_orders")
      .select("*")
      .eq("manufacturer_id", manufacturerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching manufacturer sample orders:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception in getManufacturerSampleOrders:", err);
    return [];
  }
};

/**
 * Get all sample orders for a specific manufacturer with customer and product details
 */
export const getManufacturerSampleOrdersWithDetails = async (
  manufacturerId: string,
) => {
  try {
    const { data: orders, error } = await supabase
      .from("sample_orders")
      .select("*")
      .eq("manufacturer_id", manufacturerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching manufacturer sample orders:", error);
      return [];
    }

    // For each sample order, fetch product and customer details separately
    const results = await Promise.all(
      (orders || []).map(async (order: any) => {
        let product = null;
        let customer = null;
        try {
          const { data: productData } = await supabase
            .from("products")
            .select("name")
            .eq("id", order.product_id)
            .maybeSingle();
          product = productData;
        } catch {}
        try {
          const { data: customerData } = await supabase
            .from("endcustomers")
            .select("name")
            .eq("id", order.customer_id)
            .maybeSingle();
          customer = customerData;
        } catch {}
        return {
          ...order,
          product_name: product?.name || "-",
          customer_name: customer?.name || "-",
        };
      })
    );
    return results;
  } catch (err) {
    console.error("Exception in getManufacturerSampleOrdersWithDetails:", err);
    return [];
  }
};

/**
 * Get all sample orders for a specific customer with product and manufacturer details
 */
export const getCustomerSampleOrdersWithDetails = async (
  customerId: string,
): Promise<any[]> => {
  try {
    const { data: orders, error } = await supabase
      .from("sample_orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching customer sample orders:", error);
      return [];
    }

    // For each sample order, fetch product and manufacturer details separately
    const results = await Promise.all(
      (orders || []).map(async (order: any) => {
        let product = null;
        let manufacturer = null;
        try {
          const { data: productData } = await supabase
            .from("products")
            .select("name")
            .eq("id", order.product_id)
            .maybeSingle();
          product = productData;
        } catch {}
        try {
          const { data: manufacturerData } = await supabase
            .from("manufacturers")
            .select("name, company_name")
            .eq("id", order.manufacturer_id)
            .maybeSingle();
          manufacturer = manufacturerData;
        } catch {}
        return {
          ...order,
          product_name: product?.name || "-",
          manufacturer_name: manufacturer?.company_name || manufacturer?.name || "-",
        };
      })
    );
    return results;
  } catch (err) {
    console.error("Exception in getCustomerSampleOrdersWithDetails:", err);
    return [];
  }
};

/**
 * Update a sample order
 */
export const updateSampleOrder = async (
  sampleOrderId: string,
  updates: Partial<SampleOrder>,
): Promise<SampleOrder | null> => {
  try {
    const { data, error } = await supabase
      .from("sample_orders")
      .update(updates)
      .eq("id", sampleOrderId)
      .select();

    if (error) {
      console.error("Error updating sample order:", error);
      return null;
    }

    // Return the first (and should be only) updated row
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("Exception in updateSampleOrder:", err);
    return null;
  }
}; 