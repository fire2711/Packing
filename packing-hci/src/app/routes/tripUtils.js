import { TRIP_TYPES } from "./tripConstants";

export function tripTypeLabel(id) {
  const t = TRIP_TYPES.find((x) => x.id === id);
  return t ? t.label : id;
}

export function pct(packed, total) {
  if (total <= 0) return 0;
  return Math.round((packed / total) * 100);
}

export function safeMsg(e, fallback) {
  return (e && e.message) || fallback;
}

export function tmpId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeName(name) {
  return (name || "").trim().toLowerCase();
}