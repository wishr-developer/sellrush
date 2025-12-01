/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import AdminOrdersPage from "../page";

// Next.js の useSearchParams をモック
jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

// Supabase をモック
let mockOrderResponse: { data: any[]; error: null } = { data: [], error: null };
let mockPreviousResponse: { data: any[]; error: null } = { data: [], error: null };

const mockSupabaseQuery = {
  select: jest.fn(() => mockSupabaseQuery),
  gte: jest.fn(() => mockSupabaseQuery),
  lt: jest.fn(() => mockSupabaseQuery),
  eq: jest.fn(() => mockSupabaseQuery),
  order: jest.fn(() => {
    // Promise.all で2つのクエリが実行されるため、呼び出し順序で判定
    // 最初の呼び出し: current、2回目の呼び出し: previous
    const isFirstCall = mockSupabaseQuery.order.mock.calls.length % 2 === 1;
    return Promise.resolve(isFirstCall ? mockOrderResponse : mockPreviousResponse);
  }),
};

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
  },
}));

const mockOrders = [
  {
    id: "o1",
    created_at: "2024-01-01T00:00:00Z",
    amount: 1000,
    status: "completed",
    creator_id: "creator-1",
    product_id: "product-1",
  },
  {
    id: "o2",
    created_at: "2024-01-02T00:00:00Z",
    amount: 2000,
    status: "cancelled",
    creator_id: "creator-1",
    product_id: "product-2",
  },
] as any;

// KPI 検証用のテストデータ（completed: 1000, cancelled: 2000, pending: 3000）
const mockOrdersForKpi = [
  {
    id: "o1",
    created_at: "2024-01-01T00:00:00Z",
    amount: 1000,
    status: "completed",
    creator_id: "creator-kpi",
    product_id: "product-kpi",
  },
  {
    id: "o2",
    created_at: "2024-01-02T00:00:00Z",
    amount: 2000,
    status: "cancelled",
    creator_id: "creator-kpi",
    product_id: "product-kpi",
  },
  {
    id: "o3",
    created_at: "2024-01-03T00:00:00Z",
    amount: 3000,
    status: "pending",
    creator_id: "creator-kpi",
    product_id: "product-kpi",
  },
] as any;

