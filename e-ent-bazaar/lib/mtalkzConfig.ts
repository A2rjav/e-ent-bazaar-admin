/**
 * Mtalkz.com API Configuration
 * 
 * To configure mtalkz service:
 * 1. Get your API key from mtalkz.com dashboard
 * 2. Update the values below with your actual credentials
 * 3. For production, use environment variables
 */

export const mtalkzConfig = {
  // API Key - Get this from your mtalkz.com account dashboard
  apiKey: (global as any).process?.env?.EXPO_PUBLIC_MTALKZ_API_KEY || '',
  
  // Config ID - This is the OTP configuration ID from your mtalkz account
  // The value below is from your provided image
  configId: (global as any).process?.env?.EXPO_PUBLIC_MTALKZ_CONFIG_ID || 'N55ifR1l67MRInMz',
  
  // Sender ID - This is the sender ID that will appear in SMS
  // The value below is from your provided image
  senderId: (global as any).process?.env?.EXPO_PUBLIC_MTALKZ_SENDER_ID || 'EENTBZ',
  
  // Base URL for mtalkz API
  baseUrl: (global as any).process?.env?.EXPO_PUBLIC_MTALKZ_BASE_URL || 'https://api.mtalkz.com',
};

/**
 * Check if mtalkz service is properly configured
 */
export const isMtalkzConfigured = (): boolean => {
  return !!(mtalkzConfig.apiKey && mtalkzConfig.configId && mtalkzConfig.senderId);
};

/**
 * Get configuration status for debugging
 */
export const getMtalkzConfigStatus = () => {
  return {
    configured: isMtalkzConfigured(),
    hasApiKey: !!mtalkzConfig.apiKey,
    hasConfigId: !!mtalkzConfig.configId,
    hasSenderId: !!mtalkzConfig.senderId,
    baseUrl: mtalkzConfig.baseUrl,
  };
};
