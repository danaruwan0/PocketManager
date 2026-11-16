
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  Home,
  ArrowLeftRight,
  Plus,
  ChartNoAxesCombined,
  UserRound,
} from 'lucide-react-native';

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '../../theme/colors';

const icons = {
  Home,
  Transactions: ArrowLeftRight,
  AddTransaction: Plus,
  Reports: ChartNoAxesCombined,
  Profile: UserRound,
};

const labels: Record<string, string> = {
  Home: 'Home',
  Transactions: 'Transactions',
  AddTransaction: 'Add',
  Reports: 'Reports',
  Profile: 'Profile',
};

export default function BottomNavigation({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;

        const Icon = icons[
          route.name as keyof typeof icons
        ];

        const color = focused
          ? colors.primaryLight
          : colors.textMuted;

        const isAdd = route.name === 'AddTransaction';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              descriptors[route.key].options.tabBarAccessibilityLabel
            }
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <View
              style={[
                styles.iconContainer,
                focused && !isAdd && styles.activeIcon,
                isAdd && styles.addButton,
              ]}
            >
              <Icon
                size={isAdd ? 27 : 22}
                color={isAdd ? colors.white : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>

            <Text
              style={[
                styles.label,
                { color },
                focused && styles.activeLabel,
              ]}
            >
              {labels[route.name] ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  iconContainer: {
    width: 42,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  activeIcon: {
    // backgroundColor: '#263B60',
  },

  addButton: {
    width: 48,
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 15,
  },

  label: {
    fontSize: 10,
    fontWeight: '500',
  },

  activeLabel: {
    fontWeight: '700',
  },
});