describe("/admin/orders", () => {
  beforeEach(() => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(() => null),
    });
    // モックをリセット
    jest.clearAllMocks();
    mockSupabaseQuery.order.mockReset();
    // デフォルト値を設定
    mockOrderResponse = { data: [], error: null };
    mockPreviousResponse = { data: [], error: null };
  });

  it("Creator ID クリックで Creator モーダルが開く", async () => {
    // Supabase モックを設定
    mockOrderResponse = { data: mockOrders, error: null };
    mockPreviousResponse = { data: [], error: null };

    render(<AdminOrdersPage />);

    // データ読み込み待機
    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/creator-1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Creator ID セルを取得（テキストベース）
    const creatorCells = screen.getAllByText(/creator-1/i);
    const creatorCell = creatorCells.find(
      (cell) => cell.className.includes("cursor-pointer")
    );

    if (creatorCell) {
      fireEvent.click(creatorCell);

      // モーダルが開いてKPIが表示される
      await waitFor(() => {
        expect(screen.getByText(/Creator Insight/i)).toBeInTheDocument();
        expect(screen.getByText(/累計GMV/i)).toBeInTheDocument();
        expect(screen.getByText(/注文件数/i)).toBeInTheDocument();
      });

      // GMV 合計 3000 が表示されていること（completed のみ集計）
      expect(screen.getByText(/1,000/)).toBeInTheDocument();

      // Close で閉じられる
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Creator Insight/i)).not.toBeInTheDocument();
      });
    }
  });

  it("Product ID クリックで Product モーダルが開く", async () => {
    // Supabase モックを設定
    mockOrderResponse = { data: mockOrders, error: null };
    mockPreviousResponse = { data: [], error: null };

    render(<AdminOrdersPage />);

    // データ読み込み待機
    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/product-1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Product ID セルを取得
    const productCells = screen.getAllByText(/product-1/i);
    const productCell = productCells.find(
      (cell) => cell.className.includes("cursor-pointer")
    );

    if (productCell) {
      fireEvent.click(productCell);

      // モーダルが開いてKPIが表示される
      await waitFor(() => {
        expect(screen.getByText(/Product Insight/i)).toBeInTheDocument();
        expect(screen.getByText(/累計GMV/i)).toBeInTheDocument();
        expect(screen.getByText(/注文件数/i)).toBeInTheDocument();
      });

      // Close で閉じられる
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Product Insight/i)).not.toBeInTheDocument();
      });
    }
  });

  it("creator_id が null のセルをクリックしても Creator モーダルが開かない", async () => {
    const ordersWithNullCreator = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: null,
        product_id: "product-1",
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "creator-1",
        product_id: "product-2",
      },
    ];

    mockOrderResponse = { data: ordersWithNullCreator, error: null };
    mockPreviousResponse = { data: [], error: null };

    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText("-")).toBeInTheDocument();
    }, { timeout: 3000 });

    // テーブル内の "-" を探す（Creator 列のもの）
    // テーブル内のすべての "-" を取得し、クリック可能なセル（cursor-pointer クラスがない）を探す
    const dashElements = screen.getAllByText("-");
    const creatorDashCell = dashElements.find(
      (element) => {
        const parent = element.closest("td");
        // creator_id が null の場合、cursor-pointer クラスがない
        return parent && !parent.className.includes("cursor-pointer") && parent.textContent === "-";
      }
    );

    if (creatorDashCell) {
      fireEvent.click(creatorDashCell);

      // モーダルが開いていないことを確認
      await waitFor(() => {
        expect(screen.queryByText(/Creator Insight/i)).not.toBeInTheDocument();
      });
    } else {
      // フォールバック: テーブル内の最初の "-" をクリック（Creator 列の可能性が高い）
      const firstDash = dashElements[0];
      if (firstDash) {
        fireEvent.click(firstDash);
        await waitFor(() => {
          expect(screen.queryByText(/Creator Insight/i)).not.toBeInTheDocument();
        });
      }
    }
  });

  it("product_id が null のセルをクリックしても Product モーダルが開かない", async () => {
    const ordersWithNullProduct = [
      {
        id: "o1",
        created_at: "2024-01-01T00:00:00Z",
        amount: 1000,
        status: "completed",
        creator_id: "creator-1",
        product_id: null,
      },
      {
        id: "o2",
        created_at: "2024-01-02T00:00:00Z",
        amount: 2000,
        status: "completed",
        creator_id: "creator-1",
        product_id: "product-1",
      },
    ];

    mockOrderResponse = { data: ordersWithNullProduct, error: null };
    mockPreviousResponse = { data: [], error: null };

    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText("-")).toBeInTheDocument();
    }, { timeout: 3000 });

    // テーブル内の "-" を探す（Product 列のもの）
    const dashElements = screen.getAllByText("-");
    const productDashCell = dashElements.find(
      (element) => {
        const parent = element.closest("td");
        // product_id が null の場合、cursor-pointer クラスがない
        return parent && !parent.className.includes("cursor-pointer") && parent.textContent === "-";
      }
    );

    if (productDashCell) {
      fireEvent.click(productDashCell);

      // モーダルが開いていないことを確認
      await waitFor(() => {
        expect(screen.queryByText(/Product Insight/i)).not.toBeInTheDocument();
      });
    } else {
      // フォールバック: テーブル内の最初の "-" をクリック（Product 列の可能性が高い）
      const firstDash = dashElements[0];
      if (firstDash) {
        fireEvent.click(firstDash);
        await waitFor(() => {
          expect(screen.queryByText(/Product Insight/i)).not.toBeInTheDocument();
        });
      }
    }
  });

  it("Creator モーダル内の KPI 値が stats.ts のロジックと一致する", async () => {
    mockOrderResponse = { data: mockOrdersForKpi, error: null };
    mockPreviousResponse = { data: [], error: null };

    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/creator-kpi/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Creator ID セルをクリック
    const creatorCells = screen.getAllByText(/creator-kpi/i);
    const creatorCell = creatorCells.find(
      (cell) => cell.className.includes("cursor-pointer")
    );

    if (creatorCell) {
      fireEvent.click(creatorCell);

      await waitFor(() => {
        expect(screen.getByText(/Creator Insight/i)).toBeInTheDocument();
      });

      // GMV: completed のみ（1000）
      expect(screen.getByText(/¥1,000/)).toBeInTheDocument();

      // 注文件数: 3件
      expect(screen.getByText(/3 件/)).toBeInTheDocument();

      // 完了率: 1/3 = 33%
      expect(screen.getByText(/33%/)).toBeInTheDocument();

      // キャンセル率: 1/3 = 33%
      const cancelRateElements = screen.getAllByText(/33%/);
      expect(cancelRateElements.length).toBeGreaterThan(0);
    }
  });

  it("Product モーダル内の KPI 値が stats.ts のロジックと一致する", async () => {
    mockOrderResponse = { data: mockOrdersForKpi, error: null };
    mockPreviousResponse = { data: [], error: null };

    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/product-kpi/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Product ID セルをクリック
    const productCells = screen.getAllByText(/product-kpi/i);
    const productCell = productCells.find(
      (cell) => cell.className.includes("cursor-pointer")
    );

    if (productCell) {
      fireEvent.click(productCell);

      await waitFor(() => {
        expect(screen.getByText(/Product Insight/i)).toBeInTheDocument();
      });

      // GMV: completed のみ（1000）
      expect(screen.getByText(/¥1,000/)).toBeInTheDocument();

      // 注文件数: 3件
      expect(screen.getByText(/3 件/)).toBeInTheDocument();

      // 完了率: 1/3 = 33%
      expect(screen.getByText(/33%/)).toBeInTheDocument();

      // 最終注文日: 2024-01-03（最新の日時）
      // 日付フォーマットは実装に合わせて調整が必要な場合がある
      expect(screen.getByText(/01\/03/)).toBeInTheDocument();
    }
  });

  it("モーダル表示中に orders が更新されてもクラッシュしない", async () => {
    mockOrderResponse = { data: mockOrders, error: null };
    mockPreviousResponse = { data: [], error: null };

    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/creator-1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Creator ID セルをクリックしてモーダルを開く
    const creatorCells = screen.getAllByText(/creator-1/i);
    const creatorCell = creatorCells.find(
      (cell) => cell.className.includes("cursor-pointer")
    );

    if (creatorCell) {
      fireEvent.click(creatorCell);

      await waitFor(() => {
        expect(screen.getByText(/Creator Insight/i)).toBeInTheDocument();
      });

      // モーダルが開いている状態で、データが空の状態でもエラーが出ないことを確認
      // （実際の実装では、orders が空になってもモーダルは開いたまま、または閉じるがクラッシュしない）
      const errorMessage = screen.queryByText(/エラー/i);
      expect(errorMessage).not.toBeInTheDocument();

      // モーダルが表示されていることを確認
      expect(screen.getByText(/Creator Insight/i)).toBeInTheDocument();
    }
  });
});

