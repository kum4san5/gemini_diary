const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    specPattern: "test/e2e/**/*.cy.js",
    supportFile: "test/support/e2e.js",
    fixturesFolder: "test/fixtures",
    screenshotsFolder: "test/e2e/screenshots",
    videosFolder: "test/e2e/videos",
    setupNodeEvents() {},
  },
});
