import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { compactLayoutQuery, useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import Modal from '../../../shared/ui/Modal';
import PropertyImage from '../../../shared/ui/PropertyImage';
import './PropertyImageGallery.css';

function PhotoRail({
  photos,
  address,
  index,
  onIndexChange,
  onOpen,
  fullscreen,
  showArrows,
}: {
  photos: string[];
  address: string;
  index: number;
  onIndexChange: (index: number) => void;
  onOpen?: () => void;
  fullscreen?: boolean;
  showArrows: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = track.current;
    if (node?.clientWidth && Math.round(node.scrollLeft / node.clientWidth) !== index)
      node.scrollTo({ left: index * node.clientWidth, behavior: 'instant' });
  }, [index]);
  return (
    <section
      className={`photo-rail ${fullscreen ? 'photo-rail-fullscreen' : ''}`}
      aria-label={fullscreen ? 'Full screen photos' : 'Property photos'}
    >
      <div
        className="photo-track"
        tabIndex={fullscreen ? 0 : undefined}
        role={fullscreen ? 'group' : undefined}
        aria-label={
          fullscreen ? 'Photos. Use the left and right arrow keys to change photo.' : undefined
        }
        ref={track}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (node.clientWidth)
            onIndexChange(
              Math.max(
                0,
                Math.min(photos.length - 1, Math.round(node.scrollLeft / node.clientWidth)),
              ),
            );
        }}
      >
        {photos.map((src, position) =>
          fullscreen ? (
            <div className="photo-slide" key={`${src}-${position}`}>
              <PropertyImage
                src={src}
                alt={`${address || 'Property'}, photo ${position + 1}`}
                eager={position === index}
              />
            </div>
          ) : (
            <button
              className="photo-slide"
              type="button"
              key={`${src}-${position}`}
              aria-label={`Enlarge property photo ${position + 1}`}
              onClick={() => {
                onIndexChange(position);
                onOpen?.();
              }}
            >
              <PropertyImage
                src={src}
                alt={`${address || 'Property'}, photo ${position + 1}`}
                eager={position === 0}
              />
            </button>
          ),
        )}
      </div>
      {showArrows && photos.length > 1 && (
        <>
          <button
            className="photo-arrow photo-previous"
            type="button"
            aria-label="Previous photo"
            onClick={() => onIndexChange(Math.max(0, index - 1))}
            disabled={index === 0}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            className="photo-arrow photo-next"
            type="button"
            aria-label="Next photo"
            onClick={() => onIndexChange(Math.min(photos.length - 1, index + 1))}
            disabled={index === photos.length - 1}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </>
      )}
      {!fullscreen && (
        <span className="photo-counter" aria-live="polite">
          {index + 1} / {photos.length}
        </span>
      )}
    </section>
  );
}

export default function PropertyImageGallery({
  photos,
  address,
  open,
  onOpen,
  onClose,
}: {
  photos: string[];
  address: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const compact = useMediaQuery(compactLayoutQuery);
  const [index, setIndex] = useState(0);
  function navigate(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      setIndex((current) =>
        Math.max(0, Math.min(photos.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))),
      );
    }
  }
  if (!photos.length)
    return (
      <div className="gallery-placeholder">
        <ImageOff aria-hidden="true" />
        <strong>Photos unavailable</strong>
        <p>No images were included for this listing.</p>
      </div>
    );
  return (
    <div onKeyDown={navigate}>
      <PhotoRail
        photos={photos}
        address={address}
        index={index}
        onIndexChange={setIndex}
        onOpen={onOpen}
        showArrows
      />
      {open && (
        <Modal
          className="photo-dialog"
          labelledBy="photos-title"
          onClose={onClose}
          initialFocus={compact ? '.photo-close-mobile' : '.photo-close-desktop'}
        >
          <div className="photo-dialog-layout" onKeyDown={navigate}>
            <header className="photo-dialog-header">
              <div>
                <h2 id="photos-title">Property photos</h2>
                <p>{address || 'Property'}</p>
              </div>
              {!compact && (
                <div className="photo-desktop-actions">
                  <span aria-live="polite">
                    {index + 1} / {photos.length}
                  </span>
                  <button
                    className="button photo-close-desktop"
                    type="button"
                    aria-label="Close photos"
                    onClick={onClose}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              )}
            </header>
            <div className="photo-dialog-body">
              <PhotoRail
                photos={photos}
                address={address}
                index={index}
                onIndexChange={setIndex}
                fullscreen
                showArrows={!compact}
              />
            </div>
            {compact && (
              <footer className="photo-dialog-footer">
                <button
                  className="button button-primary photo-close-mobile"
                  type="button"
                  onClick={onClose}
                >
                  <X aria-hidden="true" />
                  Close photos
                </button>
                <nav className="photo-navigation" aria-label="Photo navigation">
                  <button
                    className="button"
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setIndex((current) => Math.max(0, current - 1))}
                    disabled={index === 0}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span aria-live="polite">
                    {index + 1} / {photos.length}
                  </span>
                  <button
                    className="button"
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setIndex((current) => Math.min(photos.length - 1, current + 1))}
                    disabled={index === photos.length - 1}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </nav>
              </footer>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
