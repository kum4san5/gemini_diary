export const STORAGE_KEY = "lifeDashboardState";
const APP_TIME_ZONE = "Asia/Tokyo";

export function todayKey(date = new Date()) {
    return toDateKey(date, APP_TIME_ZONE);
}

export function normalizeDateKey(value) {
    if (!value) return "";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toDateKey(parsed, APP_TIME_ZONE);
    return String(value).split("T")[0] || "";
}

export function loadJsonState(key, createFallback, normalize, warning = "Failed to load state") {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return createFallback();
        return normalize({ ...createFallback(), ...JSON.parse(stored) });
    } catch (error) {
        console.warn(warning, error);
        return createFallback();
    }
}

export function saveJsonState(key, state) {
    localStorage.setItem(key, JSON.stringify(state));
}

function toDateKey(value, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(value);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
}
