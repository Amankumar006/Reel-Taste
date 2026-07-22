'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed prompt
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed) return;

    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIos(ios);

    if (ios) {
      // Show iOS instructions after 3 seconds
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto p-4 rounded-2xl bg-[#0d1f38]/95 border border-teal-500/30 backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Install Reel Taste App</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Add to your home screen for quick access and a full native app experience.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIos ? (
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-xs text-teal-300">
          <span>Tap</span>
          <Share className="w-4 h-4 text-teal-400" />
          <span>then select &quot;Add to Home Screen&quot;</span>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-teal-500/20 text-center"
          >
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Not Now
          </button>
        </div>
      )}
    </div>
  );
}
