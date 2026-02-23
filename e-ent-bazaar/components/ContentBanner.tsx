import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MobileContent } from '../lib/mobileContentService';

interface ContentBannerProps {
    content: MobileContent;
    onPress?: () => void;
}

const { width } = Dimensions.get('window');

export default function ContentBanner({ content, onPress }: ContentBannerProps) {
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
            return;
        }

        if (content.action_url) {
            // Handle internal navigation
            if (content.action_url.startsWith('/')) {
                try {
                    // Map web routes to mobile routes
                    const routeMap: { [key: string]: string } = {
                        '/marketplace': '/(tabs)/marketplace',
                        '/inquiries': '/(tabs)/inquiries',
                        '/orders': '/(tabs)/orders',
                        '/quotations': '/(tabs)/quotations',
                        '/sample-orders': '/(tabs)/sample-orders',
                        '/auth/register': '/auth/phone',
                        '/auth/login': '/auth/phone',
                        '/profile': '/profile',
                        '/manufacturer-dashboard': '/manufacturer-dashboard',
                    };

                    const mobileRoute = routeMap[content.action_url] || content.action_url;
                    router.push(mobileRoute as any);
                } catch (error) {
                    console.error('Navigation error:', error);
                }
            } else {
                // Handle external URLs
                Linking.openURL(content.action_url);
            }
        }
    };

    const getBannerStyle = () => {
        switch (content.content_type) {
            case 'banner':
                return styles.bannerContainer;
            case 'announcement':
                return styles.announcementContainer;
            case 'offer':
                return styles.offerContainer;
            case 'featured_content':
                return styles.featuredContainer;
            default:
                return styles.bannerContainer;
        }
    };



    return (
        <TouchableOpacity style={[styles.container, getBannerStyle()]} onPress={handlePress}>
            {content.image_url && (
                <Image
                    source={{ uri: content.image_url }}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />
            )}
            {/* Proper gradient overlay - transparent at top, dark at bottom */}
            <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
                locations={[0, 0.6, 1]}
                style={styles.gradientOverlay}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>{content.title}</Text>
                    {content.subtitle && (
                        <Text style={styles.subtitle}>{content.subtitle}</Text>
                    )}
                    {content.description && (
                        <Text style={styles.description} numberOfLines={2}>
                            {content.description}
                        </Text>
                    )}
                    {content.action_text && (
                        <View style={styles.actionButton}>
                            <Text style={styles.actionText}>{content.action_text}</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width - 40,
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 20,
        marginVertical: 8,
        backgroundColor: '#f0f0f0',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    gradientOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 20,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    subtitle: {
        fontSize: 14,
        color: '#fff',
        marginBottom: 6,
        opacity: 0.9,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    description: {
        fontSize: 12,
        color: '#fff',
        marginBottom: 12,
        opacity: 0.8,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    actionButton: {
        backgroundColor: '#af4b0e',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // Container styles for different content types
    bannerContainer: {
        backgroundColor: 'transparent',
    },
    announcementContainer: {
        backgroundColor: 'transparent',
    },
    offerContainer: {
        backgroundColor: 'transparent',
    },
    featuredContainer: {
        backgroundColor: 'transparent',
    },
}); 