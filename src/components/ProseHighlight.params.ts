import type { ParamDef } from "../lib/dev/param-types";

const params: ParamDef[] = [
  { key: "underlineThickness", label: "Underline Thickness", type: "number", value: 2, min: 1, max: 8, step: 0.5, unit: "px", tier: "css" },
  { key: "pulseColor", label: "Pulse Color", type: "color", value: "#6366f1", tier: "css" },
  { key: "pulseDuration", label: "Pulse Duration", type: "number", value: 600, min: 200, max: 1500, step: 50, unit: "ms", tier: "css" },
  { key: "activeBackground", label: "Active Background", type: "color", value: "#eef2ff", tier: "css" },
];

export default params;
