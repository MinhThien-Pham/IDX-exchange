import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const positions = new Map<string, number>();

export function usePageScroll(ready: boolean) {
  const location = useLocation();
  const navigation = useNavigationType();

  useLayoutEffect(() => {
    if (!ready) return;
    const requested: unknown = location.state?.scrollY;
    const top =
      navigation === 'POP'
        ? (positions.get(location.key) ?? 0)
        : typeof requested === 'number' && Number.isFinite(requested)
          ? Math.max(0, requested)
          : 0;
    window.scrollTo({ top, behavior: 'instant' });
    return () => {
      positions.set(location.key, window.scrollY);
      if (positions.size > 100) positions.delete(positions.keys().next().value as string);
    };
  }, [location.key, location.state, navigation, ready]);
}
