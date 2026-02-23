/**
 * Mtalkz.com API Service for OTP Generation and Verification
 * Documentation: https://developers.mtalkz.com/generate-and-verify
 */

import { mtalkzConfig, isMtalkzConfigured } from './mtalkzConfig';

interface GenerateOtpResponse {
  data: string; // verifyId
  error: string | null;
  message: string;
}

interface VerifyOtpResponse {
  data: string; // verifyId
  error: string | null;
  message: string;
}

interface MtalkzError {
  error: string;
  message: string;
}

class MtalkzService {
  /**
   * Check if mtalkz service is properly configured
   */
  isConfigured(): boolean {
    return isMtalkzConfigured();
  }

  /**
   * Generate OTP using mtalkz.com API
   * @param phoneNumber - Recipient's phone number (with country code)
   * @returns Promise with verifyId for verification
   */
  async generateOtp(phoneNumber: string): Promise<{
    success: boolean;
    verifyId?: string;
    message: string;
    error?: string;
  }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Mtalkz service not configured. Missing API credentials.');
      }

      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

      const response = await fetch(`${mtalkzConfig.baseUrl}/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': mtalkzConfig.apiKey,
        },
        body: JSON.stringify({
          configId: mtalkzConfig.configId,
          to: cleanPhone,
        }),
      });

      if (!response.ok) {
        const errorData: MtalkzError = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GenerateOtpResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        verifyId: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('Mtalkz generateOtp error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate OTP',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify OTP using mtalkz.com API
   * @param verifyId - The verifyId returned from generateOtp
   * @param otp - The OTP code entered by user
   * @returns Promise with verification result
   */
  async verifyOtp(verifyId: string, otp: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Mtalkz service not configured. Missing API credentials.');
      }

      const response = await fetch(`${mtalkzConfig.baseUrl}/v1/verify/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': mtalkzConfig.apiKey,
        },
        body: JSON.stringify({
          verifyId: verifyId,
          otp: otp,
        }),
      });

      if (!response.ok) {
        const errorData: MtalkzError = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: VerifyOtpResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error('Mtalkz verifyOtp error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify OTP',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get service configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];
    
    if (!mtalkzConfig.apiKey) missingFields.push('API Key');
    if (!mtalkzConfig.configId) missingFields.push('Config ID');
    if (!mtalkzConfig.senderId) missingFields.push('Sender ID');

    return {
      configured: this.isConfigured(),
      missingFields,
    };
  }
}

// Export singleton instance
export const mtalkzService = new MtalkzService();
export default mtalkzService;
