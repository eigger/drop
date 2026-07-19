"use client";

import { useState } from "react";

export function useSelection() {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function start() {
    setActive(true);
  }

  function cancel() {
    setActive(false);
    setSelectedIds(new Set());
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(ids: string[]) {
    setSelectedIds(new Set(ids));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return { active, selectedIds, start, cancel, toggle, selectAll, clearSelection };
}
