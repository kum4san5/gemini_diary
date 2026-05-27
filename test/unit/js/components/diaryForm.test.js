import { setupDiaryForm } from "@/components/diaryForm.js";

function renderForm() {
  document.body.innerHTML = `
    <input id="date" type="date" />
    <textarea id="diary"></textarea>
    <button id="submit-btn">AI先生に添削してもらう</button>
    <div id="loading-overlay"></div>
    <div id="result-area" class="result-area hidden"></div>
    <p id="original-display"></p>
    <p id="corrected-display"></p>
    <div id="feedback-display"></div>
    <button id="reset-btn"></button>
  `;
}

describe("setupDiaryForm", () => {
  beforeEach(() => {
    renderForm();
    global.alert = jest.fn();
    global.fetch = jest.fn();
    Element.prototype.scrollIntoView = jest.fn();
    window.scrollTo = jest.fn();
  });

  test("alerts when diary content is empty", async () => {
    setupDiaryForm();

    document.getElementById("submit-btn").click();

    expect(alert).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("submits diary content and displays Gemini feedback", async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        status: "success",
        corrected_text: "I went to the park.",
        feedback: "Use the past tense here.",
      }),
    });
    setupDiaryForm();

    document.getElementById("date").value = "2026-05-21";
    document.getElementById("diary").value = "I go to the park.";
    document.getElementById("submit-btn").click();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("script.google.com/macros"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          date: "2026-05-21",
          content: "I go to the park.",
        }),
      })
    );
    expect(document.getElementById("result-area").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("corrected-display").textContent).toBe("I went to the park.");
    expect(document.getElementById("feedback-display").textContent).toBe("Use the past tense here.");
  });
});
