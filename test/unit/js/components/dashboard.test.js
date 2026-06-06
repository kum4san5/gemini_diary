import { dashboardTestHooks } from "../../../../docs/js/components/dashboard.js";

describe("dashboard classification helpers", () => {
  test("infers learning task metadata for AP text", () => {
    const text = "応用情報 過去問 ネットワーク サブネットを復習";

    expect(dashboardTestHooks.inferArea(text)).toBe("学習");
    expect(dashboardTestHooks.inferCategory(text, "学習")).toBe("苦手復習");
    expect(dashboardTestHooks.inferGenre(text, "学習")).toBe("ネットワーク");
  });

  test("infers development metadata", () => {
    const text = "GAS API のテストを追加";

    expect(dashboardTestHooks.inferArea(text)).toBe("開発");
    expect(dashboardTestHooks.inferCategory(text, "開発")).toBe("テスト");
    expect(dashboardTestHooks.inferGenre(text, "開発")).toBe("バックエンド");
  });

  test("normalizes knowledge areas for Notion options", () => {
    expect(dashboardTestHooks.normalizeKnowledgeArea("学習")).toBe("応用情報");
    expect(dashboardTestHooks.normalizeKnowledgeArea("プログラミング")).toBe("開発");
  });

  test("validates optional URLs", () => {
    expect(dashboardTestHooks.isValidUrl("")).toBe(true);
    expect(dashboardTestHooks.isValidUrl("https://example.com/article")).toBe(true);
    expect(dashboardTestHooks.isValidUrl("not a url")).toBe(false);
  });
});
