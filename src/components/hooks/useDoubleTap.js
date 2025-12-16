import { useRef, useCallback } from 'react';

/**
 * Custom hook to detect double tap/click events
 * @param {Function} onDoubleTap - Callback to execute on double tap
 * @param {Function} onSingleTap - Callback to execute on single tap (after delay)
 * @param {Object} options - Options for the hook
 * @param {number} options.delay - Max time between taps in ms (default: 300)
 */
const useDoubleTap = (onDoubleTap, onSingleTap, { delay = 300 } = {}) => {
  const lastTapTime = useRef(0);
  const singleTapTimeout = useRef(null);

  const handleTap = useCallback(
    (event) => {
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTime.current;

      // Clear any pending single tap
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
        singleTapTimeout.current = null;
      }

      if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
        // Double tap detected
        lastTapTime.current = 0; // Reset
        if (onDoubleTap) {
          onDoubleTap(event);
        }
      } else {
        // First tap - wait to see if it's a double tap
        lastTapTime.current = currentTime;
        singleTapTimeout.current = setTimeout(() => {
          // No second tap came - trigger single tap
          if (onSingleTap) {
            onSingleTap(event);
          }
          lastTapTime.current = 0;
          singleTapTimeout.current = null;
        }, delay);
      }
    },
    [onDoubleTap, onSingleTap, delay]
  );

  return {
    onClick: handleTap,
  };
};

export default useDoubleTap;
