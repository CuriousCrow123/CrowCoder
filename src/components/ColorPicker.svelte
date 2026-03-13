<script lang="ts">
  import params from './ColorPicker.params';
  import { createParamAccessor } from '../lib/dev/param-types';
  import { lessonState, setComponentValue, setHighlight } from '../lib/state/lesson.svelte';
  import { tunablePromise, type TunableType } from '../lib/dev/lazy';

  let TunableComponent = $state<TunableType | null>(null);
  $effect(() => {
    let cancelled = false;
    tunablePromise?.then((c) => { if (!cancelled) TunableComponent = c; });
    return () => { cancelled = true; };
  });

  let { id = 'main' }: { id?: string } = $props();

  const p = createParamAccessor(params);

  // Color names for the 12 hue positions on the wheel
  const COLOR_NAMES: Record<number, string> = {
    0: 'Red', 30: 'Orange', 60: 'Yellow', 90: 'Chartreuse',
    120: 'Green', 150: 'Spring Green', 180: 'Cyan', 210: 'Azure',
    240: 'Blue', 270: 'Violet', 300: 'Magenta', 330: 'Rose',
  };

  function getColorName(hue: number): string {
    // Find nearest named hue
    const normalized = ((hue % 360) + 360) % 360;
    const nearest = Object.keys(COLOR_NAMES)
      .map(Number)
      .reduce((prev, curr) =>
        Math.abs(curr - normalized) < Math.abs(prev - normalized) ? curr : prev
      );
    return COLOR_NAMES[nearest];
  }

  let hue = $state(0);
  let isDragging = $state(false);

  // Read active highlight to know if this component is being referenced
  let isHighlighted = $derived(lessonState.activeHighlight === `color-${id}`);

  // Update shared state when hue changes, throttled to 1 frame during drag
  $effect(() => {
    const h = hue;
    const dragging = isDragging;
    if (dragging) {
      const raf = requestAnimationFrame(() => {
        setComponentValue('colorPicker', id, { hue: h, name: getColorName(h) });
      });
      return () => cancelAnimationFrame(raf);
    }
    setComponentValue('colorPicker', id, { hue: h, name: getColorName(h) });
  });

  function hueFromEvent(e: MouseEvent | PointerEvent, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    return ((angle * 180 / Math.PI) + 90 + 360) % 360;
  }

  function handlePointerDown(e: PointerEvent) {
    const svg = (e.currentTarget as Element).closest('svg') as SVGSVGElement;
    if (!svg) return;
    isDragging = true;
    hue = Math.round(hueFromEvent(e, svg));
    svg.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const svg = (e.currentTarget as Element).closest('svg') as SVGSVGElement;
    if (!svg) return;
    hue = Math.round(hueFromEvent(e, svg));
  }

  function handlePointerUp() {
    isDragging = false;
  }

  // When this component is interacted with, highlight related prose
  function handleInteraction() {
    setHighlight(`color-${id}`);
  }

  // Compute handle position on the ring
  function handlePosition(h: number, size: number, ring: number) {
    const radius = (size / 2) - (ring / 2);
    const rad = (h - 90) * Math.PI / 180;
    return {
      x: size / 2 + radius * Math.cos(rad),
      y: size / 2 + radius * Math.sin(rad),
    };
  }
</script>

