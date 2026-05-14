import { useCallback, useEffect, useState } from 'react';
import { detectPwaPlatform } from '../lib/utils/pwaPlatform';

let deferredPrompt = null;

export default function usePwaInstall() {
  const [available, setAvailable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const platform = detectPwaPlatform(window.navigator.userAgent);
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (standalone) setIsInstalled(true);
    if (platform.isIos && !standalone) setIsIos(true);
    if (platform.isMobile) setIsMobile(true);

    if (deferredPrompt) setAvailable(true);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setAvailable(true);
    };
    const onInstalled = () => {
      deferredPrompt = null;
      setAvailable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setAvailable(false);
    return choice?.outcome ?? null;
  }, []);

  return { canInstall: available, isIos, isInstalled, isMobile, install };
}
