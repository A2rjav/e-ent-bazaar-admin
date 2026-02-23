import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    FlatList,
    Image,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MobileContent } from '../lib/mobileContentService';
import { IconSymbol } from './ui/IconSymbol';

interface ContentCarouselProps {
    content: MobileContent[];
    autoPlay?: boolean;
    autoPlayInterval?: number;
    showIndicators?: boolean;
    showNavigation?: boolean;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = 180;

export default function ContentCarousel({
    content,
    autoPlay = true,
    autoPlayInterval = 5000,
    showIndicators = true,
    showNavigation = true
}: ContentCarouselProps) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Auto-play functionality
    useEffect(() => {
        if (!autoPlay || content.length <= 1) return;

        const interval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % content.length;
            setCurrentIndex(nextIndex);
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [currentIndex, content.length, autoPlay, autoPlayInterval]);

    const handlePress = (item: MobileContent) => {
        if (item.action_url) {
            // Handle internal navigation
            if (item.action_url.startsWith('/')) {
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

                    const mobileRoute = routeMap[item.action_url] || item.action_url;
                    router.push(mobileRoute as any);
                } catch (error) {
                    console.error('Navigation error:', error);
                }
            } else {
                // Handle external URLs
                Linking.openURL(item.action_url);
            }
        }
    };

    const getBannerStyle = (contentType: string) => {
        switch (contentType) {
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

    const getContentTypeIcon = (contentType: string) => {
        switch (contentType) {
            case 'banner':
                return 'megaphone';
            case 'announcement':
                return 'bell';
            case 'offer':
                return 'tag';
            case 'featured_content':
                return 'star';
            default:
                return 'megaphone';
        }
    };

    const renderContentItem = ({ item, index }: { item: MobileContent; index: number }) => (
        <TouchableOpacity
            style={[styles.card, getBannerStyle(item.content_type)]}
            onPress={() => handlePress(item)}
        >
            {/* Background Image */}
            {item.image_url && (
                <Image
                    source={{ uri: item.image_url }}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />
            )}

            {/* Content Type Badge */}
            <View style={styles.contentTypeBadge}>
                <IconSymbol size={12} name={getContentTypeIcon(item.content_type)} color="#fff" />
                <Text style={styles.contentTypeText}>
                    {item.content_type.replace('_', ' ').toUpperCase()}
                </Text>
            </View>

            {/* Gradient Overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
                locations={[0, 0.6, 1]}
                style={styles.gradientOverlay}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>{item.title}</Text>
                    {item.subtitle && (
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    )}
                    {item.description && (
                        <Text style={styles.description} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                    {item.action_text && (
                        <View style={styles.actionButton}>
                            <Text style={styles.actionText}>{item.action_text}</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const handleScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / CARD_WIDTH);
        setCurrentIndex(index);
    };

    const goToNext = () => {
        if (currentIndex < content.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            flatListRef.current?.scrollToIndex({
                index: prevIndex,
                animated: true,
            });
        }
    };

    if (!content || content.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Navigation Arrows */}
            {showNavigation && content.length > 1 && (
                <>
                    <TouchableOpacity
                        style={[styles.navButton, styles.prevButton]}
                        onPress={goToPrevious}
                        disabled={currentIndex === 0}
                    >
                        <IconSymbol size={20} name="chevron.left" color="#af4b0e" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navButton, styles.nextButton]}
                        onPress={goToNext}
                        disabled={currentIndex === content.length - 1}
                    >
                        <IconSymbol size={20} name="chevron.right" color="#af4b0e" />
                    </TouchableOpacity>
                </>
            )}

            {/* Carousel */}
            <FlatList
                ref={flatListRef}
                data={content}
                renderItem={renderContentItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={CARD_WIDTH + 20}
                snapToAlignment="center"
                decelerationRate="fast"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.carouselContainer}
            />

            {/* Indicators */}
            {showIndicators && content.length > 1 && (
                <View style={styles.indicatorsContainer}>
                    {content.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.indicator,
                                index === currentIndex && styles.activeIndicator
                            ]}
                            onPress={() => {
                                setCurrentIndex(index);
                                flatListRef.current?.scrollToIndex({
                                    index,
                                    animated: true,
                                });
                            }}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginVertical: 10,
    },
    carouselContainer: {
        paddingHorizontal: 20,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 20,
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
    contentTypeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    contentTypeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 4,
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
    navButton: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -20 }],
        width: 40,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 10,
    },
    prevButton: {
        left: 10,
    },
    nextButton: {
        right: 10,
    },
    indicatorsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        paddingHorizontal: 20,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ddd',
        marginHorizontal: 4,
    },
    activeIndicator: {
        backgroundColor: '#af4b0e',
        width: 24,
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