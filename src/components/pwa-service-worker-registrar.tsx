"use client";

import { useEffect } from "react";
import type { PwaOfflineReadinessStatus } from "@/lib/workspace/pwa-offline-readiness";

interface PwaServiceWorkerRegistrarProps {
  onStatusChange: (status: PwaOfflineReadinessStatus) => void;
}

export function PwaServiceWorkerRegistrar({ onStatusChange }: PwaServiceWorkerRegistrarProps) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      onStatusChange("unsupported");
      return;
    }

    let cancelled = false;

    const setStatus = (status: PwaOfflineReadinessStatus) => {
      if (!cancelled) {
        onStatusChange(status);
      }
    };

    if (process.env.NODE_ENV !== "production") {
      void cleanupDevelopmentServiceWorker();
      onStatusChange("unsupported");
      return;
    }

    const registerServiceWorker = async () => {
      setStatus("registering");

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none"
        });

        if (registration.active || navigator.serviceWorker.controller) {
          setStatus("ready");
        }

        registration.addEventListener("updatefound", () => {
          setStatus("registering");
          const worker = registration.installing;

          worker?.addEventListener("statechange", () => {
            if (worker.state === "activated") {
              setStatus("ready");
            }

            if (worker.state === "redundant") {
              setStatus("error");
            }
          });
        });

        await navigator.serviceWorker.ready;
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };

    if (document.readyState === "complete") {
      void registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerServiceWorker);
    };
  }, [onStatusChange]);

  return null;
}

async function cleanupDevelopmentServiceWorker() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => registration.scope === `${window.location.origin}/`)
        .map((registration) => registration.unregister())
    );

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("package-tetris-"))
          .map((cacheName) => caches.delete(cacheName))
      );
    }
  } catch {
    // Development cleanup is best-effort; production registration still handles real errors.
  }
}
