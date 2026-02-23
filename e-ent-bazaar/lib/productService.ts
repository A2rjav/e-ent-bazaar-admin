import { supabase } from './supabase';

// Product interface
export interface Product {
  id: string;
  manufacturer_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  is_available: boolean;
  specifications?: any;
  created_at: string;
  updated_at: string;
}

// Product with manufacturer details
export interface ProductWithManufacturer extends Product {
  manufacturer_name: string;
  manufacturer_company_name?: string;
  manufacturer_location?: string;
  manufacturer_latitude?: number;
  manufacturer_longitude?: number;
  manufacturer_country?: string;
}

// Manufacturer interface
export interface Manufacturer {
  id: string;
  name: string;
  company_name?: string;
  city: string;
  state: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  products: Product[];
}

/**
 * Get all available products
 */
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception in getAllProducts:", err);
    return [];
  }
};

/**
 * Get products with manufacturer details
 */
export const getProductsWithManufacturer = async (): Promise<ProductWithManufacturer[]> => {
  try {
    const products = await getAllProducts();
    const productsWithManufacturer: ProductWithManufacturer[] = [];
    
    // Debug: Check what countries exist in manufacturers table
    const { data: manufacturerCountries, error: countryError } = await supabase
      .from("manufacturers")
      .select("id, name, country")
      .limit(5);
    
    console.log('🔍 ProductService: Sample manufacturer countries from DB:', manufacturerCountries);
    if (countryError) {
      console.error('🔍 ProductService: Error fetching manufacturer countries:', countryError);
    }

    for (const product of products) {
      // Get manufacturer details
      const { data: manufacturerData, error: manufacturerError } = await supabase
        .from("manufacturers")
        .select("name, company_name, city, state, district, latitude, longitude, country")
        .eq("id", product.manufacturer_id)
        .single();

      if (manufacturerError) {
        console.error("Error fetching manufacturer details:", manufacturerError);
      }

      const location = manufacturerData?.city && manufacturerData?.state 
        ? `${manufacturerData.city}, ${manufacturerData.state}${manufacturerData.district ? `, ${manufacturerData.district}` : ''}`
        : undefined;

      productsWithManufacturer.push({
        ...product,
        manufacturer_name: manufacturerData?.company_name || manufacturerData?.name || "Unknown Manufacturer",
        manufacturer_company_name: manufacturerData?.company_name,
        manufacturer_location: location,
        manufacturer_latitude: manufacturerData?.latitude || null,
        manufacturer_longitude: manufacturerData?.longitude || null,
        manufacturer_country: manufacturerData?.country || 'India',
      });
    }

    return productsWithManufacturer;
  } catch (err) {
    console.error("Exception in getProductsWithManufacturer:", err);
    return [];
  }
};

/**
 * Get products by category
 */
export const getProductsByCategory = async (category: string): Promise<ProductWithManufacturer[]> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products by category:", error);
      return [];
    }

    const products = data || [];
    const productsWithManufacturer: ProductWithManufacturer[] = [];

    for (const product of products) {
      // Get manufacturer details
      const { data: manufacturerData, error: manufacturerError } = await supabase
        .from("manufacturers")
        .select("name, company_name, city, state")
        .eq("id", product.manufacturer_id)
        .single();

      if (manufacturerError) {
        console.error("Error fetching manufacturer details:", manufacturerError);
      }

      const location = manufacturerData?.city && manufacturerData?.state 
        ? `${manufacturerData.city}, ${manufacturerData.state}`
        : undefined;

      productsWithManufacturer.push({
        ...product,
        manufacturer_name: manufacturerData?.company_name || manufacturerData?.name || "Unknown Manufacturer",
        manufacturer_company_name: manufacturerData?.company_name,
        manufacturer_location: location,
      });
    }

    return productsWithManufacturer;
  } catch (err) {
    console.error("Exception in getProductsByCategory:", err);
    return [];
  }
};

/**
 * Search products by name or description
 */
export const searchProducts = async (query: string): Promise<ProductWithManufacturer[]> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error searching products:", error);
      return [];
    }

    const products = data || [];
    const productsWithManufacturer: ProductWithManufacturer[] = [];

    for (const product of products) {
      // Get manufacturer details
      const { data: manufacturerData, error: manufacturerError } = await supabase
        .from("manufacturers")
        .select("name, company_name, city, state")
        .eq("id", product.manufacturer_id)
        .single();

      if (manufacturerError) {
        console.error("Error fetching manufacturer details:", manufacturerError);
      }

      const location = manufacturerData?.city && manufacturerData?.state 
        ? `${manufacturerData.city}, ${manufacturerData.state}`
        : undefined;

      productsWithManufacturer.push({
        ...product,
        manufacturer_name: manufacturerData?.company_name || manufacturerData?.name || "Unknown Manufacturer",
        manufacturer_company_name: manufacturerData?.company_name,
        manufacturer_location: location,
      });
    }

    return productsWithManufacturer;
  } catch (err) {
    console.error("Exception in searchProducts:", err);
    return [];
  }
};

/**
 * Get a single product by ID with manufacturer details
 */
export const getProductById = async (productId: string): Promise<ProductWithManufacturer | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return null;
    }

    if (!data) return null;

    // Get manufacturer details
    const { data: manufacturerData, error: manufacturerError } = await supabase
      .from("manufacturers")
      .select("name, company_name, city, state")
      .eq("id", data.manufacturer_id)
      .single();

    if (manufacturerError) {
      console.error("Error fetching manufacturer details:", manufacturerError);
    }

    const location = manufacturerData?.city && manufacturerData?.state 
      ? `${manufacturerData.city}, ${manufacturerData.state}`
      : undefined;

    return {
      ...data,
      manufacturer_name: manufacturerData?.company_name || manufacturerData?.name || "Unknown Manufacturer",
      manufacturer_company_name: manufacturerData?.company_name,
      manufacturer_location: location,
    };
  } catch (err) {
    console.error("Exception in getProductById:", err);
    return null;
  }
};

/**
 * Get unique product categories
 */
export const getProductCategories = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .eq("is_available", true);

    if (error) {
      console.error("Error fetching product categories:", error);
      return [];
    }

    const categories = [...new Set(data?.map(item => item.category) || [])];
    return categories.sort();
  } catch (err) {
    console.error("Exception in getProductCategories:", err);
    return [];
  }
};

/**
 * Get all manufacturers with their products
 */
export const getManufacturers = async (): Promise<Manufacturer[]> => {
  try {
    // First get all manufacturers
    const { data: manufacturers, error: manufacturersError } = await supabase
      .from("manufacturers")
      .select("*")
      .order("created_at", { ascending: false });

    if (manufacturersError) {
      console.error("Error fetching manufacturers:", manufacturersError);
      return [];
    }

    // Then get products for each manufacturer
    const manufacturersWithProducts: Manufacturer[] = [];
    
    for (const manufacturer of manufacturers || []) {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("manufacturer_id", manufacturer.id)
        .eq("is_available", true);

      if (productsError) {
        console.error("Error fetching products for manufacturer:", productsError);
      }

      manufacturersWithProducts.push({
        ...manufacturer,
        products: products || [],
      });
    }

    return manufacturersWithProducts;
  } catch (err) {
    console.error("Exception in getManufacturers:", err);
    return [];
  }
}; 