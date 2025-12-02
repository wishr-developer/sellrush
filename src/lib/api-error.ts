/**
 * API エラーハンドリングの統一ユーティリティ
 * 
 * 全てのAPI Routeで一貫したエラーレスポンスを返すためのヘルパー関数
 */

import { NextResponse } from "next/server";

/**
 * API エラーの種類
 */
export enum ApiErrorType {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

/**
 * API エラーレスポンスの型
 */
export interface ApiErrorResponse {
  error: string;
  type?: ApiErrorType;
  message?: string;
  details?: Record<string, unknown>;
  missing?: string[]; // 環境変数不足の場合
}

/**
 * HTTPステータスコードとエラータイプのマッピング
 */
const STATUS_CODE_MAP: Record<ApiErrorType, number> = {
  [ApiErrorType.UNAUTHORIZED]: 401,
  [ApiErrorType.FORBIDDEN]: 403,
  [ApiErrorType.NOT_FOUND]: 404,
  [ApiErrorType.BAD_REQUEST]: 400,
  [ApiErrorType.VALIDATION_ERROR]: 400,
  [ApiErrorType.RATE_LIMIT_EXCEEDED]: 429,
  [ApiErrorType.INTERNAL_SERVER_ERROR]: 500,
  [ApiErrorType.CONFIGURATION_ERROR]: 500,
};

/**
 * 統一されたエラーレスポンスを生成
 * 
 * @example
 * ```ts
 * return apiError("User not found", ApiErrorType.NOT_FOUND)
 * return apiError("Invalid input", ApiErrorType.VALIDATION_ERROR, { field: "email" })
 * ```
 */
export function apiError(
  error: string,
  type: ApiErrorType = ApiErrorType.INTERNAL_SERVER_ERROR,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const statusCode = STATUS_CODE_MAP[type];
  
  const response: ApiErrorResponse = {
    error,
    type,
    message: error,
    ...(details && { details }),
  };

  // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
  if (process.env.NODE_ENV === "development") {
    console.error(`[API Error] ${type}:`, error, details);
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 認証エラー（401）
 */
export function unauthorizedError(message: string = "Unauthorized"): NextResponse<ApiErrorResponse> {
  return apiError(message, ApiErrorType.UNAUTHORIZED);
}

/**
 * 権限エラー（403）
 */
export function forbiddenError(message: string = "Forbidden"): NextResponse<ApiErrorResponse> {
  return apiError(message, ApiErrorType.FORBIDDEN);
}

/**
 * リソースが見つからない（404）
 */
export function notFoundError(message: string = "Resource not found"): NextResponse<ApiErrorResponse> {
  return apiError(message, ApiErrorType.NOT_FOUND);
}

/**
 * バリデーションエラー（400）
 */
export function validationError(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return apiError(message, ApiErrorType.VALIDATION_ERROR, details);
}

/**
 * レート制限エラー（429）
 */
export function rateLimitError(message: string = "Too many requests"): NextResponse<ApiErrorResponse> {
  return apiError(message, ApiErrorType.RATE_LIMIT_EXCEEDED);
}

/**
 * 設定エラー（500）
 * 環境変数の不足など
 */
export function configurationError(
  message: string,
  missing?: string[]
): NextResponse<ApiErrorResponse> {
  return NextResponse.json<ApiErrorResponse>(
    {
      error: message,
      type: ApiErrorType.CONFIGURATION_ERROR,
      message,
      missing,
    },
    { status: 500 }
  );
}

/**
 * 内部サーバーエラー（500）
 */
export function internalServerError(
  message: string = "Internal server error",
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return apiError(message, ApiErrorType.INTERNAL_SERVER_ERROR, details);
}

/**
 * エラーハンドリングのラッパー関数
 * 
 * API Routeのハンドラー関数をラップして、統一されたエラーハンドリングを提供
 * 
 * @example
 * ```ts
 * export const GET = apiHandler(async (request) => {
 *   // 処理
 *   return NextResponse.json({ data: "success" })
 * })
 * ```
 */
export function apiHandler(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("[API Handler Error]:", error);
      }

      // 既にNextResponseの場合はそのまま返す
      if (error instanceof NextResponse) {
        return error;
      }

      // その他のエラーは内部サーバーエラーとして処理
      return internalServerError(
        error.message || "An unexpected error occurred"
      );
    }
  };
}

