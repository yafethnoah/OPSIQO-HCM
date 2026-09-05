import * as SecureStore from "expo-secure-store";
import { getValidAppCheckToken } from "@/security/app-check";
import { NativeAuthStageError } from "./diagnostic";

const SESSION_KEY = "opsiqo.mobile.firebase.session.v1";
const ORG_KEY = "opsiqo.mobile.activeOrg.v1";

type FirebaseSession = {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
  localId?: string;
};

const apiKey = () =>
  String(process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "").trim();

function safeFirebaseAuthFailureCode(code: unknown) {
  const normalized = String(code || "").toUpperCase();

  if (
    normalized.includes("INVALID_LOGIN_CREDENTIALS") ||
    normalized.includes("EMAIL_NOT_FOUND") ||
    normalized.includes("INVALID_PASSWORD")
  ) {
    return "PULSE-AUTH-A04-CREDENTIALS";
  }

  if (normalized.includes("USER_DISABLED")) {
    return "PULSE-AUTH-A04-DISABLED";
  }

  if (normalized.includes("TOO_MANY_ATTEMPTS")) {
    return "PULSE-AUTH-A04-RATE";
  }

  if (
    normalized.includes("APP_CHECK") ||
    normalized.includes("MISSING_APP_CREDENTIAL")
  ) {
    return "PULSE-AUTH-A04-APPCHECK";
  }

  return "PULSE-AUTH-A04-REJECTED";
}

async function writeSession(session: FirebaseSession) {
  try {
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify(session),
      {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      },
    );
  } catch {
    throw new NativeAuthStageError(
      "secure_session",
      "PULSE-AUTH-A05",
      "Secure session storage failed on this device.",
    );
  }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<FirebaseSession> {
  const key = apiKey();

  if (!key) {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A03-CONFIG",
      "Firebase mobile authentication is not configured in this build.",
    );
  }

  // H50.1P diagnostic boundary A01/A02:
  // if this fails, Firebase Authentication is never called.
  const appCheckToken = await getValidAppCheckToken();

  let response: Response;

  try {
    response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'X-Firebase-AppCheck': appCheckToken,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          returnSecureToken: true,
        }),
      },
    );
  } catch {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A03",
      "Firebase Authentication could not be reached from this device.",
    );
  }

  let payload: any;

  try {
    payload = await response.json();
  } catch {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A03",
      "Firebase Authentication returned an unreadable response.",
    );
  }

  if (!response.ok) {
    const safeCode = safeFirebaseAuthFailureCode(payload?.error?.message);

    throw new NativeAuthStageError(
      "firebase_auth",
      safeCode,
      firebaseAuthMessage(payload?.error?.message),
    );
  }

  const session: FirebaseSession = {
    idToken: String(payload.idToken),
    refreshToken: String(payload.refreshToken),
    expiresAt:
      Date.now() +
      Math.max(60, Number(payload.expiresIn || 3600) - 120) * 1000,
    email: String(payload.email || email),
    localId: String(payload.localId || ""),
  };

  if (!session.idToken || !session.refreshToken) {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A03",
      "Firebase Authentication did not return a complete mobile session.",
    );
  }

  // H50.1P diagnostic boundary A05.
  await writeSession(session);

  return session;
}

async function refreshSession(
  session: FirebaseSession,
): Promise<FirebaseSession> {
  const key = apiKey();

  if (!key) {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A03-CONFIG",
      "Firebase mobile authentication is not configured in this build.",
    );
  }

  const appCheckToken = await getValidAppCheckToken();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });

  let response: Response;

  try {
    response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          'X-Firebase-AppCheck': appCheckToken,
        },
        body: body.toString(),
      },
    );
  } catch {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A03",
      "Firebase session refresh could not be reached.",
    );
  }

  let payload: any;

  try {
    payload = await response.json();
  } catch {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A03",
      "Firebase session refresh returned an unreadable response.",
    );
  }

  if (!response.ok) {
    throw new NativeAuthStageError(
      "firebase_auth",
      "PULSE-AUTH-A04-REFRESH",
      "Your OPSIQO session has expired. Please sign in again.",
    );
  }

  const next: FirebaseSession = {
    ...session,
    idToken: String(payload.id_token),
    refreshToken: String(payload.refresh_token || session.refreshToken),
    expiresAt:
      Date.now() +
      Math.max(60, Number(payload.expires_in || 3600) - 120) * 1000,
    localId: String(payload.user_id || session.localId || ""),
  };

  await writeSession(next);

  return next;
}

export async function getValidIdToken(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    let session = JSON.parse(raw) as FirebaseSession;

    if (!session.idToken || !session.refreshToken) {
      return null;
    }

    if (Date.now() >= session.expiresAt) {
      session = await refreshSession(session);
    }

    return session.idToken;
  } catch (error) {
    if (error instanceof NativeAuthStageError) {
      throw error;
    }

    return null;
  }
}

export async function hasSession() {
  return Boolean(await getValidIdToken());
}

export async function signOut() {
  await Promise.all([
    SecureStore.deleteItemAsync(SESSION_KEY),
    SecureStore.deleteItemAsync(ORG_KEY),
  ]);
}

export async function getActiveOrg() {
  return (await SecureStore.getItemAsync(ORG_KEY)) || null;
}

export async function setActiveOrg(orgId: string) {
  await SecureStore.setItemAsync(ORG_KEY, orgId);
}

function firebaseAuthMessage(code: string) {
  const normalized = String(code || "").toUpperCase();

  if (
    normalized.includes("INVALID_LOGIN_CREDENTIALS") ||
    normalized.includes("EMAIL_NOT_FOUND") ||
    normalized.includes("INVALID_PASSWORD")
  ) {
    return "Email or password is incorrect.";
  }

  if (normalized.includes("USER_DISABLED")) {
    return "This account is disabled. Contact your OPSIQO administrator.";
  }

  if (normalized.includes("TOO_MANY_ATTEMPTS")) {
    return "Too many sign-in attempts. Try again later.";
  }

  if (
    normalized.includes("APP_CHECK") ||
    normalized.includes("MISSING_APP_CREDENTIAL")
  ) {
    return "Secure device verification failed. Close and reopen OPSIQO Pulse, then try again.";
  }

  return "Firebase sign-in was rejected. Contact your OPSIQO administrator with the displayed PULSE-AUTH code.";
}