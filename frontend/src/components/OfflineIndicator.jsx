import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mostrar indicador de reconexión
  if (showReconnected) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full shadow-lg">
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Conexión restaurada</span>
        </div>
      </div>
    );
  }

  // Mostrar indicador offline
  if (!isOnline) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-full shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Sin conexión</span>
        </div>
      </div>
    );
  }

  return null;
}
