import { getApp } from "@react-native-firebase/app";
import {
  getToken,
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";
import {
  NativeAuthStageError,
  isNativeAuthStageError,
} from "@/auth/diagnostic";

let appCheckInstance: ReturnType<typeof initializeAppCheck> | null = null;

function getConfiguredAppCheck() {
  if (appCheckInstance) {
    return appCheckInstance;
  }

  let app: ReturnType<typeof getApp>;

  try {
    app = getApp();
  } catch {
    throw new NativeAuthStageError(
      "firebase_native",
      "PULSE-AUTH-A01",
      "Firebase native initialization failed. Reinstall the current OPSIQO Pulse UAT build and try again.",
    );
  }

  try {
    const provider = new ReactNativeFirebaseAppCheckProvider();

    provider.configure({
      apple: {
        provider: 'appAttest',
      },
      android: {
        provider: 'playIntegrity',
      },
    });

    appCheckInstance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    throw new NativeAuthStageError(
      "firebase_native",
      "PULSE-AUTH-A01",
      "Firebase App Check initialization failed on this device.",
    );
  }

  return appCheckInstance;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchValidToken(forceRefresh: boolean): Promise<string> {
  let result: Awaited<ReturnType<typeof getToken>>;

  try {
    result = await getToken(getConfiguredAppCheck(), forceRefresh);
  } catch (error) {
    if (isNativeAuthStageError(error)) {
      throw error;
    }

    throw new NativeAuthStageError(
      "app_check",
      "PULSE-AUTH-A02",
      "Device verification token could not be obtained.",
    );
  }

  const token = String(result.token || "").trim();

  if (!token) {
    throw new NativeAuthStageError(
      "app_check",
      "PULSE-AUTH-A02",
      "Device verification returned an empty token.",
    );
  }

  return token;
}

export async function getValidAppCheckToken(
  forceRefresh = false,
): Promise<string> {
  try {
    return await fetchValidToken(forceRefresh);
  } catch (firstError) {
    if (
      isNativeAuthStageError(firstError) &&
      firstError.code === "PULSE-AUTH-A01"
    ) {
      throw firstError;
    }

    // RNFirebase initializeAppCheck can return before native provider setup
    // has fully settled. Retry once with a forced refresh.
    await wait(350);

    try {
      return await fetchValidToken(true);
    } catch (secondError) {
      if (
        isNativeAuthStageError(secondError) &&
        secondError.code === "PULSE-AUTH-A01"
      ) {
        throw secondError;
      }

      throw new NativeAuthStageError(
        "app_check",
        "PULSE-AUTH-A02",
        "Secure device verification could not be completed. Close and reopen OPSIQO Pulse, then try again.",
      );
    }
  }
}