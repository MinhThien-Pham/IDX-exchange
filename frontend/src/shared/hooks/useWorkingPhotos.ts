import { useMemo, useSyncExternalStore } from 'react';

// Listing photos are served by the data source and can expire. Failures are remembered for the
// session, so a photo that failed on a card is never retried in the gallery.
const failedPhotos = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markPhotoFailed(url: string) {
  if (failedPhotos.has(url)) return;
  failedPhotos.add(url);
  version += 1;
  for (const listener of listeners) listener();
}

/** Photos that have not failed to load, optionally from only the first `limit` entries. */
export function useWorkingPhotos(photos: string[], limit = photos.length): string[] {
  const failures = useSyncExternalStore(subscribe, () => version);
  return useMemo(
    () => photos.slice(0, limit).filter((photo) => !failedPhotos.has(photo)),
    // `failures` changes whenever a photo is marked as failed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, limit, failures],
  );
}
