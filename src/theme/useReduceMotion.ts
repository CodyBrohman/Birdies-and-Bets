import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let cached: boolean | null = null;

/** True when the system Reduce Motion setting is on. Cached after the first read; updates on change. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(cached ?? false);
  useEffect(() => {
    let alive = true;
    const initial = cached ?? false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        cached = v;
        // Only re-render when the setting differs from what the first render assumed.
        if (alive && v !== initial) setReduce(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      cached = v;
      setReduce(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
