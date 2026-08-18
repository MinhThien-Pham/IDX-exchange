import { useEffect, useState } from 'react';
import './PropertyImageGallery.css';

function parsePhotos(photoValue) {
    if (!photoValue) {
        return [];
    }

    try {
        const photos =
            typeof photoValue === 'string'
                ? JSON.parse(photoValue)
                : photoValue;

        return Array.isArray(photos)
            ? photos.filter((photo) => typeof photo === 'string' && photo.trim())
            : [];
    } catch {
        if (
            typeof photoValue === 'string' &&
            /^https?:\/\//i.test(photoValue.trim())
        ) {
            return [photoValue.trim()];
        }

        return [];
    }
}

function PropertyImageGallery({ photos, address }) {
    const photoList = parsePhotos(photos);

    const [activeIndex, setActiveIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        if (!lightboxOpen) {
            return undefined;
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setLightboxOpen(false);
            }

            if (event.key === 'ArrowLeft') {
                setLightboxIndex((index) =>
                    index === 0 ? photoList.length - 1 : index - 1
                );
            }

            if (event.key === 'ArrowRight') {
                setLightboxIndex((index) =>
                    index === photoList.length - 1 ? 0 : index + 1
                );
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [lightboxOpen, photoList.length]);

    if (photoList.length === 0) {
        return (
            <div className="gallery-placeholder">
                No Photos Available
            </div>
        );
    }

    function openLightbox(index) {
        setLightboxIndex(index);
        setLightboxOpen(true);
    }

    function showPrevious(event) {
        event.stopPropagation();

        setLightboxIndex((index) =>
            index === 0 ? photoList.length - 1 : index - 1
        );
    }

    function showNext(event) {
        event.stopPropagation();

        setLightboxIndex((index) =>
            index === photoList.length - 1 ? 0 : index + 1
        );
    }

    return (
        <>
            <div
                className="gallery-main"
                onClick={() => openLightbox(activeIndex)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
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
                            className={`gallery-thumbnail-button ${index === activeIndex ? 'active' : ''
                                }`}
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