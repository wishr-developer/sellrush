const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Next.js アプリのパスを提供して、next.config.js と .env ファイルをロードできるようにする
  dir: "./",
});

// Jest に追加するカスタム設定を追加
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
};

// createJestConfig は、非同期で next/jest をロードするため、このようにエクスポートします
module.exports = createJestConfig(customJestConfig);

