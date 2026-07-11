import { useEffect, useState, useCallback } from 'react';
import { getStatus, activate, type LicenseStatus } from '@/lib/license';

export function useLicense() {
  const [status, setStatus] = useState<LicenseStatus>(() => getStatus());

  const refresh = useCallback(() => setStatus(getStatus()), []);

  useEffect(() => {
    // Re-check every minute in case the app is left open across the boundary.
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const tryActivate = useCallback(
    (key: string) => {
      const res = activate(key);
      if (res.ok) refresh();
      return res;
    },
    [refresh]
  );

  return { status, refresh, tryActivate };
}
