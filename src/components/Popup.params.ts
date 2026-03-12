import type { ParamDef } from '../lib/dev/param-types';

const params: ParamDef[] = [
  { key: 'enterDuration', label: 'Enter Duration', type: 'number', value: 250, min: 50, max: 800, step: 50, unit: 'ms' },
  { key: 'exitDuration', label: 'Exit Duration', type: 'number', value: 200, min: 50, max: 600, step: 50, unit: 'ms' },
  { key: 'backdropOpacity', label: 'Backdrop Opacity', type: 'number', value: 0.4, min: 0, max: 0.8, step: 0.05 },
  { key: 'slideWidth', label: 'Slide-In Width', type: 'number', value: 380, min: 280, max: 600, step: 20, unit: 'px' },
];

export default params;
