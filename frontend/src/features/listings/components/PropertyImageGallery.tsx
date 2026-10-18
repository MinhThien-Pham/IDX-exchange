import { useEffect, useRef, useState, type MouseEvent } from 'react';
import './PropertyImageGallery.css';

function PropertyImageGallery({ photos, address }: { photos: string[]; address: string }) {
  const photoList = photos;

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightboxOpen) {
      return undefined;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab' && dialog) {
        const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      }

      if (event.key === 'ArrowLeft') {
        setLightboxIndex((index) => (index === 0 ? photoList.length - 1 : index - 1));
      }

      if (event.key === 'ArrowRight') {
        setLightboxIndex((index) => (index === photoList.length - 1 ? 0 : index + 1));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [lightboxOpen, photoList.length]);

  if (photoList.length === 0) {
    return <div className="gallery-placeholder">No Photos Available</div>;
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function showPrevious(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    setLightboxIndex((index) => (index === 0 ? photoList.length - 1 : index - 1));
  }

  function showNext(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    setLightboxIndex((index) => (index === photoList.length - 1 ? 0 : index + 1));
  }

  return (
    <>
      <div
        className="gallery-main"
        onClick={() => openLightbox(activeIndex)}
        role="button"
        tabIndex={0}
        aria-label="Open property photo viewer"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLightbox(activeIndex);
          }
        }}
      >
        <img
          src={photoList[activeIndex]}
          alt={`${address || 'Property'} main`}
          className="gallery-main-image"
        />

        <span className="gallery-count">
          {activeIndex + 1} / {photoList.length}
        </span>
      </div>

      {photoList.length > 1 && (
        <div className="gallery-thumbnails">
          {photoList.map((photo, index) => (
            <button
              type="button"
              className={`gallery-thumbnail-button ${index === activeIndex ? 'active' : ''}`}
              key={`${photo}-${index}`}
              onClick={() => setActiveIndex(index)}
            >
              <img
                src={photo}
                alt={`${address || 'Property'} thumbnail ${index + 1}`}
                className="gallery-thumbnail"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          ref={dialogRef}
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Property photo viewer"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxOpen(false);
            }}
            aria-label="Close photo viewer"
          >
            ×
          </button>

          {photoList.length > 1 && (
            <button
              type="button"
              className="lightbox-button lightbox-previous"
              onClick={showPrevious}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            src={photoList[lightboxIndex]}
            alt={`${address || 'Property'} ${lightboxIndex + 1}`}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />

          {photoList.length > 1 && (
            <button
              type="button"
              className="lightbox-button lightbox-next"
              onClick={showNext}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <span className="lightbox-counter">
            {lightboxIndex + 1} / {photoList.length}
          </span>
        </div>
      )}
    </>
  );
}

export default PropertyImageGallery;
