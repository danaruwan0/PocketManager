import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/database/database';
import colors from './src/theme/colors';
import BootSplash from 'react-native-bootsplash';
import PocketSplashLoader from './src/compornet/common/PocketSplashLoader';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const startApp = useCallback(async () => {
    setDbReady(false);
    setError(null);
    try {
      await initializeDatabase();
      setDbReady(true);
    } catch (err) {
      console.error('Database initialization error:', err);
      setError('Database could not be initialized. Please try again.');
    } finally {
      try {
        await BootSplash.hide({ fade: true });
      } catch (splashError) {
        console.warn('Boot splash could not be hidden:', splashError);
      }
    }
  }, []);

  useEffect(() => { startApp(); }, [startApp, attempt]);

  return (
    <SafeAreaProvider>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>PocketManager</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => setAttempt(value => value + 1)}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : !dbReady ? (
        <PocketSplashLoader />
      ) : (
        <AppNavigator />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primaryLight, marginBottom: 16 },
  errorText: { color: colors.danger, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryButton: { marginTop: 22, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  retryText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
