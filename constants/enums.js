// Labels for numeric codes stored by the firmware.
// Source of truth: firmware enums.h (Agrosmart_NodeA / Agrosmart_NodeC).
// Keep these in sync if enums.h changes.

// ErrorSeverity → system_logs.severity
export const SEVERITY = {
  1: { label: "Info", tone: "info" },
  2: { label: "Operational", tone: "primary" },
  3: { label: "Critical", tone: "warn" },
  4: { label: "Catastrophic", tone: "danger" },
};

// DecisionReason → irrigation_decisions.decision_reason
export const DECISION_REASON = {
  0x00: { label: "No action needed", detail: "Soil water is within the safe range.", tone: "primary" },
  0x01: { label: "Soil water deficit exceeded", detail: "Soil has dried past the allowed depletion level — irrigation triggered.", tone: "water" },
  0x10: { label: "Rain lock", detail: "Recent rainfall is above the rain-lock limit, so irrigation is paused.", tone: "water" },
  0x11: { label: "Low battery", detail: "Pump node battery is too low to run safely.", tone: "warn" },
  0x12: { label: "Sensor fault", detail: "A sensor reported a fault, so the system won't decide on bad data.", tone: "danger" },
  0x13: { label: "Radio link fault", detail: "LoRa/UART link between nodes is unreliable.", tone: "danger" },
  0x14: { label: "SD card fault", detail: "Local storage on Node B failed.", tone: "danger" },
  0x15: { label: "Manual override", detail: "Irrigation was controlled manually.", tone: "info" },
  0x16: { label: "Configuration fault", detail: "Farm profile values are missing or invalid.", tone: "danger" },
  0x17: { label: "Daily water limit reached", detail: "Today's maximum water volume has already been delivered.", tone: "warn" },
  0x18: { label: "Waiting for soil to settle", detail: "Stabilisation delay after the last irrigation is still running.", tone: "info" },
  0x19: { label: "Below dose threshold", detail: "Required volume is too small to be worth running the pump.", tone: "primary" },
  0x1a: { label: "Internal controller fault", detail: "Node B ran out of queue/memory resources.", tone: "danger" },
};

// IrrigationStatus → irrigation_decisions.status_flag / irrigation_events.status_flag
export const IRRIGATION_STATUS = {
  0: { label: "Not required", tone: "primary" },
  1: { label: "Required", tone: "water" },
  2: { label: "In progress", tone: "water" },
  3: { label: "Completed", tone: "primary" },
  4: { label: "Blocked (safety)", tone: "warn" },
  5: { label: "Aborted", tone: "warn" },
  6: { label: "Failed", tone: "danger" },
};

// health_flag bitmask → sensor_records.health_flag
export const HEALTH_BITS = [
  { bit: 0x01, node: "Node A", label: "Soil sensor fault" },
  { bit: 0x02, node: "Node A", label: "GPS fix lost" },
  { bit: 0x04, node: "Node A", label: "Radio link fault" },
  { bit: 0x10, node: "Node B", label: "Pressure/temp sensor (BMP280) fault" },
  { bit: 0x20, node: "Node B", label: "Rain gauge fault" },
  { bit: 0x40, node: "Node B", label: "Clock (RTC) fault" },
  { bit: 0x80, node: "Node B", label: "SD card fault" },
];

export function healthFaults(flag) {
  const f = Number(flag) || 0;
  return HEALTH_BITS.filter((h) => (f & h.bit) !== 0);
}

// CropCategory → farm_profiles.crop_id
export const CROP = {
  0: "Vegetable",
  1: "Grain",
  2: "Fruit",
  3: "Fiber",
  4: "Other",
};

// GrowthStage → farm_profiles.growth_stage
export const GROWTH_STAGE = {
  0: "Initial",
  1: "Development",
  2: "Mid-season",
  3: "Late season",
  4: "Harvest",
};

export function hex(code) {
  return `0x${Number(code).toString(16).toUpperCase().padStart(2, "0")}`;
}

// Look up an entry; returns {label, detail?, tone} with a safe fallback.
export function lookup(map, code) {
  if (code === null || code === undefined) return { label: "—", tone: "muted" };
  const entry = map[code];
  if (!entry) return { label: `Code ${code} (${hex(code)})`, tone: "muted" };
  return typeof entry === "string" ? { label: entry, tone: "muted" } : entry;
}
