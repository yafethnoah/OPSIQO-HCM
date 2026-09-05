import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { Button, Card, Muted } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');

    try {
      await signIn(email, password);
      router.replace('/select-organization');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.brand}>
        <Image
          source={require('../assets/opsiqo-pulse-logo.png')}
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="OPSIQO Pulse"
        />
        <Muted>Your work, attendance, requests and HR services in one secure app.</Muted>
      </View>

      <Card>
        <Text style={s.label}>Work email</Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Button
          title={busy ? 'Signing inâ€¦' : 'Sign in'}
          onPress={submit}
          disabled={busy || !email || !password}
        />
      </Card>

      <Muted>
        OPSIQO stores mobile session credentials in the device secure keychain/keystore.
        HR data is loaded from the governed OPSIQO API.
      </Muted>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 22,
    justifyContent: 'center',
    gap: 22,
  },
  brand: {
    gap: 10,
  },
  logo: {
    width: 286,
    height: 76,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 13,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});