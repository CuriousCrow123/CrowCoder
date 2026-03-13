import type { ParamDef } from '../lib/dev/param-types';

const params: ParamDef[] = [
  { key: 'borderRadius', label: 'Card Border Radius', type: 'number', value: 12, min: 0, max: 24, step: 2, unit: 'px' },
  { key: 'cardBg', label: 'Card Background', type: 'color', value: '#fffbf0' },
  { key: 'correctColor', label: 'Correct Answer Color', type: 'color', value: '#16a34a' },
  { key: 'incorrectColor', label: 'Incorrect Answer Color', type: 'color', value: '#dc2626' },
];

export default params;
