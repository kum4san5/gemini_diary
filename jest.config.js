module.exports = {
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/docs/js/$1",
  },
  testMatch: ["<rootDir>/test/unit/**/*.test.js"],
};
