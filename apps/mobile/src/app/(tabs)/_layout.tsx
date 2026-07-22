import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity } from 'react-native';
import { Compass, Bookmark, Heart, Settings2, Users } from 'lucide-react-native';
import { usePreferences } from '@/utils/usePreferences';
import { useWatchlist } from '@/utils/useWatchlist';

function AnimatedTabIcon({
  focused,
  iconFn,
  label,
  badge,
  onPress,
}: {
  focused: boolean;
  iconFn: (color: string) => React.ReactNode;
  label: string;
  badge?: number;
  onPress?: (e?: any) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.2 : 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [focused, scale, glow]);

  const color = focused ? '#2dd4bf' : 'rgba(255,255,255,0.4)';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale }], position: 'relative' }}>
        {iconFn(color)}
        {badge != null && badge > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -8,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              backgroundColor: '#f87171',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
              borderWidth: 2,
              borderColor: 'rgba(8,15,30,0.98)',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </Animated.View>
      <Text style={{ color, fontSize: 10, fontWeight: focused ? '700' : '500', marginTop: 4 }}>
        {label}
      </Text>
      <Animated.View
        style={{
          width: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }),
          height: 3,
          borderRadius: 2,
          backgroundColor: '#2dd4bf',
          marginTop: 3,
          shadowColor: '#2dd4bf',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 6,
        }}
      />
    </TouchableOpacity>
  );
}

const DiscoverTabButton = (props: any) => (
  <AnimatedTabIcon
    {...props}
    focused={props.accessibilityState?.selected ?? false}
    iconFn={(c) => <Compass size={24} color={c} />}
    label="Discover"
    onPress={props.onPress ?? undefined}
  />
);

const PartyTabButton = (props: any) => (
  <AnimatedTabIcon
    {...props}
    focused={props.accessibilityState?.selected ?? false}
    iconFn={(c) => <Users size={24} color={c} />}
    label="Party"
    onPress={props.onPress ?? undefined}
  />
);

const WatchlistTabButton = (props: any) => {
  const { count } = useWatchlist();
  return (
    <AnimatedTabIcon
      {...props}
      focused={props.accessibilityState?.selected ?? false}
      iconFn={(c) => <Bookmark size={24} color={c} />}
      label="Watchlist"
      badge={count}
      onPress={props.onPress ?? undefined}
    />
  );
};

const RatedTabButton = (props: any) => {
  const { prefs } = usePreferences();
  const ratedCount = Object.keys(prefs.ratings ?? {}).length;
  return (
    <AnimatedTabIcon
      {...props}
      focused={props.accessibilityState?.selected ?? false}
      iconFn={(c) => <Heart size={24} color={c} />}
      label="Rated"
      badge={ratedCount > 0 ? ratedCount : undefined}
      onPress={props.onPress ?? undefined}
    />
  );
};

const SettingsTabButton = (props: any) => (
  <AnimatedTabIcon
    {...props}
    focused={props.accessibilityState?.selected ?? false}
    iconFn={(c) => <Settings2 size={24} color={c} />}
    label="Prefs"
    onPress={props.onPress ?? undefined}
  />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'rgba(8,15,30,0.98)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: DiscoverTabButton,
        }}
      />
      <Tabs.Screen
        name="watchparty"
        options={{
          tabBarButton: PartyTabButton,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          tabBarButton: WatchlistTabButton,
        }}
      />
      <Tabs.Screen
        name="rated"
        options={{
          tabBarButton: RatedTabButton,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarButton: SettingsTabButton,
        }}
      />
    </Tabs>
  );
}
