import type { ParamDef } from '../lib/dev/param-types';

const params: ParamDef[] = [
  { key: 'segmentRadius', label: 'Segment Border Radius', type: 'number', value: 4, min: 0, max: 12, step: 1, unit: 'px' },
  { key: 'segmentGap', label: 'Segment Gap', type: 'number', value: 3, min: 1, max: 8, step: 1, unit: 'px' },
  { key: 'segmentHeight', label: 'Segment Height', type: 'number', value: 8, min: 4, max: 20, step: 2, unit: 'px' },
  { key: 'unseenColor', label: 'Unseen Color', type: 'color', value: '#d1d5db' },
  { key: 'dueColor', label: 'Due Color', type: 'color', value: '#6366f1' },
  { key: 'answeredColor', label: 'Answered Color', type: 'color', value: '#a5b4fc' },
  { key: 'masteredColor', label: 'Mastered Color', type: 'color', value: '#16a34a' },
];

export default params;
