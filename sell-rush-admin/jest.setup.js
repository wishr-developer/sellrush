// Jest のセットアップファイル
import "@testing-library/jest-dom";

// ResizeObserver のモック（recharts が使用）
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

