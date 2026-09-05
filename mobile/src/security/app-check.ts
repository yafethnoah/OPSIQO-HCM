import { getApp } from '@react-native-firebase/app';
import {
  getToken,
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';

let appCheckInstance: ReturnType<typeof initializeAppCheck> | null = null;

function getConfiguredAppCheck() {
  if (appCheckInstance) {
    return appCheckInstance;
  }

  const provider = new ReactNativeFirebaseAppCheckProvider();

  provider.configure({
    apple: {
      provider: 'appAttest',
    },
    android: {
      provider: 'playIntegrity',
    },
  });

  appCheckInstance = initializeAppCheck(getApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  });

  return appCheckInstance;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchValidToken(forceRefresh: boolean): Promise<string> {
  const result = await getToken(getConfiguredAppCheck(), forceRefresh);
  const token = String(result.token || '').trim();

  if (!token) {
    throw new Error('empty_app_check_token');
  }

  return token;
}

export async function getValidAppCheckToken(
  forceRefresh = false
): Promise<string> {
  try {
    return await fetchValidToken(forceRefresh);
  } catch {
    // RNFirebase initializeAppCheck returns synchronously while native provider
    // setup completes in the background. Retry once to avoid a first-launch race.
    await wait(350);

    try {
      return await fetchValidToken(true);
    } catch {
      throw new Error(
        'Device verification could not be completed. Close and reopen OPSIQO Pulse, then try again.'
      );
    }
  }
}