
import React, { useEffect, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

const BAR_HEIGHTS = [20, 35, 25, 48, 32, 58, 40];

export default function PocketSplashLoader() {
  const animations = useRef(
    BAR_HEIGHTS.map(() => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    const loops = animations.map((animation, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 450 + index * 70,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(animation, {
            toValue: 0.3,
            duration: 450 + index * 70,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [animations]);

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>
        PocketManager
      </Text>

      <Text style={styles.tagline}>
        Manage your money. Manage your future.
      </Text>

      <View style={styles.chart}>
        {animations.map((animation, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: BAR_HEIGHTS[index],
                opacity: animation,
                transform: [
                  {
                    scaleY: animation.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.loading}>
        Preparing your finances...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    alignItems: 'center',
  },

  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  tagline: {
    fontSize: 13,
    color: '#8494AA',
    marginTop: 10,
  },

  chart: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 45,
  },

  bar: {
    width: 8,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
  },

  loading: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 22,
  },
});
