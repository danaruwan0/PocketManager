
import React, { useState, useEffect } from 'react';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';

import { initializeDatabase } from './src/database/database';
import colors from './src/theme/colors';

import BootSplash from 'react-native-bootsplash';
import PocketSplashLoader from './src/compornet/common/PocketSplashLoader';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startApp = async () => {
      try {
        await initializeDatabase();
        setDbReady(true);
      } catch (err) {
        console.error('Database initialization error:', err);

        setError(
          'Database initialization failed. Please restart the app.',
        );
      } finally {
        await BootSplash.hide({ fade: true });
      }
    };

    startApp();
  }, []);

  return (
    <SafeAreaProvider>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            PocketManager
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>
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
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryLight,
    marginBottom: 16,
  },

  errorText: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
});

export default App;
