import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { whatsappBroadcastService, type CompanyWhatsAppInstanceCard } from '../services/api/whatsapp-broadcast.service';

const STORAGE_KEY = 'win_selected_instance';

interface InstanceContextValue {
  instances: CompanyWhatsAppInstanceCard[];
  selectedInstance: string | null;
  setSelectedInstance: (instanceName: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const InstanceContext = createContext<InstanceContextValue | undefined>(undefined);

export const InstanceProvider: React.FC<{ children: React.ReactNode; enabled?: boolean }> = ({ children, enabled = true }) => {
  const [instances, setInstances] = useState<CompanyWhatsAppInstanceCard[]>([]);
  const [selectedInstance, setSelectedInstanceState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  const setSelectedInstance = useCallback((instanceName: string | null) => {
    setSelectedInstanceState(instanceName);
    try {
      if (instanceName) localStorage.setItem(STORAGE_KEY, instanceName);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const list = await whatsappBroadcastService.listCompanyInstances();
      setInstances(list || []);
      setSelectedInstanceState((prev) => {
        const stillValid = prev && list.some((i) => i.instanceName === prev);
        if (stillValid) return prev;
        const first = list[0]?.instanceName ?? null;
        try {
          if (first) localStorage.setItem(STORAGE_KEY, first);
          else localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        return first;
      });
    } catch (e) {
      console.error('Failed to load company instances', e);
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  const value = useMemo<InstanceContextValue>(
    () => ({ instances, selectedInstance, setSelectedInstance, loading, refresh }),
    [instances, selectedInstance, setSelectedInstance, loading, refresh]
  );

  return <InstanceContext.Provider value={value}>{children}</InstanceContext.Provider>;
};

export function useInstance(): InstanceContextValue {
  const ctx = useContext(InstanceContext);
  if (!ctx) {
    return {
      instances: [],
      selectedInstance: null,
      setSelectedInstance: () => undefined,
      loading: false,
      refresh: async () => undefined,
    };
  }
  return ctx;
}
