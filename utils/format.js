// Formatting helpers shared across screens.

// Firmware rows carry timestamp_epoch, which is 0 when the RTC wasn't synced
// (recorded_at then reads 1970). Fall back to uploaded_at in that case.
const MIN_VALID_EPOCH = 1577836800; // 2020-01-01

export function rowTime(row, generatedCol = "recorded_at") {
  if (!row) return null;
  if (row.timestamp_epoch && row.timestamp_epoch > MIN_VALID_EPOCH && row[generatedCol]) {
    return new Date(row[generatedCol]);
  }
  if (row.uploaded_at) return new Date(row.uploaded_at);
  if (row.last_seen) return new Date(row.last_seen);
  return null;
}

// A node counts as online if it reported within the last 15 minutes.
export function isRecent(date, windowMs = 15 * 60 * 1000) {
  return !!date && Date.now() - date.getTime() < windowMs;
}

export function timeAgo(date) {
  if (!date) return "—";
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 0) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(days / 365);
  return `${years} yr ago`;
}

export function formatDateTime(date) {
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date) {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function isNum(v) {
  return v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v));
}

// fmt(12.345, 1) -> "12.3"; null -> "—"
export function fmt(v, digits = 1) {
  if (!isNum(v)) return "—";
  const n = Number(v);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function toE164India(tenDigits) {
  return `+91${tenDigits}`;
}

export function onlyDigits(s, max) {
  const d = (s || "").replace(/[^0-9]/g, "");
  return max ? d.slice(0, max) : d;
}

export function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
