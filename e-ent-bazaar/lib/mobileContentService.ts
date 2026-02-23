import { supabase } from './supabase';

export interface MobileContent {
  id: string;
  content_type: 'banner' | 'announcement' | 'offer' | 'featured_content';
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  action_url?: string;
  action_text?: string;
  priority: number;
  is_active: boolean;
  target_audience: 'all' | 'guest' | 'user' | 'manufacturer';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export const getMobileContent = async (userType: 'guest' | 'user' | 'manufacturer' = 'guest'): Promise<MobileContent[]> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('mobile_app_content')
      .select('*')
      .eq('is_active', true)
      .or(`target_audience.eq.all,target_audience.eq.${userType}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mobile content:', error);
      throw error;
    }

    // Filter by date if dates are set
    const filteredData = (data || []).filter(item => {
      const now = new Date();
      const startDate = item.start_date ? new Date(item.start_date) : null;
      const endDate = item.end_date ? new Date(item.end_date) : null;
      
      if (startDate && now < startDate) return false;
      if (endDate && now > endDate) return false;
      
      return true;
    });

    return filteredData;
  } catch (error) {
    console.error('Error in getMobileContent:', error);
    return [];
  }
};

export const getActiveBanners = async (userType: 'guest' | 'user' | 'manufacturer' = 'guest'): Promise<MobileContent[]> => {
  const content = await getMobileContent(userType);
  return content.filter(item => item.content_type === 'banner');
};

export const getActiveAnnouncements = async (userType: 'guest' | 'user' | 'manufacturer' = 'guest'): Promise<MobileContent[]> => {
  const content = await getMobileContent(userType);
  return content.filter(item => item.content_type === 'announcement');
};

export const getActiveOffers = async (userType: 'guest' | 'user' | 'manufacturer' = 'guest'): Promise<MobileContent[]> => {
  const content = await getMobileContent(userType);
  return content.filter(item => item.content_type === 'offer');
};

export const getActiveFeaturedContent = async (userType: 'guest' | 'user' | 'manufacturer' = 'guest'): Promise<MobileContent[]> => {
  const content = await getMobileContent(userType);
  return content.filter(item => item.content_type === 'featured_content');
};

// New function to get all active content for carousel
export const getAllActiveContent = async (userType: 'guest' | 'user' | 'manufacturer' = 'guest'): Promise<MobileContent[]> => {
  const content = await getMobileContent(userType);
  // Return all content types that are active
  return content.filter(item => 
    ['banner', 'announcement', 'offer', 'featured_content'].includes(item.content_type)
  );
}; 