import { ImageOff } from 'lucide-react';
import { useState } from 'react';

export default function PropertyImage({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src)
    return (
      <div className="photo-placeholder" role="img" aria-label="Photo unavailable">
        <ImageOff aria-hidden="true" />
        <span>Photo unavailable</span>
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}