{#snippet wheel(overrides?: Record<string, number | string | boolean>)}
  {@const size = overrides ? (overrides['wheelSize'] as number ?? p('wheelSize', 'number')) : p('wheelSize', 'number')}
  {@const handle = overrides ? (overrides['handleRadius'] as number ?? p('handleRadius', 'number')) : p('handleRadius', 'number')}
  {@const ring = overrides ? (overrides['ringWidth'] as number ?? p('ringWidth', 'number')) : p('ringWidth', 'number')}
  {@const highlightColor = overrides ? (overrides['highlightRing'] as string ?? p('highlightRing', 'color')) : p('highlightRing', 'color')}
  {@const pos = handlePosition(hue, size, ring)}

  <div
    class="color-picker"
    class:highlighted={isHighlighted}
    style:--highlight-ring={highlightColor}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 {size} {size}"
      role="slider"
      aria-label="Color wheel"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={hue}
      aria-valuetext={getColorName(hue)}
      tabindex="0"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onclick={handleInteraction}
      onkeydown={(e) => {
        let handled = true;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          hue = (hue + 5) % 360;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          hue = (hue - 5 + 360) % 360;
        } else if (e.key === 'PageUp') {
          hue = (hue + 30) % 360;
        } else if (e.key === 'PageDown') {
          hue = (hue - 30 + 360) % 360;
        } else if (e.key === 'Home') {
          hue = 0;
        } else if (e.key === 'End') {
          hue = 359;
        } else {
          handled = false;
        }
        if (handled) {
          e.preventDefault();
          handleInteraction();
        }
      }}
    >
      <!-- Conic gradient color wheel via multiple arc segments -->
      <defs>
        <mask id="ring-mask-{id}">
          <circle cx={size/2} cy={size/2} r={size/2} fill="white" />
          <circle cx={size/2} cy={size/2} r={size/2 - ring} fill="black" />
        </mask>
      </defs>

      <!-- Draw the color ring using many small arcs -->
      {#each Array.from({ length: 360 }, (_, i) => i) as deg}
        {@const r = size / 2}
        {@const rad1 = (deg - 91) * Math.PI / 180}
        {@const rad2 = (deg - 89) * Math.PI / 180}
        <line
          x1={r + (r - 1) * Math.cos(rad1)}
          y1={r + (r - 1) * Math.sin(rad1)}
          x2={r + (r - ring) * Math.cos(rad1)}
          y2={r + (r - ring) * Math.sin(rad1)}
          stroke="hsl({deg}, 80%, 55%)"
          stroke-width="2.5"
        />
      {/each}

      <!-- Center shows selected color -->
      <circle
        cx={size/2}
        cy={size/2}
        r={size/2 - ring - 8}
        fill="hsl({hue}, 80%, 55%)"
        opacity="0.2"
      />

      <!-- Drag handle -->
      <circle
        cx={pos.x}
        cy={pos.y}
        r={handle}
        fill="hsl({hue}, 80%, 55%)"
        stroke="white"
        stroke-width="3"
        style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));"
      />
    </svg>

    <div class="color-info">
      <div
        class="color-swatch"
        style:background-color="hsl({hue}, 80%, 55%)"
        aria-hidden="true"
      ></div>
      <div class="color-details">
        <span class="color-name">{getColorName(hue)}</span>
        <span class="color-value">hsl({hue}, 80%, 55%)</span>
      </div>
    </div>
  </div>
{/snippet}

{#if TunableComponent}
  <TunableComponent {params} filePath="./src/components/ColorPicker.params.ts">
    {#snippet children(overrides)}
      {@render wheel(overrides)}
    {/snippet}
  </TunableComponent>
{:else}
  {@render wheel()}
{/if}

<style>
  .color-picker {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid transparent;
    transition: border-color 300ms ease, box-shadow 300ms ease;
  }

  .color-picker.highlighted {
    border-color: var(--highlight-ring, #6366f1);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--highlight-ring, #6366f1) 15%, transparent);
  }

  svg {
    cursor: crosshair;
    touch-action: none;
  }

  svg:focus:not(:focus-visible) {
    outline: none;
  }

  svg:focus-visible {
    outline: 2px solid var(--accent-color, #6366f1);
    outline-offset: 4px;
    border-radius: 50%;
  }

  .color-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-family: var(--font-ui);
  }

  .color-swatch {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  }

  .color-details {
    display: flex;
    flex-direction: column;
  }

  .color-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--text-color, #1a1a1a);
  }

  .color-value {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-muted, #6b7280);
  }

  @media (prefers-reduced-motion: reduce) {
    .color-picker {
      transition-duration: 0.01ms !important;
    }
  }
</style>
