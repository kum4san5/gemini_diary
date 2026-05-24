/// <reference types="cypress" />

describe("日記アプリケーションのE2Eテスト", () => {
  beforeEach(() => {
    // アプリケーションのURLを訪問
    cy.visit("http://localhost:8080/front/docs/index.html"); // 適切なURLに変更してください
  });

  it("アプリケーションが正しくロードされること", () => {
    cy.get("h1").should("contain", "日記アプリケーション");
    cy.get("#diary-form").should("be.visible");
    cy.get("#diary-list").should("be.visible");
  });

  it("新しい日記を追加できること", () => {
    const date = "2023-05-23";
    const title = "Cypressテスト日記";
    const content = "これはCypressによるE2Eテストです。";

    cy.get("#diary-date").type(date);
    cy.get("#diary-title").type(title);
    cy.get("#diary-content").type(content);
    cy.get("#save-button").click();

    // フォームがクリアされたことを確認
    cy.get("#diary-date").should("have.value", "");
    cy.get("#diary-title").should("have.value", "");
    cy.get("#diary-content").should("have.value", "");

    // リストに新しい日記が追加されたことを確認
    cy.get("#diary-list li")
      .should("have.length.at.least", 1)
      .last()
      .should("contain", `${date}: ${title}`);
  });

  // 他のテストケースも追加可能
});
