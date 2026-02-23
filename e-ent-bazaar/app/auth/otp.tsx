import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/BackButton';

export default function OtpScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { phone } = useLocalSearchParams<{ phone: string }>();
    const { login, sendOtp, isSendingOtp } = useAuth();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const inputRefs = useRef<TextInput[]>([]);

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto-focus next input
        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            Alert.alert('Error', 'Please enter the complete 6-digit OTP');
            return;
        }

        setIsLoading(true);
        try {
            const result = await login(phone || '', otpString);
            console.log("🚀 ~ handleVerifyOtp ~ result:", result)

            if (result.success) {
                router.replace('/(tabs)')
            } else {
                if (result.message === 'No account found with this phone number') {
                    // User needs to register
                    router.push({
                        pathname: '/auth/register',
                        params: { phone }
                    });
                } else {
                    Alert.alert('Error', result.message);
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to verify OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0 || isSendingOtp) return;

        setIsLoading(true);
        try {
            const result = await sendOtp(phone || '');
            if (result.success) {
                setResendTimer(60);
                // Clear previous OTP input when resending
                setOtp(['', '', '', '', '', '']);
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <BackButton color="#af4b0e" />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.content}>
                    <Text style={styles.title}>{t('otp.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('otp.subtitle', { phone })}
                    </Text>

                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => {
                                    if (ref) inputRefs.current[index] = ref;
                                }}
                                style={styles.otpInput}
                                value={digit}
                                onChangeText={(text) => handleOtpChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                textAlign="center"
                                autoFocus={index === 0}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleVerifyOtp}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>
                            {isLoading ? t('otp.verifying') : t('otp.verify')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.resendButton, (resendTimer > 0 || isLoading || isSendingOtp) && styles.resendButtonDisabled]}
                        onPress={handleResendOtp}
                        disabled={resendTimer > 0 || isLoading || isSendingOtp}
                    >
                        <Text style={styles.resendButtonText}>
                            {isSendingOtp
                                ? 'Sending...'
                                : resendTimer > 0
                                    ? t('otp.resendTimer', { seconds: resendTimer })
                                    : t('otp.resend')
                            }
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>{t('otp.backToPhone')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#af4b0e',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
    },
    otpInput: {
        width: 45,
        height: 55,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 'bold',
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#af4b0e',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    resendButton: {
        paddingVertical: 10,
        marginBottom: 15,
    },
    resendButtonDisabled: {
        opacity: 0.5,
    },
    resendButtonText: {
        color: '#af4b0e',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    backButton: {
        paddingVertical: 10,
    },
    backButtonText: {
        color: '#666',
        fontSize: 14,
    },
}); 