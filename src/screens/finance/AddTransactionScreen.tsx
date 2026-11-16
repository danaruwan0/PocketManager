
import React from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AddTransaction from './AddTransaction';
import { RootTabParamList } from '../../navigation/AppNavigator';


import { TransactionType } from '../../database/repositories/transactionRepository';

type NavigationProp = BottomTabNavigationProp<RootTabParamList>;
type ScreenRoute = RouteProp<RootTabParamList, 'AddTransaction'>;

export default function AddTransactionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRoute>();

  const initialType: TransactionType =
    route.params?.type ?? 'income';

  return (
    <AddTransaction
      key={initialType}
      initialType={initialType}
      onCancel={() => navigation.navigate('Home')}
      onSaved={() => navigation.navigate('Home')}
    />
  );
}
