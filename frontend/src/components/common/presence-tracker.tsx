"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiClient } from "@/lib/api/client";

/**
 * Global presence heartbeat: sends a non-blocking ping every 20 seconds.
 * Powers the real-time "Active Right Now" and live traffic analytics.
 */
export function PresenceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Generate or retrieve persistent anonymous clientId
    let clientId = "";
    try {
      clientId = localStorage.getItem("ulovepdf_client_id") || "";
      if (!clientId) {
        clientId = "usr_" + Math.random().toString(36).substring(2, 12);
        localStorage.setItem("ulovepdf_client_id", clientId);
      }
    } catch {
      clientId = "usr_guest";
    }

    const sendPing = () => {
      // Collect real client environment metrics
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
      const device = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";

      let browser = "Other";
      if (/edg/i.test(ua)) browser = "Microsoft Edge";
      else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
      else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
      else if (/safari/i.test(ua)) browser = "Safari";

      // Non-blocking fire-and-forget
      apiClient
        .post("/health/ping", {
          client_id: clientId,
          page: pathname,
          device,
          browser,
        })
        .catch(() => {
          // silent fail
        });
    };

    // Send immediate ping upon route change or initial load
    sendPing();

    // Pulse heartbeat every 20 seconds
    const interval = setInterval(sendPing, 20000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
