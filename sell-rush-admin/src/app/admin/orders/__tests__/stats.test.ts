import { buildCreatorStatsMap, buildProductStatsMap } from "../stats";
import { Order, OrderStatus } from "../types";

describe("buildCreatorStatsMap", () => {
  it("集計が正しく行われる", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p2",
      },
      {
        id: "o3",
        created_at: "2024-01-03T00:00:00Z",
        amount: 3000,
        status: "pending",
        creator_id: "c2",
        product_id: "p1",
      },
    ];

    const map = buildCreatorStatsMap(orders);

    expect(map.size).toBe(2);

    const c1 = map.get("c1");
    expect(c1).toBeDefined();
    if (c1) {
      expect(c1.creatorId).toBe("c1");
      // GMV は completed のみ（1000）
      expect(c1.gmv).toBe(1000);
      expect(c1.orders).toBe(2);
      expect(c1.completedOrders).toBe(1);
      expect(c1.cancelledOrders).toBe(1);
      expect(c1.pendingOrders).toBe(0);
      expect(c1.lastOrderAt).toBe("2024-01-02T00:00:00.000Z");
    }

    const c2 = map.get("c2");
    expect(c2).toBeDefined();
    if (c2) {
      expect(c2.creatorId).toBe("c2");
      // GMV は completed のみ（pending は含まないので 0）
      expect(c2.gmv).toBe(0);
      expect(c2.orders).toBe(1);
      expect(c2.completedOrders).toBe(0);
      expect(c2.cancelledOrders).toBe(0);
      expect(c2.pendingOrders).toBe(1);
    }
  });

  it("注文が0件の場合は空の Map", () => {
    const map = buildCreatorStatsMap([]);
    expect(map.size).toBe(0);
  });

  it("creator_id が null の注文は集計されない", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: null,
        product_id: "p1",
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p2",
      },
    ];

    const map = buildCreatorStatsMap(orders);
    expect(map.size).toBe(1);
    expect(map.has("c1")).toBe(true);
  });

  it("GMV は completed ステータスのみ集計される", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o3",
        created_at: "2024-01-03T00:00:00Z",
        amount: 3000,
        status: "pending",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildCreatorStatsMap(orders);
    const c1 = map.get("c1");

    // GMV は completed の1000のみ
    expect(c1?.gmv).toBe(1000);

    // 注文数は全注文（3件）
    expect(c1?.orders).toBe(3);
    expect(c1?.completedOrders).toBe(1);
    expect(c1?.cancelledOrders).toBe(1);
    expect(c1?.pendingOrders).toBe(1);
  });

  it("全注文が cancelled の場合、GMV は 0", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildCreatorStatsMap(orders);
    const c1 = map.get("c1");

    expect(c1?.gmv).toBe(0);
    expect(c1?.orders).toBe(2);
    expect(c1?.completedOrders).toBe(0);
    expect(c1?.cancelledOrders).toBe(2);
    expect(c1?.pendingOrders).toBe(0);
  });

  it("status が null の場合、ステータス別カウントは増えない", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: null,
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildCreatorStatsMap(orders);
    const c1 = map.get("c1");

    expect(c1?.orders).toBe(2);
    expect(c1?.completedOrders).toBe(1);
    expect(c1?.cancelledOrders).toBe(0);
    expect(c1?.pendingOrders).toBe(0);
    // GMV は completed のみ（2000）
    expect(c1?.gmv).toBe(2000);
  });

  it("amount が null の場合、0 として扱われ GMV に影響しない", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: null,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildCreatorStatsMap(orders);
    const c1 = map.get("c1");

    // GMV は amount が null の注文は 0 として扱われる
    expect(c1?.gmv).toBe(2000);
    expect(c1?.orders).toBe(2);
    expect(c1?.completedOrders).toBe(2);
  });

  it("同一 Creator で複数注文があるとき、lastOrderAt が最新日時になる", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T12:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o3",
        created_at: "2024-01-01T18:00:00Z",
        amount: 3000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildCreatorStatsMap(orders);
    const c1 = map.get("c1");

    // 最新日時は 2024-01-02T12:00:00Z
    expect(c1?.lastOrderAt).toBe("2024-01-02T12:00:00.000Z");
  });
});

