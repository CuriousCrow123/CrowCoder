import type { ParamDef } from "../lib/dev/param-types";

const params: ParamDef[] = [
  { key: "crossfadeDuration", label: "Crossfade Duration", type: "number", value: 250, min: 0, max: 800, step: 50, unit: "ms" },
  { key: "translateY", label: "Translate Y", type: "number", value: 4, min: 0, max: 20, step: 1, unit: "px" },
];

export default params;
