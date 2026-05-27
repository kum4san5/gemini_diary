/// <reference types="cypress" />

const diaryResponse = [
  {
    date: "2026-05-21",
    text: "Today, I studied English.",
    correction: "Today, I studied English.",
  },
];

describe("AI English Diary", () => {
  beforeEach(() => {
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
    cy.contains("h1", "AI English Diary").should("be.visible");
    cy.get("#date").should("be.visible");
    cy.get("#diary").should("be.visible");
    cy.get("#submit-btn").should("be.visible");
  });

  it("submits a diary and shows the correction result", () => {
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
