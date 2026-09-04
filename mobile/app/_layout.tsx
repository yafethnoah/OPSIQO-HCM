import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/provider';

export default function RootLayout(){return <SafeAreaProvider><AuthProvider><Stack screenOptions={{headerShown:false}}><Stack.Screen name="index"/><Stack.Screen name="sign-in"/><Stack.Screen name="select-organization"/><Stack.Screen name="(app)"/></Stack></AuthProvider></SafeAreaProvider>}
