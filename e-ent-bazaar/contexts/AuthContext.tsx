import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import APP_CONFIG, { isSupabaseConfigured } from '../lib/config';
import { useLanguage } from './LanguageContext';
import { storeUserCountry } from '../lib/countryDetection';

interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    company_name?: string;
    state?: string;
    district?: string;
    city?: string;
    pin_code?: string;
    country?: string;
    gst_details?: string | null;
    address?: string;
    latitude?: number;
    longitude?: number;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isSendingOtp: boolean;
    isAuthenticated: boolean;
    isGuest: boolean;
    guestLocation: { latitude: number; longitude: number; address: string } | null;
    setGuestMode: (isGuest: boolean) => void;
    setGuestLocation: (location: { latitude: number; longitude: number; address: string }) => void;
    clearGuest: () => void;
    login: (phone: string, otp: string) => Promise<{ success: boolean; message: string; user?: User }>;
    register: (userData: Partial<User>, phone: string) => Promise<{ success: boolean; message: string; user?: User }>;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<{ success: boolean; message: string }>;
    sendOtp: (phone: string) => Promise<{ success: boolean; message: string; otp?: string }>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [guestLocation, setGuestLocationState] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
    const { lastSelectedLanguage } = useLanguage();
    console.log("🚀 ~ lastSelectedLanguage:", AsyncStorage.getItem('selectedLanguage'))

    const isAuthenticated = !!user;

    // Helper to normalize phone numbers so demo checks work regardless of formatting
    const normalizePhone = (value: string) => value.replace(/[\s\-\(\)]/g, '');

    // For demo login we compare the national number (without +country code)
    const normalizeForDemo = (value: string) => {
        const digitsOnly = normalizePhone(value);
        if (digitsOnly.startsWith('+')) {
            return normalizeForDemo(digitsOnly.slice(1));
        }
        if (digitsOnly.startsWith('91')) {
            return digitsOnly.slice(2);
        }
        if (digitsOnly.startsWith('977')) {
            return digitsOnly.slice(3);
        }
        return digitsOnly;
    };

    // Read demo login configuration once and normalize the phone number for comparisons
    const DEMO_PHONE = APP_CONFIG.DEMO_LOGIN_PHONE ? normalizePhone(String(APP_CONFIG.DEMO_LOGIN_PHONE)) : '';
    console.log("🚀 ~ AuthProvider ~ DEMO_PHONE:", DEMO_PHONE)
    const DEMO_OTP = APP_CONFIG.DEMO_LOGIN_OTP ? String(APP_CONFIG.DEMO_LOGIN_OTP) : '';
    console.log("🚀 ~ AuthProvider ~ DEMO_OTP:", DEMO_OTP)
    const DEMO_CUSTOMER_ID = APP_CONFIG.DEMO_CUSTOMER_ID ? String(APP_CONFIG.DEMO_CUSTOMER_ID) : '';
    const DEMO_PHONE_DIGITS = DEMO_PHONE ? normalizeForDemo(DEMO_PHONE) : '';

    const buildPhoneOrFilter = (values: string[]) => {
        const uniqueValues = Array.from(new Set(values.filter(Boolean)));
        return uniqueValues.map(value => `phone.eq.${value}`).join(',');
    };

    // Helper function to detect country from phone number
    const detectCountryFromPhone = (phone: string) => {
        const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (cleanedPhone.startsWith('+977')) {
            return {
                code: 'NP',
                name: 'Nepal',
                flag: '🇳🇵'
            };
        } else if (cleanedPhone.startsWith('+91')) {
            return {
                code: 'IN',
                name: 'India',
                flag: '🇮🇳'
            };
        }
        // Default to India if no country code detected
        return {
            code: 'IN',
            name: 'India',
            flag: '🇮🇳'
        };
    };

    // Guest mode handlers
    const setGuestMode = (guest: boolean) => {
        setIsGuest(guest);
        AsyncStorage.setItem('isGuest', guest ? 'true' : 'false');
        if (guest) {
            setUser(null); // Ensure no user is set in guest mode
        } else {
            setGuestLocationState(null); // Clear guest location when exiting guest mode
            AsyncStorage.removeItem('guestLocation');
        }
    };
    const setGuestLocation = (location: { latitude: number; longitude: number; address: string }) => {
        setGuestLocationState(location);
        AsyncStorage.setItem('guestLocation', JSON.stringify(location));
    };
    const clearGuest = () => {
        setIsGuest(false);
        AsyncStorage.setItem('isGuest', 'false');
        setGuestLocationState(null);
        AsyncStorage.removeItem('guestLocation');
    };

    // Check authentication status on app start
    useEffect(() => {
        const restoreAuthState = async () => {
            const guestFlag = await AsyncStorage.getItem('isGuest');
            if (guestFlag === 'true') {
                setIsGuest(true);
                // Restore guest location if present
                const loc = await AsyncStorage.getItem('guestLocation');
                if (loc) {
                    try {
                        setGuestLocationState(JSON.parse(loc));
                    } catch { }
                }
                setIsLoading(false);
                return;
            }
            await checkAuth();
        };
        restoreAuthState();
    }, []);

    const checkAuth = async () => {
        try {
            setIsLoading(true);
            const customerId = await AsyncStorage.getItem('customerId');

            if (customerId && isSupabaseConfigured()) {
                // Fetch user data from Supabase, excluding soft-deleted records
                const { data, error } = await supabase
                    .from('endcustomers')
                    .select('*')
                    .eq('id', customerId)
                    .is('deleted_at', null)
                    .single();

                if (error) {
                    console.error('Error fetching user data:', error);
                    await AsyncStorage.removeItem('customerId');
                    setUser(null);
                    setIsGuest(false);
                } else if (data) {
                    setUser(data);
                    setIsGuest(false);
                } else {
                    // User not found or soft-deleted
                    await AsyncStorage.removeItem('customerId');
                    setUser(null);
                    setIsGuest(false);
                }
            } else if (customerId) {
                // Mock user data for testing when Supabase is not configured
                const mockUser: User = {
                    id: customerId,
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: '+919876543210',
                    company_name: 'Test Company',
                    state: 'Test State',
                    district: 'Test District',
                };
                setUser(mockUser);
                setIsGuest(false);
            } else {
                setUser(null);
                setIsGuest(false);
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            setUser(null);
            setIsGuest(false);
        } finally {
            setIsLoading(false);
        }
    };

    const sendOtp = async (phone: string): Promise<{ success: boolean; message: string; otp?: string; sessionId?: string }> => {
        // Prevent multiple simultaneous OTP requests
        if (isSendingOtp) {
            return { success: false, message: 'OTP request already in progress. Please wait.' };
        }

        try {
            setIsSendingOtp(true);
            // Clean phone number (remove spaces, dashes, etc.)
            const cleanedPhone = normalizePhone(phone);
            const cleanedPhoneDigits = normalizeForDemo(cleanedPhone);
            const isDemoLogin = DEMO_PHONE_DIGITS && cleanedPhoneDigits === DEMO_PHONE_DIGITS;
            console.log("🚀 ~ sendOtp ~ isDemoLogin:", isDemoLogin)

            if (isDemoLogin) {
                // If demo values are misconfigured we fail fast to avoid silent issues
                if (!DEMO_OTP) {
                    console.warn('⚠️ [OTP-SERVICE] Demo OTP requested but DEMO_LOGIN_OTP is not configured.');
                    return {
                        success: false,
                        message: 'Demo login is not available right now. Please contact support.',
                    };
                }

                console.log('🧪 [OTP-SERVICE] Demo OTP requested, returning configured demo OTP.');

                // We mirror the structure of real responses so the UI flow stays untouched
                await AsyncStorage.setItem('otp_session_id', DEMO_OTP);

                return {
                    success: true,
                    message: 'Demo OTP ready',
                    otp: DEMO_OTP,
                    sessionId: DEMO_OTP,
                };
            }

            // Determine which service to use based on country code
            const isNepal = cleanedPhone.startsWith('+977');
            const isIndia = cleanedPhone.startsWith('+91');

            console.log('📞 [OTP-SERVICE] Phone number:', cleanedPhone);
            console.log('🌍 [OTP-SERVICE] Country detected:', isNepal ? 'Nepal' : isIndia ? 'India' : 'Unknown');
            console.log('📱 [OTP-SERVICE] Service:', isNepal ? 'WhatsApp' : isIndia ? 'SMS (MTalkz)' : 'Unknown');

            let data, error;

            if (isNepal) {
                // Nepal: Use WhatsApp
                console.log('📱 [OTP-SERVICE] Calling send-whatsapp-mobile for Nepal...');
                const response = await supabase.functions.invoke('send-whatsapp-mobile', {
                    body: {
                        phone: cleanedPhone,
                    },
                });
                data = response.data;
                error = response.error;
                console.log("🚀 ~ sendOtp ~ WhatsApp data:", data);
            } else if (isIndia) {
                // India: Use SMS via MTalkz (Mobile App)
                console.log('📱 [OTP-SERVICE] Calling send-sms-mobile for India...');
                const response = await supabase.functions.invoke('send-sms-mobile', {
                    body: {
                        phone: cleanedPhone,
                        templateName: 'Login OTP EENTBZAR',
                    },
                });
                data = response.data;
                error = response.error;
                console.log("🚀 ~ sendOtp ~ SMS Mobile data:", data);
            } else {
                // Unsupported country
                console.error('❌ [OTP-SERVICE] Unsupported country code');
                return {
                    success: false,
                    message: 'Unsupported country. Only India (+91) and Nepal (+977) are supported.',
                };
            }



            if (error) {

                // Fallback to development mode if Supabase functions fail
                if (!isSupabaseConfigured()) {
                    // Mock OTP for testing
                    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
                    return { success: true, message: 'OTP sent successfully (mock)', otp: mockOtp };
                }

                // Generate a 6-digit OTP and store in Supabase as fallback
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const { error: dbError } = await supabase
                    .from('otp_codes')
                    .insert({
                        phone: cleanedPhone,
                        code: otp,
                        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
                        used: false,
                    });

                if (dbError) {
                    return { success: false, message: 'Failed to process OTP request. Please try again.' };
                }

                return { success: true, message: 'OTP sent successfully', otp };
            }



            if (data && data.success) {
                const serviceName = isNepal ? 'WhatsApp' : 'SMS';
                console.log(`✅ [${serviceName}] OTP sent successfully`);

                if (isNepal && data.messageId) {
                    console.log('📱 [WHATSAPP] Message ID:', data.messageId);
                }

                // Store OTP in database for verification
                // Both services return the OTP in sessionId field
                const otpCode = data.sessionId; // sessionId contains the actual OTP
                if (otpCode) {
                    const { error: dbError } = await supabase
                        .from('otp_codes')
                        .insert({
                            phone: cleanedPhone,
                            code: otpCode,
                            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
                            used: false,
                        });

                    if (dbError) {
                        console.log(`⚠️ [${serviceName}] Failed to store OTP in database, but ${serviceName} sent successfully`);
                    } else {
                        console.log(`✅ [${serviceName}] OTP stored in database for verification`);
                    }
                }

                // Store sessionId for verification
                if (data.sessionId) {
                    await AsyncStorage.setItem('otp_session_id', data.sessionId);
                }

                return {
                    success: true,
                    message: `${serviceName} OTP sent successfully`,
                    otp: otpCode, // For development display
                    sessionId: data.sessionId // This contains the OTP for verification
                };
            } else {
                const serviceName = isNepal ? 'WhatsApp' : 'SMS';
                console.error(`❌ [${serviceName}] Failed to send OTP:`, data?.message);
                return {
                    success: false,
                    message: data?.message || `Failed to send ${serviceName} OTP`
                };
            }
        } catch (error) {
            console.error('Error in sendOtp:', error);
            return { success: false, message: 'Failed to send OTP' };
        } finally {
            setIsSendingOtp(false);
        }
    };

    const login = async (phone: string, otp: string): Promise<{ success: boolean; message: string; user?: User }> => {
        try {
            const cleanedPhone = normalizePhone(phone);
            console.log("🚀 ~ login ~ cleanedPhone:", cleanedPhone)
            const cleanedPhoneDigits = normalizeForDemo(cleanedPhone);
            const isDemoLogin = DEMO_PHONE_DIGITS && cleanedPhoneDigits === DEMO_PHONE_DIGITS;
            console.log("🚀 ~ login ~ DEMO_PHONE_DIGITS:", DEMO_PHONE_DIGITS)
            console.log("🚀 ~ login ~ cleanedPhoneDigits:", cleanedPhoneDigits)
            console.log("🚀 ~ login ~ isDemoLogin:", isDemoLogin)
            if (isDemoLogin) {
                if (!DEMO_OTP) {
                    console.warn('⚠️ [OTP-VERIFY] Demo login attempted but DEMO_LOGIN_OTP is not configured.');
                    return {
                        success: false,
                        message: 'Demo login is not available right now. Please contact support.',
                    };
                }

                if (otp !== DEMO_OTP) {
                    return { success: false, message: 'Invalid OTP code. Please try again.' };
                }

                console.log('🧪 [OTP-VERIFY] Demo login OTP matched. Loading demo user profile.');

                if (!isSupabaseConfigured()) {
                    // Fall back to the existing mock user when Supabase is unavailable
                    const mockUser: User = {
                        id: 'demo-user-id',
                        name: 'Demo User',
                        email: 'demo@example.com',
                        phone: phone,
                        company_name: 'Demo Company',
                        state: 'Demo State',
                        district: 'Demo District',
                    };

                    setUser(mockUser);
                    await AsyncStorage.setItem('customerId', mockUser.id);

                    const detectedCountry = detectCountryFromPhone(phone);
                    await storeUserCountry(detectedCountry);

                    if (lastSelectedLanguage) {
                        await AsyncStorage.setItem('selectedLanguage', lastSelectedLanguage.code);
                    }

                    return { success: true, message: 'Demo login successful (mock)', user: mockUser };
                }

                try {
                    // Prefer an explicit customer lookup if provided
                    let userRecord: User | null = null;

                    if (DEMO_CUSTOMER_ID) {
                        const { data, error } = await supabase
                            .from('endcustomers')
                            .select('*')
                            .eq('id', DEMO_CUSTOMER_ID)
                            .is('deleted_at', null)
                            .maybeSingle();

                        if (error) {
                            console.error('❌ [DEMO LOGIN] Failed to load demo user by DEMO_CUSTOMER_ID:', error);
                        } else if (data) {
                            userRecord = data as unknown as User;
                        }
                    }

                    if (!userRecord) {
                        const phoneFilters = buildPhoneOrFilter([
                            cleanedPhone,
                            cleanedPhoneDigits,
                            DEMO_PHONE,
                            DEMO_PHONE_DIGITS,
                        ]);

                        const { data, error } = await supabase
                            .from('customers_auth')
                            .select('*, endcustomers(*)')
                            .or(phoneFilters)
                            .is('deleted_at', null)
                            .maybeSingle();

                        if (error) {
                            console.error('❌ [DEMO LOGIN] Failed to load demo user by phone:', error);
                        } else if (data?.endcustomers && !data.endcustomers.deleted_at) {
                            userRecord = data.endcustomers as unknown as User;
                        }
                    }

                    if (!userRecord) {
                        const phoneFilters = buildPhoneOrFilter([
                            cleanedPhone,
                            cleanedPhoneDigits,
                            DEMO_PHONE,
                            DEMO_PHONE_DIGITS,
                        ]);

                        const { data, error } = await supabase
                            .from('endcustomers')
                            .select('*')
                            .or(phoneFilters)
                            .is('deleted_at', null)
                            .maybeSingle();

                        if (error) {
                            console.error('❌ [DEMO LOGIN] Failed fallback lookup in endcustomers:', error);
                        } else if (data) {
                            userRecord = data as unknown as User;
                        }
                    }

                    if (!userRecord) {
                        return {
                            success: false,
                            message: 'Demo account is not configured correctly. Please contact support.',
                        };
                    }

                    setUser(userRecord);
                    await AsyncStorage.setItem('customerId', userRecord.id);

                    const detectedCountry = detectCountryFromPhone(phone);
                    await storeUserCountry(detectedCountry);

                    if (lastSelectedLanguage) {
                        await AsyncStorage.setItem('selectedLanguage', lastSelectedLanguage.code);
                    }

                    return {
                        success: true,
                        message: 'Demo login successful',
                        user: userRecord,
                    };
                } catch (demoError) {
                    console.error('❌ [DEMO LOGIN] Unexpected error while logging in demo user:', demoError);
                    return { success: false, message: 'Demo login failed' };
                }
            }

            if (!isSupabaseConfigured()) {
                // Mock login for testing
                const mockUser: User = {
                    id: 'mock-user-id',
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: phone,
                    company_name: 'Test Company',
                    state: 'Test State',
                    district: 'Test District',
                };
                setUser(mockUser);
                await AsyncStorage.setItem('customerId', mockUser.id);

                // Auto-detect and store country based on phone number
                const detectedCountry = detectCountryFromPhone(phone);
                await storeUserCountry(detectedCountry);
                console.log('🌍 Country auto-detected and stored on mock login:', detectedCountry);

                // Store language for authenticated user if selected
                if (lastSelectedLanguage) {
                    await AsyncStorage.setItem('selectedLanguage', lastSelectedLanguage.code);
                }
                return { success: true, message: 'Login successful (mock)', user: mockUser };
            }


            // Find the latest unused session for this phone number that hasn't expired
            // This matches the web platform's exact approach
            const { data: otpData, error: otpError } = await supabase
                .from('otp_codes')
                .select('*')
                .eq('phone', phone)
                .eq('used', false)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            console.log('🔍 [OTP VERIFY] Database query result:', { otpData, otpError });

            if (otpError || !otpData) {
                return { success: false, message: 'Invalid or expired OTP session' };
            }

            const sessionToken = otpData.code; // Could be actual OTP (dev) or provider session token

            // DEV SHORT-CIRCUIT: If the stored token looks like a direct 6-digit OTP, compare locally
            // This matches the web platform's development mode logic
            const looksLikeOtp = typeof sessionToken === 'string' && /^\d{6}$/.test(sessionToken);
            if (looksLikeOtp) {
                if (sessionToken === otp) {
                    await supabase
                        .from('otp_codes')
                        .update({ used: true })
                        .eq('id', otpData.id);
                } else {
                    return { success: false, message: 'Invalid OTP code. Please try again.' };
                }
            } else {
                // Call Supabase Edge Function to verify OTP (for production SMS)

                const { data, error } = await supabase.functions.invoke('verify-sms', {
                    body: {
                        sessionId: sessionToken,
                        otp: otp,
                    },
                });

                if (error) {
                    return { success: false, message: 'Failed to verify OTP. Please try again.' };
                }


                if (data && data.success) {
                    // Mark OTP session as used
                    await supabase
                        .from('otp_codes')
                        .update({ used: true })
                        .eq('id', otpData.id);
                } else {
                    return { success: false, message: data.message || 'Invalid OTP code. Please try again.' };
                }
            }

            // Check if user exists and is not soft-deleted
            const { data: authData } = await supabase
                .from('customers_auth')
                .select('*, endcustomers(*)')
                .eq('phone', phone)
                .is('deleted_at', null)
                .single();

            console.log("🚀 ~ login ~ authData:", authData);

            if (authData) {
                // Check if the customer record is also not soft-deleted
                if (authData.endcustomers && authData.endcustomers.deleted_at) {
                    return {
                        success: false,
                        message: 'This account has been deleted. Please contact support if you believe this is an error.'
                    };
                }

                // Update last login time
                await supabase
                    .from('customers_auth')
                    .update({
                        last_login: new Date().toISOString(),
                        phone_verified: true,
                    })
                    .eq('id', authData.id);

                const userData = authData.endcustomers;
                setUser(userData);
                await AsyncStorage.setItem('customerId', userData.id);

                // Auto-detect and store country based on phone number
                const detectedCountry = detectCountryFromPhone(phone);
                await storeUserCountry(detectedCountry);
                console.log('🌍 Country auto-detected and stored on login:', detectedCountry);

                // Store language for authenticated user if selected
                if (lastSelectedLanguage) {
                    await AsyncStorage.setItem('selectedLanguage', lastSelectedLanguage.code);
                }
                return {
                    success: true,
                    message: 'Login successful',
                    user: userData,
                };
            } else {
                return {
                    success: false,
                    message: 'No account found with this phone number',
                };
            }
        } catch (error) {
            console.error('Error in login:', error);
            return { success: false, message: 'Login failed' };
        }
    };

    const register = async (userData: Partial<User>, phone: string): Promise<{ success: boolean; message: string; user?: User }> => {
        try {
            if (!isSupabaseConfigured()) {
                // Mock registration for testing
                const mockUser: User = {
                    id: 'mock-user-' + Date.now(),
                    name: userData.name || 'Test User',
                    email: userData.email || 'test@example.com',
                    phone: phone,
                    company_name: userData.company_name || 'Test Company',
                    state: userData.state || 'Test State',
                    district: userData.district || 'Test District',
                    city: userData.city || 'Test City',
                    pin_code: userData.pin_code || '123456',
                    country: userData.country || 'India',
                    gst_details: userData.gst_details || null,
                    address: userData.address || 'Test Address',
                };
                setUser(mockUser);
                await AsyncStorage.setItem('customerId', mockUser.id);

                // Auto-detect and store country based on phone number
                const detectedCountry = detectCountryFromPhone(phone);
                await storeUserCountry(detectedCountry);
                console.log('🌍 Country auto-detected and stored on mock registration:', detectedCountry);

                // Store language for authenticated user if selected
                if (lastSelectedLanguage) {
                    await AsyncStorage.setItem('selectedLanguage', lastSelectedLanguage.code);
                }
                return { success: true, message: 'Registration successful (mock)', user: mockUser };
            }

            // Check if phone already exists (including soft-deleted accounts)
            const { data: existingAuth } = await supabase
                .from('customers_auth')
                .select('*, endcustomers(*)')
                .eq('phone', phone)
                .single();

            if (existingAuth) {
                // Check if the account is soft-deleted
                if (existingAuth.deleted_at || (existingAuth.endcustomers && existingAuth.endcustomers.deleted_at)) {
                    // Reactivate the soft-deleted account
                    const currentTime = new Date().toISOString();

                    // Reactivate customer record
                    const { error: customerError } = await supabase
                        .from('endcustomers')
                        .update({
                            deleted_at: null,
                            name: userData.name || existingAuth.endcustomers?.name || '',
                            email: userData.email || existingAuth.endcustomers?.email || '',
                            company_name: userData.company_name || existingAuth.endcustomers?.company_name || '',
                            state: userData.state || existingAuth.endcustomers?.state || '',
                            district: userData.district || existingAuth.endcustomers?.district || '',
                            city: userData.city || existingAuth.endcustomers?.city || '',
                            pin_code: userData.pin_code || existingAuth.endcustomers?.pin_code || '',
                            country: userData.country || existingAuth.endcustomers?.country || 'India',
                            gst_details: userData.gst_details || existingAuth.endcustomers?.gst_details || null,
                            address: userData.address || existingAuth.endcustomers?.address || '',
                            updated_at: currentTime
                        })
                        .eq('id', existingAuth.endcustomer_id);

                    if (customerError) {
                        return { success: false, message: `Failed to reactivate account: ${customerError.message}` };
                    }

                    // Reactivate auth record
                    const { error: authError } = await supabase
                        .from('customers_auth')
                        .update({
                            deleted_at: null,
                            last_login: currentTime,
                            phone_verified: true
                        })
                        .eq('id', existingAuth.id);

                    if (authError) {
                        return { success: false, message: `Failed to reactivate auth record: ${authError.message}` };
                    }

                    // Fetch the reactivated user data
                    const { data: reactivatedUser } = await supabase
                        .from('endcustomers')
                        .select('*')
                        .eq('id', existingAuth.endcustomer_id)
                        .single();

                    if (reactivatedUser) {
                        setUser(reactivatedUser);
                        await AsyncStorage.setItem('customerId', reactivatedUser.id);

                        // Auto-detect and store country based on phone number
                        const detectedCountry = detectCountryFromPhone(phone);
                        await storeUserCountry(detectedCountry);
                        console.log('🌍 Country auto-detected and stored on reactivation:', detectedCountry);

                        if (lastSelectedLanguage) {
                            await AsyncStorage.setItem('selectedLanguage', lastSelectedLanguage.code);
                        }
                        return {
                            success: true,
                            message: 'Account reactivated successfully',
                            user: reactivatedUser,
                        };
                    }
                } else {
                    return { success: false, message: 'Phone number already registered' };
                }
            }

            // Auto-detect country from phone number
            const detectedCountry = detectCountryFromPhone(phone);
            console.log('🌍 Country auto-detected for new user:', detectedCountry);

            // Create new customer record
            const customerRecord = {
                name: userData.name || '',
                email: userData.email || '',
                company_name: userData.company_name || '',
                state: userData.state || '',
                district: userData.district || '',
                city: userData.city || userData.district || '',
                pin_code: userData.pin_code || '',
                country: userData.country || detectedCountry.name, // Use detected country
                gst_details: userData.gst_details || undefined,
                address: userData.address || '',
                phone: phone,
                latitude: userData.latitude || null,
                longitude: userData.longitude || null,
            };

            const { data: customer, error: customerError } = await supabase
                .from('endcustomers')
                .insert(customerRecord)
                .select()
                .single();

            if (customerError) {
                return { success: false, message: `Failed to create customer: ${customerError.message}` };
            }

            // Create auth record
            const { error: authError } = await supabase
                .from('customers_auth')
                .insert({
                    phone,
                    phone_verified: true,
                    endcustomer_id: customer.id,
                    last_login: new Date().toISOString(),
                });

            if (authError) {
                // Rollback customer creation
                await supabase.from('endcustomers').delete().eq('id', customer.id);
                return { success: false, message: `Failed to create auth record: ${authError.message}` };
            }

            setUser(customer);
            await AsyncStorage.setItem('customerId', customer.id);

            // Store detected country for the new user
            await storeUserCountry(detectedCountry);
            console.log('🌍 Country stored for new user:', detectedCountry);

            // Store language for authenticated user if selected
            if (lastSelectedLanguage) {
                await AsyncStorage.setItem('selectedLanguage', lastSelectedLanguage.code);
            }
            return {
                success: true,
                message: 'Registration successful',
                user: customer,
            };
        } catch (error) {
            console.error('Error in register:', error);
            return { success: false, message: 'Registration failed' };
        }
    };

    const logout = async () => {
        try {
            setUser(null);
            await AsyncStorage.removeItem('customerId');
            setIsGuest(false);
            setGuestLocationState(null);
            // Remove language on logout
            await AsyncStorage.removeItem('selectedLanguage');
            await AsyncStorage.removeItem('selectedCountryCode');
        } catch (error) {
            console.error('Error in logout:', error);
        }
    };

    const deleteAccount = async (): Promise<{ success: boolean; message: string }> => {
        try {
            if (!isSupabaseConfigured()) {
                return { success: true, message: 'Account deletion successful (mock)' };
            }

            const customerId = await AsyncStorage.getItem('customerId');
            if (!customerId) {
                return { success: false, message: 'No account to delete' };
            }

            const currentTime = new Date().toISOString();

            // Soft delete auth record
            const { error: authError } = await supabase
                .from('customers_auth')
                .update({ deleted_at: currentTime })
                .eq('endcustomer_id', customerId);

            if (authError) {
                console.error('Error soft deleting auth record:', authError);
                return { success: false, message: `Failed to delete auth record: ${authError.message}` };
            }

            // Soft delete customer record
            const { error: customerError } = await supabase
                .from('endcustomers')
                .update({ deleted_at: currentTime })
                .eq('id', customerId);

            if (customerError) {
                console.error('Error soft deleting customer record:', customerError);
                return { success: false, message: `Failed to delete customer record: ${customerError.message}` };
            }

            // Clear local storage
            await AsyncStorage.removeItem('customerId');
            setUser(null);
            setIsGuest(false);
            setGuestLocationState(null);
            // Remove language on logout
            await AsyncStorage.removeItem('selectedLanguage');
            await AsyncStorage.removeItem('selectedCountryCode');

            return { success: true, message: 'Account deleted successfully' };
        } catch (error) {
            console.error('Error in deleteAccount:', error);
            return { success: false, message: 'Failed to delete account' };
        }
    };

    const value: AuthContextType = {
        user,
        isLoading,
        isSendingOtp,
        isAuthenticated,
        isGuest,
        guestLocation,
        setGuestMode,
        setGuestLocation,
        clearGuest,
        login,
        register,
        logout,
        deleteAccount,
        sendOtp,
        checkAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 