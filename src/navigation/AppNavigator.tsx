
import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomNavigation from '../compornet/common/BottomNavigation';

import Home from '../screens/home/Home';
import Transactions from '../screens/finance/Transactions';
import AddTransactionScreen from '../screens/finance/AddTransactionScreen';
import Reports from '../screens/analytics/Reports';
import Profile from '../screens/settings/Profile';
import EditProfile from '../screens/settings/EditProfile';

import { TransactionType } from '../database/repositories/transactionRepository';

import Calculator from '../screens/tools/Calculator';
import Notes from '../screens/tools/Notes';
import Schedule from '../screens/tools/Schedule';

export type RootTabParamList = {
  Home: undefined;
  Transactions: undefined;
  AddTransaction: {
    type?: TransactionType;
  } | undefined;
  Reports: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  EditProfile: undefined;
  Calculator: undefined;
  Notes: undefined;
  Schedule: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={props => <BottomNavigation {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={Home} />

      <Tab.Screen
        name="Transactions"
        component={Transactions}
      />

      <Tab.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
      />

      <Tab.Screen name="Reports" component={Reports} />

      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />

        <Stack.Screen
          name="EditProfile"
          component={EditProfile}
        />



        <Stack.Screen
          name="Calculator"
          component={Calculator}
        />

        <Stack.Screen
          name="Notes"
          component={Notes}
        />

        <Stack.Screen
          name="Schedule"
          component={Schedule}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
