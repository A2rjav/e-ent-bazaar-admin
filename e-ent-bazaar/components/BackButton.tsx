import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from './ui/IconSymbol';

interface BackButtonProps {
    onPress?: () => void;
    color?: string;
    size?: number;
}

export default function BackButton({ onPress, color = '#fff', size = 24 }: BackButtonProps) {
    const router = useRouter();
    const pathname = usePathname();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            // Custom navigation logic based on current screen
            switch (pathname) {
                case '/language-select':
                    // Language select is the first screen, so just go to main app
                    router.replace('/(tabs)');
                    break;
                case '/select-brick-type':
                    // Go back to language select
                    router.replace('/language-select');
                    break;
                case '/welcome':
                    // Go back to brick type selection
                    router.replace('/select-brick-type');
                    break;
                case '/choose-location':
                    // Go back to welcome screen
                    router.replace('/welcome');
                    break;
                case '/auth/phone':
                    // Go back to welcome screen
                    router.replace('/welcome');
                    break;
                case '/auth/otp':
                    // Go back to phone screen
                    router.replace('/auth/phone');
                    break;
                case '/auth/register':
                    // Go back to OTP screen
                    router.replace('/auth/otp');
                    break;
                default:
                    // For other screens, try to go back
                    router.back();
            }
        }
    };

    return (
        <TouchableOpacity style={styles.backButton} onPress={handlePress}>
            <IconSymbol name="chevron.left" size={size} color={color} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        zIndex: 1000,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 