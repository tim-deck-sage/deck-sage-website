"use client";
import React, { useEffect, useRef } from "react";

export function AnalyticsConsent() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scope = window as Window & { DeckSageAnalytics?: { mount: (element: HTMLElement) => () => void } };
    let active = true;
    let cleanup: (() => void) | undefined;
    const mount = () => { if (active && root.current && scope.DeckSageAnalytics && !cleanup) cleanup = scope.DeckSageAnalytics.mount(root.current); };
    const script = (id: string, src: string, done?: () => void) => {
      let element = document.getElementById(id) as HTMLScriptElement | null;
      if (!element) { element = document.createElement("script"); element.id = id; element.src = src; if (done) element.addEventListener("load", done, { once: true }); document.head.append(element); }
      else if (done) element.addEventListener("load", done, { once: true });
    };
    window.addEventListener("deck-sage-analytics-ready", mount);
    if (!document.getElementById("ds-analytics-css")) { const css = document.createElement("link"); css.id = "ds-analytics-css"; css.rel = "stylesheet"; css.href = "/analytics.css"; document.head.append(css); }
    if (scope.DeckSageAnalytics) mount();
    else script("ds-analytics-config", "/analytics-config.js", () => script("ds-analytics-runtime", "/analytics.js"));
    return () => { active = false; cleanup?.(); window.removeEventListener("deck-sage-analytics-ready", mount); };
  }, []);
  return <div ref={root} data-analytics-consent-root />;
}
