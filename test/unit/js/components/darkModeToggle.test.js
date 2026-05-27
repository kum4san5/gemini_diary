import { setupDarkModeToggle } from "@/components/darkModeToggle.js";

describe("setupDarkModeToggle", () => {
  beforeEach(() => {
    document.body.innerHTML = `<button id="darkModeToggle"></button>`;
    document.body.className = "";
    localStorage.clear();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });

  test("uses the saved dark theme", () => {
    localStorage.setItem("theme", "dark");

    setupDarkModeToggle();

    expect(document.body.classList.contains("dark-mode")).toBe(true);
  });

  test("toggles dark mode and persists the selected theme", () => {
    setupDarkModeToggle();

    document.getElementById("darkModeToggle").click();

    expect(document.body.classList.contains("dark-mode")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
