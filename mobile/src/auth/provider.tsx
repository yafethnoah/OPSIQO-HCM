import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiFetch } from "@/api/client";
import {
  getActiveOrg,
  hasSession,
  setActiveOrg,
  signInWithPassword,
  signOut as clearSession,
} from "./session";
import {
  NativeAuthStageError,
  isNativeAuthStageError,
} from "./diagnostic";
import type { OrganizationSummary } from "@/types/mobile";

type AuthState = {
  ready: boolean;
  authenticated: boolean;
  organizations: OrganizationSummary[];
  activeOrgId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  selectOrg: (orgId: string) => Promise<void>;
  reloadOrganizations: () => Promise<OrganizationSummary[]>;
};

const Context = createContext<AuthState | null>(null);

function organizationLoadMessage(error: unknown) {
  if (isNativeAuthStageError(error)) {
    return error;
  }

  if (error instanceof ApiError) {
    const status =
      Number.isFinite(error.status) && error.status > 0
        ? String(error.status)
        : "HTTP";

    return new NativeAuthStageError(
      "opsiqo_api",
      `PULSE-AUTH-A06-${status}`,
      error.status >= 500 || error.code === "internal_error"
        ? "OPSIQO could not load your organization access. Please try again."
        : "OPSIQO organization access was rejected. Contact your OPSIQO administrator with the displayed PULSE-AUTH code.",
    );
  }

  return error instanceof Error
    ? error
    : new NativeAuthStageError(
        "opsiqo_api",
        "PULSE-AUTH-A06",
        "Organization access could not be loaded.",
      );
}

function isTerminalSessionRejection(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 401 &&
    ["unauthenticated", "session_expired", "invalid_token"].includes(error.code || "")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const reloadOrganizations = useCallback(async () => {
    const result = await apiFetch<{ data: OrganizationSummary[] }>(
      "/api/me/organizations",
      { orgId: null },
    );

    const rows = result.data.filter(
      (organization) => organization.status === "active",
    );

    setOrganizations(rows);

    const firstOrganization = rows[0];

    if (!firstOrganization) {
      setActiveOrgId(null);
      throw new NativeAuthStageError(
        "opsiqo_api",
        "PULSE-AUTH-A06-NOORG",
        "No active OPSIQO organization is assigned to this account.",
      );
    }

    let current = await getActiveOrg();

    if (!current || !rows.some((organization) => organization.orgId === current)) {
      current = firstOrganization.orgId;
      await setActiveOrg(current);
    }

    setActiveOrgId(current);
    return rows;
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const ok = await hasSession();
        setAuthenticated(ok);

        if (ok) {
          const storedOrg = await getActiveOrg();
          if (storedOrg) setActiveOrgId(storedOrg);

          try {
            await reloadOrganizations();
          } catch {
            // A valid encrypted session remains authenticated when organization
            // bootstrap is temporarily unavailable. Screen-level API errors can
            // be retried without bouncing the user back to Sign In.
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, [reloadOrganizations]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await signInWithPassword(email, password);
      setAuthenticated(true);

      try {
        await reloadOrganizations();
      } catch (error) {
        if (isTerminalSessionRejection(error)) {
          await clearSession();
          setAuthenticated(false);
          setOrganizations([]);
          setActiveOrgId(null);
        }

        throw organizationLoadMessage(error);
      }
    },
    [reloadOrganizations],
  );

  const signOut = useCallback(async () => {
    await clearSession();
    setAuthenticated(false);
    setOrganizations([]);
    setActiveOrgId(null);
  }, []);

  const selectOrg = useCallback(
    async (orgId: string) => {
      if (!organizations.some((organization) => organization.orgId === orgId)) {
        throw new Error("Organization is not available to this account.");
      }

      await setActiveOrg(orgId);
      setActiveOrgId(orgId);
    },
    [organizations],
  );

  const value = useMemo(
    () => ({
      ready,
      authenticated,
      organizations,
      activeOrgId,
      signIn,
      signOut,
      selectOrg,
      reloadOrganizations,
    }),
    [
      ready,
      authenticated,
      organizations,
      activeOrgId,
      signIn,
      signOut,
      selectOrg,
      reloadOrganizations,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}