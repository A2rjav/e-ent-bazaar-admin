import { supabase } from './supabase';

// Order status types
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

// Order interface
export interface Order {
  id: string;
  customer_id: string;
  manufacturer_id: string;
  product_id: string;
  quantity: number;
  price: number;
  total_amount: number;
  delivery_address: string;
  contact_number: string;
  status: OrderStatus;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

// Order with product and manufacturer details
export interface OrderWithDetails extends Order {
  product_name: string;
  product_description?: string;
  manufacturer_name: string;
}

/**
 * Get all orders for a specific customer
 */
export const getCustomerOrders = async (
  customerId: string,
): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching customer orders:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception in getCustomerOrders:", err);
    return [];
  }
};

/**
 * Get customer orders with product and manufacturer details
 */
export const getCustomerOrdersWithDetails = async (
  customerId: string,
): Promise<OrderWithDetails[]> => {
  try {
    const orders = await getCustomerOrders(customerId);
    const ordersWithDetails: OrderWithDetails[] = [];

    for (const order of orders) {
      // Get product details
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("name, description")
        .eq("id", order.product_id)
        .single();

      if (productError) {
        console.error("Error fetching product details:", productError);
      }

      // Get manufacturer details
      const { data: manufacturerData, error: manufacturerError } = await supabase
        .from("manufacturers")
        .select("name, company_name")
        .eq("id", order.manufacturer_id)
        .single();

      if (manufacturerError) {
        console.error("Error fetching manufacturer details:", manufacturerError);
      }

      ordersWithDetails.push({
        ...order,
        product_name: productData?.name || "Unknown Product",
        product_description: productData?.description,
        manufacturer_name:
          manufacturerData?.company_name ||
          manufacturerData?.name ||
          "Unknown Manufacturer",
      });
    }

    return ordersWithDetails;
  } catch (err) {
    console.error("Exception in getCustomerOrdersWithDetails:", err);
    return [];
  }
};

/**
 * Get a specific order by ID
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("Error fetching order by ID:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Exception in getOrderById:", err);
    return null;
  }
};

/**
 * Get order with product and manufacturer details
 */
export const getOrderWithDetails = async (
  orderId: string,
): Promise<OrderWithDetails | null> => {
  try {
    // First get the order
    const order = await getOrderById(orderId);
    if (!order) return null;

    // Get product details
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("name, description")
      .eq("id", order.product_id)
      .single();

    if (productError) {
      console.error("Error fetching product details:", productError);
    }

    // Get manufacturer details
    const { data: manufacturerData, error: manufacturerError } = await supabase
      .from("manufacturers")
      .select("name, company_name")
      .eq("id", order.manufacturer_id)
      .single();

    if (manufacturerError) {
      console.error("Error fetching manufacturer details:", manufacturerError);
    }

    // Combine all data
    return {
      ...order,
      product_name: productData?.name || "Unknown Product",
      product_description: productData?.description,
      manufacturer_name:
        manufacturerData?.company_name ||
        manufacturerData?.name ||
        "Unknown Manufacturer",
    };
  } catch (err) {
    console.error("Exception in getOrderWithDetails:", err);
    return null;
  }
};

/**
 * Cancel an order
 */
export const cancelOrder = async (orderId: string): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Error cancelling order:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Exception in cancelOrder:", err);
    return null;
  }
};

/**
 * Update an order
 */
export const updateOrder = async (
  orderId: string,
  updates: {
    quantity?: number;
    delivery_address?: string;
    contact_number?: string;
    status?: OrderStatus;
    tracking_number?: string;
    total_amount?: number;
  }
): Promise<Order | null> => {
  try {
    // Calculate new total amount if quantity is updated
    if (updates.quantity !== undefined) {
      const order = await getOrderById(orderId);
      if (order) {
        updates.total_amount = order.price * updates.quantity;
      }
    }

    const { data, error } = await supabase
      .from("orders")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Error updating order:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Exception in updateOrder:", err);
    return null;
  }
};

/**
 * Create a new order
 */
export const createOrder = async (orderData: {
  customer_id: string;
  manufacturer_id: string;
  product_id: string;
  quantity: number;
  price: number;
  delivery_address: string;
  contact_number: string;
}): Promise<Order | null> => {
  try {
    const total_amount = orderData.quantity * orderData.price;

    const { data, error } = await supabase
      .from("orders")
      .insert({
        ...orderData,
        total_amount,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating order:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Exception in createOrder:", err);
    return null;
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Error updating order status:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Exception in updateOrderStatus:", err);
    return null;
  }
};

/**
 * Add tracking number to order
 */
export const addTrackingNumber = async (
  orderId: string,
  trackingNumber: string
): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ 
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Error adding tracking number:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Exception in addTrackingNumber:", err);
    return null;
  }
}; 