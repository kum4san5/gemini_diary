import { displayDiariesForDate, fetchDiaries, setupCalendar } from "@/app.js";

const diaries = [
  {
    date: "2026-05-21",
    text: "Today, I studied English for an hour.",
    correction: "Today, I studied English for an hour.",
  },
  {
    date: "2026-05-22",
    text: "I went to the library.",
    correction: "I went to the library.",
  },
];

describe("app module", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="loading-overlay"></div>
      <input id="flatpickr-calendar" />
      <div id="diary-detail-container"></div>
    `;
    global.alert = jest.fn();
    global.fetch = jest.fn();
    global.flatpickr = jest.fn();
  });

  test("fetchDiaries loads diaries and toggles the loading overlay", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => diaries,
    });

    await expect(fetchDiaries()).resolves.toEqual(diaries);

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("?action=getDiaries"));
    expect(document.getElementById("loading-overlay").classList.contains("visible")).toBe(false);
  });

  test("displayDiariesForDate renders diaries for the selected date", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => diaries,
    });
    await fetchDiaries();

    displayDiariesForDate("2026-05-21");

    expect(document.querySelectorAll(".diary-card")).toHaveLength(1);
    expect(document.getElementById("diary-detail-container").textContent).toContain(
      "Today, I studied English"
    );
  });

  test("setupCalendar marks dates with diaries and wires date selection", () => {
    setupCalendar(diaries);

    expect(flatpickr).toHaveBeenCalledWith(
      "#flatpickr-calendar",
      expect.objectContaining({
        dateFormat: "Y-m-d",
        inline: true,
        onChange: expect.any(Function),
        onDayCreate: expect.any(Function),
      })
    );
  });
});
