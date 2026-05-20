"use client";

import { useEffect, useRef } from "react";

export function WarVisitTracker() {
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    fetch("/api/quests/visit-war", { method: "POST" }).catch(() => {/* non-critical */});
  }, []);

  return null;
}