describe("buildProductStatsMap", () => {
  it("集計が正しく行われる", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
      },
      {
        id: "o3",
        created_at: "2024-01-03T00:00:00Z",
        amount: 3000,
        status: "completed",
        creator_id: "c2",
        product_id: "p2",
      },
    ];

    const map = buildProductStatsMap(orders);

    expect(map.size).toBe(2);

    const p1 = map.get("p1");
    expect(p1).toBeDefined();
    if (p1) {
      expect(p1.productId).toBe("p1");
      // GMV は completed のみ（1000）
      expect(p1.gmv).toBe(1000);
      expect(p1.orders).toBe(2);
      expect(p1.completedOrders).toBe(1);
      expect(p1.cancelledOrders).toBe(1);
    }

    const p2 = map.get("p2");
    expect(p2).toBeDefined();
    if (p2) {
      expect(p2.productId).toBe("p2");
      // GMV は completed のみ（3000）
      expect(p2.gmv).toBe(3000);
      expect(p2.orders).toBe(1);
      expect(p2.completedOrders).toBe(1);
      expect(p2.cancelledOrders).toBe(0);
    }
  });

  it("注文が0件の場合は空の Map", () => {
    const map = buildProductStatsMap([]);
    expect(map.size).toBe(0);
  });

  it("product_id が null の注文は集計されない", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "c1",
        product_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
      },
    ];

    const map = buildProductStatsMap(orders);
    expect(map.size).toBe(1);
    expect(map.has("p1")).toBe(true);
  });

  it("GMV は completed ステータスのみ集計される", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o3",
        created_at: "2024-01-03T00:00:00Z",
        amount: 3000,
        status: "pending",
        creator_id: "c2",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildProductStatsMap(orders);
    const p1 = map.get("p1");

    // GMV は completed の1000のみ
    expect(p1?.gmv).toBe(1000);

    // 注文数は全注文（3件）
    expect(p1?.orders).toBe(3);
    expect(p1?.completedOrders).toBe(1);
    // cancelled は o2 のみ（o3 は pending）
    expect(p1?.cancelledOrders).toBe(1);
  });

  it("全注文が cancelled の場合、GMV は 0", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "cancelled",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildProductStatsMap(orders);
    const p1 = map.get("p1");

    expect(p1?.gmv).toBe(0);
    expect(p1?.orders).toBe(2);
    expect(p1?.completedOrders).toBe(0);
    expect(p1?.cancelledOrders).toBe(2);
  });

  it("status が null の場合、ステータス別カウントは増えない", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: null,
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildProductStatsMap(orders);
    const p1 = map.get("p1");

    expect(p1?.orders).toBe(2);
    expect(p1?.completedOrders).toBe(1);
    expect(p1?.cancelledOrders).toBe(0);
    // GMV は completed のみ（2000）
    expect(p1?.gmv).toBe(2000);
  });

  it("amount が null の場合、0 として扱われ GMV に影響しない", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: null,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildProductStatsMap(orders);
    const p1 = map.get("p1");

    // GMV は amount が null の注文は 0 として扱われる
    expect(p1?.gmv).toBe(2000);
    expect(p1?.orders).toBe(2);
    expect(p1?.completedOrders).toBe(2);
  });

  it("同一 Product で複数注文があるとき、lastOrderAt が最新日時になる", () => {
    const orders: Order[] = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T12:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "c1",
        product_id: "p1",
        brand_id: null,
      },
      {
        id: "o3",
        created_at: "2024-01-01T18:00:00Z",
        amount: 3000,
        status: "cancelled",
        creator_id: "c2",
        product_id: "p1",
        brand_id: null,
      },
    ];

    const map = buildProductStatsMap(orders);
    const p1 = map.get("p1");

    // 最新日時は 2024-01-02T12:00:00Z
    expect(p1?.lastOrderAt).toBe("2024-01-02T12:00:00.000Z");
  });
});

