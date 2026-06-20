const NOTION_VERSION = "2022-06-28";
var SCHEMA_WARNINGS = [];

function resetSchemaWarnings() {
  SCHEMA_WARNINGS = [];
}

function addSchemaWarning(databaseId, missingProperties) {
  if (!missingProperties || !missingProperties.length) return;
  SCHEMA_WARNINGS.push({
    databaseId: databaseId,
    missingProperties: missingProperties,
  });
}

function currentSchemaWarnings() {
  return SCHEMA_WARNINGS.slice();
}

function jsonOutput(payload) {
  const warnings = currentSchemaWarnings();
  if (warnings.length && payload && typeof payload === "object" && !Array.isArray(payload)) {
    payload.schemaWarnings = warnings;
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorPayload(error) {
  return {
    status: "error",
    message: error && error.message ? error.message : String(error),
  };
}

function scriptProp(name, fallbackName) {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(name) || (fallbackName ? props.getProperty(fallbackName) : "");
}

function requireScriptProp(name, fallbackName) {
  const value = scriptProp(name, fallbackName);
  if (!value) {
    throw new Error("Missing Script Property: " + name);
  }
  return value;
}

function notionRequest(path, method, payload) {
  const token = requireScriptProp("NOTION_API_KEY");
  const options = {
    method: method || "get",
    headers: {
      Authorization: "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    muteHttpExceptions: true,
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch("https://api.notion.com/v1" + path, options);
  const text = response.getContentText();
  const json = text ? JSON.parse(text) : {};
  const code = response.getResponseCode();

  if (code < 200 || code >= 300) {
    throw new Error("Notion API error " + code + ": " + (json.message || text));
  }

  return json;
}

function notionQueryDatabase(databaseId, body) {
  return notionRequest("/databases/" + databaseId + "/query", "post", body || {});
}

function notionCreatePage(databaseId, properties) {
  const safeProperties = filterDatabaseProperties(databaseId, properties);
  return notionRequest("/pages", "post", {
    parent: { database_id: databaseId },
    properties: safeProperties,
  });
}

function notionUpdatePage(pageId, properties) {
  return notionRequest("/pages/" + pageId, "patch", { properties: properties });
}

function notionArchivePage(pageId) {
  return notionRequest("/pages/" + pageId, "patch", { archived: true });
}

function getDatabaseProperties(databaseId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "db_props_" + databaseId;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const database = notionRequest("/databases/" + databaseId, "get");
  const names = Object.keys(database.properties || {});
  cache.put(cacheKey, JSON.stringify(names), 21600);
  return names;
}

function inspectDatabaseSchema(databaseId, expectedProperties) {
  const actual = getDatabaseProperties(databaseId);
  const missing = (expectedProperties || []).filter(function (name) {
    return actual.indexOf(name) === -1;
  });
  return {
    databaseId: databaseId,
    expectedCount: expectedProperties.length,
    actualCount: actual.length,
    missingProperties: missing,
    ok: missing.length === 0,
  };
}

function filterDatabaseProperties(databaseId, properties) {
  const names = getDatabaseProperties(databaseId);
  const safeProperties = {};
  const missingProperties = [];
  Object.keys(properties || {}).forEach(function (name) {
    if (names.indexOf(name) !== -1) {
      safeProperties[name] = properties[name];
    } else {
      missingProperties.push(name);
    }
  });
  addSchemaWarning(databaseId, missingProperties);
  return safeProperties;
}

function testNotionConnection() {
  const databaseId = requireScriptProp("TASKS_DATABASE_ID");
  const result = notionQueryDatabase(databaseId, { page_size: 1 });
  return {
    status: "success",
    database: "Life Tasks",
    resultCount: result.results ? result.results.length : 0,
  };
}

function titleProp(value) {
  return { title: [{ text: { content: String(value || "") } }] };
}

function richTextProp(value) {
  return { rich_text: [{ text: { content: String(value || "") } }] };
}

function selectProp(value) {
  return value ? { select: { name: String(value) } } : { select: null };
}

function statusProp(value) {
  return value ? { status: { name: String(value) } } : { status: null };
}

function multiSelectProp(values) {
  const list = Array.isArray(values)
    ? values
    : String(values || "")
        .split(",")
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
  return { multi_select: list.map(function (name) { return { name: name }; }) };
}

function numberProp(value) {
  const number = Number(value || 0);
  return { number: isNaN(number) ? 0 : number };
}

function checkboxProp(value) {
  return { checkbox: Boolean(value) };
}

function dateProp(value) {
  return value ? { date: { start: String(value) } } : { date: null };
}

function urlProp(value) {
  return { url: value ? String(value) : null };
}

function relationProp(pageIds) {
  const ids = Array.isArray(pageIds) ? pageIds : [pageIds].filter(Boolean);
  return { relation: ids.map(function (id) { return { id: id }; }) };
}

function getProp(props, name, fallbackName) {
  return props[name] || (fallbackName ? props[fallbackName] : null);
}

function readTitle(props, name) {
  const prop = getProp(props, name);
  return prop && prop.title && prop.title.length ? prop.title[0].plain_text : "";
}

function readRichText(props, name, fallbackName) {
  const prop = getProp(props, name, fallbackName);
  return prop && prop.rich_text && prop.rich_text.length ? prop.rich_text[0].plain_text : "";
}

function readSelect(props, name) {
  const prop = getProp(props, name);
  return prop && prop.select ? prop.select.name : "";
}

function readStatus(props, name) {
  const prop = getProp(props, name);
  return prop && prop.status ? prop.status.name : "";
}

function readMultiSelect(props, name) {
  const prop = getProp(props, name);
  return prop && prop.multi_select ? prop.multi_select.map(function (item) { return item.name; }) : [];
}

function readNumber(props, name, fallbackName) {
  const prop = getProp(props, name, fallbackName);
  return prop && typeof prop.number === "number" ? prop.number : 0;
}

function readCheckbox(props, name) {
  const prop = getProp(props, name);
  return prop ? Boolean(prop.checkbox) : false;
}

function readDate(props, name, fallbackName) {
  const prop = getProp(props, name, fallbackName);
  return prop && prop.date ? prop.date.start : "";
}

function readUrl(props, name) {
  const prop = getProp(props, name);
  return prop ? prop.url || "" : "";
}

function readRelationIds(props, name) {
  const prop = getProp(props, name);
  return prop && prop.relation ? prop.relation.map(function (item) { return item.id; }) : [];
}
