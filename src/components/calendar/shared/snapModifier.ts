// Custom @dnd-kit modifier that snaps drag movement to grid intervals
// Y axis: 15-minute slots, X axis: day columns
import type { Modifier } from '@dnd-kit/core';

/**
 * Creates a modifier that snaps:
 * - Y axis to multiples of quarterHeight (15-minute intervals)
 * - X axis to multiples of columnWidth (day columns), if provided
 */
export function createSnapTo15MinModifier(
  quarterHeight: number,
  columnWidth?: number
): Modifier {
  return ({ transform }) => {
    const snappedY = Math.round(transform.y / quarterHeight) * quarterHeight;
    const snappedX = columnWidth && columnWidth > 0
      ? Math.round(transform.x / columnWidth) * columnWidth
      : transform.x;

    return {
      ...transform,
      x: snappedX,
      y: snappedY,
    };
  };
}
