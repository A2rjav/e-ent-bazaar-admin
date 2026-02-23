import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';

// Fallback mapping for iOS when SF Symbols fail
const FALLBACK_MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'cart.fill': 'shopping-cart',
  'doc.text.fill': 'description',
  'doc.text': 'description',
  'person.fill': 'person',
  'person.circle': 'account-circle',
  'magnifyingglass': 'search',
  'xmark.circle.fill': 'cancel',
  'slider.horizontal.3': 'tune',
  'location.fill': 'location-on',
  'checkmark.circle.fill': 'check-circle',
  'rectangle.portrait.and.arrow.right': 'logout',
  'bell': 'notifications',
  'message': 'message',
  'globe': 'language',
  'questionmark.circle': 'help',
  'info.circle': 'info',
} as Record<string, keyof typeof MaterialIcons.glyphMap>;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const [useFallback, setUseFallback] = useState(false);

  // If fallback is needed, use MaterialIcons
  if (useFallback) {
    const fallbackName = FALLBACK_MAPPING[name];
    if (fallbackName) {
      return (
        <MaterialIcons
          name={fallbackName}
          size={size}
          color={color}
          style={style as any}
        />
      );
    }
  }

  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
