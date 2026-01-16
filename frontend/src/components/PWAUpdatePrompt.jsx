import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Download } from 'lucide-react';

export default function PWAUpdatePrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      // Verificar actualizaciones cada hora
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // Manejar evento de instalación
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Ocultar prompt si ya está instalado
    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismissUpdate = () => {
    setNeedRefresh(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
  };

  // Prompt de actualización disponible
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <div className="bg-white rounded-xl shadow-2xl border border-primary-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Nueva versión disponible
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Hay una actualización disponible. Recarga para obtener las últimas mejoras.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Actualizar ahora
                </button>
                <button
                  onClick={handleDismissUpdate}
                  className="btn btn-ghost btn-sm"
                >
                  Después
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissUpdate}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prompt de instalación
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <div className="bg-white rounded-xl shadow-2xl border border-primary-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Instalar Restaurant
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Instala la app en tu dispositivo para acceso rápido y funcionamiento offline.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Instalar
                </button>
                <button
                  onClick={handleDismissInstall}
                  className="btn btn-ghost btn-sm"
                >
                  No ahora
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissInstall}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
