import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/auth/provider";
import type { MobileBootstrap } from "@/types/mobile";

type BootstrapResponse = { data: MobileBootstrap };

const bootstrapCache = new Map<string, MobileBootstrap>();
const bootstrapRequests = new Map<string, Promise<MobileBootstrap>>();

async function fetchBootstrap(orgId: string) {
  const existing = bootstrapRequests.get(orgId);
  if (existing) return existing;

  const request = apiFetch<BootstrapResponse>(
    `/api/organizations/${orgId}/mobile/bootstrap`,
    { orgId },
  )
    .then((result) => {
      bootstrapCache.set(orgId, result.data);
      return result.data;
    })
    .finally(() => {
      bootstrapRequests.delete(orgId);
    });

  bootstrapRequests.set(orgId, request);
  return request;
}

export function useBootstrap() {
  const { activeOrgId } = useAuth();
  const cached = activeOrgId ? bootstrapCache.get(activeOrgId) ?? null : null;

  const [data, setData] = useState<MobileBootstrap | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!activeOrgId) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const lastGood = bootstrapCache.get(activeOrgId) ?? null;

    // Never blank a healthy screen merely because a refresh is running.
    if (lastGood) {
      setData(lastGood);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await fetchBootstrap(activeOrgId);
      setData(result);
    } catch (cause) {
      // Keep the last known-good bootstrap visible on transient/server errors.
      const fallback = bootstrapCache.get(activeOrgId);
      if (fallback) setData(fallback);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to refresh OPSIQO Pulse data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    if (!activeOrgId) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const lastGood = bootstrapCache.get(activeOrgId);
    if (lastGood) {
      setData(lastGood);
      setLoading(false);
    }

    void reload();
  }, [activeOrgId, reload]);

  return { data, loading, refreshing, error, reload };
}
