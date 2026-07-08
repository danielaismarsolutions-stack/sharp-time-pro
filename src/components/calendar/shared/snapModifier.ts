// Custom @dnd-kit modifier that snaps drag movement to grid intervals
// Y axis: time slots (5-minute steps), X axis: day columns
import type { Modifier } from '@dnd-kit/core';

/**
 * Creates a modifier that snaps:
 * - Y axis to multiples of stepHeight (one drag interval, e.g. hourHeight/12 = 5 minutes)
 * - X axis to multiples of columnWidth (day columns), if provided
 */
export function createSnapToTimeStepModifier(
  stepHeight: number,
  columnWidth?: number
): Modifier {
  return ({ transform }) => {
    const snappedY = Math.round(transform.y / stepHeight) * stepHeight;
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
