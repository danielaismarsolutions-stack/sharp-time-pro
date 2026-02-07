// Custom @dnd-kit modifier that snaps drag movement to 15-minute grid intervals
// Makes the dragged card jump between positions instead of following the pointer smoothly
import type { Modifier } from '@dnd-kit/core';

/**
 * Creates a modifier that snaps the drag transform's Y axis to multiples of quarterHeight.
 * This produces a discrete, block-by-block movement aligned to 15-minute slots.
 */
export function createSnapTo15MinModifier(quarterHeight: number): Modifier {
  return ({ transform }) => {
    return {
      ...transform,
      y: Math.round(transform.y / quarterHeight) * quarterHeight,
    };
  };
}
