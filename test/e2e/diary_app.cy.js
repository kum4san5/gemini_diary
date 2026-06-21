/// <reference types="cypress" />

const diaryResponse = [
  {
    date: "2026-05-21",
    text: "Today, I studied English.",
    correction: "Today, I studied English.",
  },
];

describe("Life Dashboard", () => {
  beforeEach(() => {
    [
      "getTasks",
      "getLearningLogs",
      "getKnowledgeNotes",
      "getShortcuts",
      "getDailyReviews",
      "getProjects",
      "getGoals",
      "getHabits",
      "getWeeklyReviews",
      "getTags",
      "getCategories",
      "getAiInsights",
      "getResources",
      "getDashboardSettings",
    ].forEach((action) => {
      cy.intercept("GET", `https://script.google.com/**?action=${action}`, []).as(action);
    });

    cy.intercept("GET", "https://script.google.com/**?action=getDiaries", diaryResponse).as(
      "getDiaries"
    );
    cy.intercept("POST", "https://script.google.com/**", {
      status: "success",
      corrected_text: "I went to the park.",
      feedback: "Use the past tense here.",
    }).as("submitDiary");

    cy.visit("/docs/index.html", {
      onBeforeLoad(win) {
        win.flatpickr = (_selector, options) => {
          win.__flatpickrOptions = options;
          return {};
        };
      },
    });
  });

  it("loads the current GitHub Pages frontend", () => {
    cy.contains("h1", "Life Dashboard").should("be.visible");
    cy.get("#start-console").should("be.visible");
    cy.get("#reminder-panel").should("be.visible");
    cy.get("#category-summary").should("be.visible");
    cy.get("#life-balance-summary").should("be.visible");
    cy.get("#todo-board").should("be.visible");
    cy.get("[data-view-tab='logs']").click();
    cy.get("#learning-log-form").should("be.visible");
    cy.get("#date").should("be.visible");
    cy.get("#diary").should("be.visible");
    cy.get("#submit-btn").should("be.visible");
  });

  it("adds a learning log and updates progress", () => {
    cy.get("[data-view-tab='logs']").click();
    cy.get("#log-minutes").type("30");
    cy.get("#log-memo").type("過去問道場でネットワークを30問");
    cy.get("#learning-log-form button").click();

    cy.get("#today-minutes").should("contain", "30分");
    cy.get("#learning-log-list").should("contain", "ネットワーク");
  });

  it("starts a focus session and records it from Today", () => {
    cy.get("#start-console").within(() => {
      cy.contains("button", "5分だけ始める").click();
      cy.contains("button", "記録する").click();
    });

    cy.get("#today-minutes").should("contain", "1分");
    cy.get("#learning-log-list").should("contain", "集中セッション");
  });

  it("keeps Today and Logs usable across common viewport widths", () => {
    [
      [1366, 768],
      [834, 1112],
      [390, 844],
    ].forEach(([width, height]) => {
      cy.viewport(width, height);
      cy.get("[data-view-tab='today']").click();
      cy.get("#start-console").should("be.visible");
      cy.get("#reminder-panel").should("be.visible");
      cy.get("#category-summary").should("be.visible");
      cy.get("#life-balance-summary").should("be.visible");
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.lte(doc.documentElement.clientWidth + 2);
      });

      cy.get("[data-view-tab='logs']").click();
      cy.get("#learning-log-form").should("be.visible");
      cy.get("#flatpickr-calendar").should("be.visible");
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.lte(doc.documentElement.clientWidth + 2);
      });
    });
  });

  it("shows only actionable missing Notion schema items", () => {
    cy.intercept("GET", "https://script.google.com/**?action=getSchemaCheck", {
      status: "success",
      ok: false,
      results: [
        { key: "TASKS_DATABASE_ID", name: "Life Tasks", ok: false, missingDatabaseId: false, missingProperties: ["Start Date", "Resources"] },
        { key: "GOALS_DATABASE_ID", name: "Goals", ok: true, missingDatabaseId: false, missingProperties: [] },
      ],
    }).as("getSchemaCheck");

    cy.get("[data-view-tab='settings']").click();
    cy.get("#schema-check-btn").click();
    cy.wait("@getSchemaCheck");
    cy.get("#schema-check-result").should("contain", "Life Tasks");
    cy.get("#schema-check-result").should("contain", "Start Date");
    cy.get("#schema-check-result").should("contain", "Resources");
  });

  it("submits a diary and shows the correction result", () => {
    cy.get("[data-view-tab='logs']").click();
    cy.get("#date").clear().type("2026-05-21");
    cy.get("#diary").type("I go to the park.");
    cy.get("#submit-btn").click();

    cy.wait("@submitDiary");
    cy.get("#result-area").should("not.have.class", "hidden");
    cy.get("#original-display").should("contain", "I go to the park.");
    cy.get("#corrected-display").should("contain", "I went to the park.");
    cy.get("#feedback-display").should("contain", "Use the past tense here.");
  });
});
