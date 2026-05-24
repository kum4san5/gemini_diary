import { updateDiaryList } from "@/main.js";

describe("updateDiaryList", () => {
  // モックDOMの設定
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="diary-list"></ul>
    `;
  });

  test("日記リストが正しく更新されること", () => {
    const mockDiaries = [
      { id: "1", date: "2023-01-01", title: "テスト1", content: "テスト内容1" },
      { id: "2", date: "2023-01-02", title: "テスト2", content: "テスト内容2" },
    ];
    updateDiaryList(mockDiaries);

    const diaryList = document.getElementById("diary-list");
    expect(diaryList.children.length).toBe(2);
    expect(diaryList.children[0].textContent).toContain("2023-01-01: テスト1");
    expect(diaryList.children[1].textContent).toContain("2023-01-02: テスト2");
  });

  test("日記が0件の場合、リストが空になること", () => {
    updateDiaryList([]);
    const diaryList = document.getElementById("diary-list");
    expect(diaryList.children.length).toBe(0);
  });
});
