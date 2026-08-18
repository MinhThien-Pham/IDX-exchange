import { useState } from 'react';
import './PropertyImageCarousel.css';

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
        // Defensive fallback in case a row contains a direct URL
        // instead of a valid JSON array.
        if (
            typeof photoValue === 'string' &&
            /^https?:\/\//i.test(photoValue.trim())
        ) {
            return [photoValue.trim()];
        }

        return [];
    }
}

function PropertyImageCarousel({ photos, address }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const photoList = parsePhotos(photos);

    if (photoList.length === 0) {
        return (
            <div className="carousel-placeholder">
                No Photo Available
            </div>
        );
    }

    function showPrevious(event) {
        event.stopPropagation();

        setCurrentIndex((index) =>
            index === 0 ? photoList.length - 1 : index - 1
        );
    }

    function showNext(event) {
        event.stopPropagation();

        setCurrentIndex((index) =>
            index === photoList.length - 1 ? 0 : index + 1
        );
    }

    return (
        <div className="property-carousel">
            <img
                src={photoList[currentIndex]}
                alt={`${address || 'Property'} ${currentIndex + 1}`}
                className="property-carousel-image"
            />

            {photoList.length > 1 && (
                <>
                    <button
                        type="button"
                        className="carousel-button carousel-previous"
                        onClick={showPrevious}
                        aria-label="Previous photo"
                    >
                        ‹
                    </button>

                    <button
                        type="button"
                        className="carousel-button carousel-next"
                        onClick={showNext}
                        aria-label="Next photo"
                    >
                        ›
                    </button>

                    <span className="carousel-counter">
                        {currentIndex + 1} / {photoList.length}
                    </span>
                </>
            )}
        </div>
    );
}

export default PropertyImageCarousel;