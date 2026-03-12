import type { ParamDef } from "../lib/dev/param-types";

const params: ParamDef[] = [
  { key: "wheelSize", label: "Wheel Size", type: "number", value: 240, min: 160, max: 400, step: 10, unit: "px" },
  { key: "handleRadius", label: "Handle Radius", type: "number", value: 12, min: 6, max: 24, step: 1, unit: "px" },
  { key: "ringWidth", label: "Ring Width", type: "number", value: 36, min: 16, max: 60, step: 2, unit: "px" },
  { key: "highlightRing", label: "Highlight Ring Color", type: "color", value: "#6366f1" },
];

export default params;
