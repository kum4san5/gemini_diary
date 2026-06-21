export async function apiGet(webAppUrl, action) {
    const response = await fetch(`${webAppUrl}?action=${encodeURIComponent(action)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data && data.status === "error") throw new Error(data.message);
    return data;
}

export async function apiPost(webAppUrl, payload) {
    const response = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data && data.status === "error") throw new Error(data.message);
    return data;
}

export function schemaWarningMessage(data, limit = 6) {
    const warnings = data?.schemaWarnings;
    if (!Array.isArray(warnings) || !warnings.length) return "";

    const missing = warnings.flatMap((warning) => warning.missingProperties || []);
    const uniqueMissing = Array.from(new Set(missing)).slice(0, limit);
    const suffix = missing.length > uniqueMissing.length ? ` ほか${missing.length - uniqueMissing.length}件` : "";
    return `Notion DBに存在しないプロパティがあり、保存対象から外しました: ${uniqueMissing.join(", ")}${suffix}`;
}
