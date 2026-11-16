
// import React, { useEffect } from 'react';

// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
// } from 'react-native';

// import colors from '../../theme/colors';

// export default function Loading({
//   onFinish,
// }: {
//   onFinish: () => void;
// }) {
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       onFinish();
//     }, 1500);

//     return () => clearTimeout(timer);
//   }, [onFinish]);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>PocketManager</Text>

//       <Text style={styles.subtitle}>
//         Manage your money. Manage your future.
//       </Text>

//       <ActivityIndicator
//         size="large"
//         color={colors.primary}
//         style={styles.loader}
//       />

//       <Text style={styles.loadingText}>
//         Loading...
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   title: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: colors.primaryLight,
//   },

//   subtitle: {
//     fontSize: 14,
//     color: colors.textSecondary,
//     marginTop: 10,
//   },

//   loader: {
//     marginTop: 35,
//   },

//   loadingText: {
//     fontSize: 13,
//     color: colors.textMuted,
//     marginTop: 12,
//   },
// });
