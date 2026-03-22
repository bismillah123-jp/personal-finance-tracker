"use client";

import { useEffect } from "react";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered:", registration.scope);
          })
          .catch((error) => {
            console.log("SW registration failed:", error);
          });
      });
    }
  }, []);

  return <>{children}</>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return { deferredPrompt, isInstalled, installApp };
}

import React from "react";
