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

const loadedPhotos = new Set<string>();

/**
 * Checks photos in the background, a few at a time, and marks the ones that fail. Expired links
 * tend to come in runs, so checking stops after `stopAfter` photos in a row load: that bounds the
 * download when only an occasional photo is broken. Returns a function that cancels the check.
 */
export function probePhotos(photos: string[], { concurrency = 4, stopAfter = 4 } = {}) {
  const queue = photos.filter((photo) => !failedPhotos.has(photo) && !loadedPhotos.has(photo));
  const active = new Set<HTMLImageElement>();
  let cancelled = false;
  let loadedInARow = 0;
  function next() {
    if (cancelled || loadedInARow >= stopAfter) return;
    const photo = queue.shift();
    if (photo === undefined) return;
    const image = new Image();
    active.add(image);
    const settle = (loaded: boolean) => {
      active.delete(image);
      if (cancelled) return;
      if (loaded) {
        loadedPhotos.add(photo);
        loadedInARow += 1;
      } else {
        markPhotoFailed(photo);
        loadedInARow = 0;
      }
      next();
    };
    image.onload = () => settle(true);
    image.onerror = () => settle(false);
    image.src = photo;
  }
  for (let slot = 0; slot < concurrency; slot += 1) next();
  return () => {
    cancelled = true;
    for (const image of active) image.src = '';
    active.clear();
  };
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
