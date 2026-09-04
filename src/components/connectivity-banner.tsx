'use client';
import { useEffect, useState } from 'react';

export function ConnectivityBanner() {
  const [online, setOnline] = useState(true);
  const [saveData, setSaveData] = useState(false);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      const connection = (navigator as any).connection;
      setSaveData(Boolean(connection?.saveData));
    };
    update();
    window.addEventListener('online', update); window.addEventListener('offline', update);
    const connection = (navigator as any).connection;
    connection?.addEventListener?.('change', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); connection?.removeEventListener?.('change', update); };
  }, []);
  if (online && !saveData) return null;
  return <div className={`connectivityBanner ${online ? 'lowData' : 'offline'}`} role="status" data-opsiqo-connectivity={online ? 'low-data' : 'offline'}>
    <strong>{online ? 'Low-data mode detected' : 'You are offline'}</strong>
    <span>{online ? 'OPSIQO will avoid unnecessary network work where possible.' : 'Live HR data is unavailable. OPSIQO does not cache employee, payroll, document, or API data for offline use.'}</span>
  </div>;
}
