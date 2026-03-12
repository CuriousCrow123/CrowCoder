import type { ParamDef } from "./dev/param-types";

const params: ParamDef[] = [
  {
    key: "proseMaxWidth",
    label: "Prose Column Width",
    type: "number",
    value: 680,
    min: 500,
    max: 900,
    step: 10,
    unit: "px",
  },
  {
    key: "componentBreakoutWidth",
    label: "Component Breakout Width",
    type: "number",
    value: 960,
    min: 700,
    max: 1200,
    step: 10,
    unit: "px",
  },
  {
    key: "paragraphSpacing",
    label: "Paragraph Spacing",
    type: "number",
    value: 1.5,
    min: 0.5,
    max: 3,
    step: 0.25,
    unit: "rem",
  },
  {
    key: "componentSpacing",
    label: "Component Vertical Spacing",
    type: "number",
    value: 4,
    min: 1,
    max: 8,
    step: 0.5,
    unit: "rem",
  },
  {
    key: "accentColor",
    label: "Accent Color",
    type: "color",
    value: "#6366f1",
  },
  {
    key: "backgroundColor",
    label: "Background Color",
    type: "color",
    value: "#faf8f5",
  },
];

export default params;
