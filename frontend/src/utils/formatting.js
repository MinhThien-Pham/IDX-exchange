export function formatPrice(price) {
    const value = Number(price);

    if (Number.isNaN(value)) {
        return 'Price unavailable';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatOpenHouseDate(value) {
    if (!value) {
        return 'Date unavailable';
    }

    const datePart =
        typeof value === 'string'
            ? value.slice(0, 10)
            : value;

    const date = new Date(`${datePart}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function formatTime(value) {
    if (!value) {
        return 'Time unavailable';
    }

    const parts = String(value).split(':');

    if (parts.length < 2) {
        return String(value);
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {
        return String(value);
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}
