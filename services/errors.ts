import { isStorageQuotaError } from './storage';

export type GeminiErrorKind = 'billing' | 'quota' | 'auth' | 'safety' | 'network' | 'unknown';

export interface ClassifiedGeminiError {
  kind: GeminiErrorKind;
  message: string;
  retryable: boolean;
  openApiKeyModal: boolean;
  originalMessage: string;
}

export const RETRY_DELAYS_MS = [2000, 4000, 8000] as const;

interface ExtractedErrorInfo {
  code?: number;
  status?: string;
  message: string;
}

function extractErrorInfo(err: unknown): ExtractedErrorInfo {
  if (err === null || err === undefined) {
    return { message: '' };
  }

  let code: number | undefined;
  let status: string | undefined;
  let message: string;

  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === 'string') {
    message = err;
  } else if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const nested = (obj.error && typeof obj.error === 'object' ? obj.error : obj) as Record<string, unknown>;
    if (typeof nested.code === 'number') code = nested.code;
    else if (typeof nested.status === 'number') code = nested.status;
    else if (typeof obj.status === 'number') code = obj.status;

    if (typeof nested.status === 'string') status = nested.status;
    if (typeof nested.message === 'string') message = nested.message;
    else if (typeof obj.message === 'string') message = obj.message;
    else message = JSON.stringify(err);
  } else {
    message = String(err);
  }

  // Try parsing JSON embedded in Error.message (e.g. Google GenAI SDK error payload)
  const jsonStart = message.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(message.slice(jsonStart)) as Record<string, unknown>;
      const nested = (parsed.error && typeof parsed.error === 'object' ? parsed.error : parsed) as Record<string, unknown>;
      if (code === undefined && typeof nested.code === 'number') code = nested.code;
      if (!status && typeof nested.status === 'string') status = nested.status;
      if (typeof nested.message === 'string') message = nested.message;
    } catch {
      // Not valid JSON; keep raw message
    }
  }

  return { code, status, message };
}

/** Classify Gemini API errors into user-friendly categories and retry policies. */
export function classifyGeminiError(err: unknown): ClassifiedGeminiError {
  const { code, status, message } = extractErrorInfo(err);
  const combined = `${status ?? ''} ${message}`;

  // 0. Never classify browser storage quota errors (IndexedDB QuotaExceededError) as Gemini API quota
  if (isStorageQuotaError(err) || /QuotaExceededError/i.test(combined)) {
    return {
      kind: 'unknown',
      message: message || '瀏覽器儲存空間不足',
      retryable: false,
      openApiKeyModal: false,
      originalMessage: message,
    };
  }

  // 1. Billing / prepayment credits depleted (must precede quota because payload may say RESOURCE_EXHAUSTED)
  if (
    code === 402 ||
    /prepayment credits/i.test(combined) ||
    (/\b402\b/.test(combined) && /billing|prepay|RESOURCE_EXHAUSTED/i.test(combined))
  ) {
    return {
      kind: 'billing',
      message: '預付額度已耗盡，請前往 Google AI Studio 管理專案與帳單。',
      retryable: false,
      openApiKeyModal: false,
      originalMessage: message,
    };
  }

  // 2. Authentication / invalid API key
  if (
    code === 401 ||
    code === 403 ||
    /\b(401|403)\b/.test(combined) ||
    /api[_\s-]?key.*invalid|invalid.*api[_\s-]?key|api_key_invalid|unauthorized|permission[_\s-]?denied/i.test(combined)
  ) {
    return {
      kind: 'auth',
      message: 'API Key 無效',
      retryable: false,
      openApiKeyModal: true,
      originalMessage: message,
    };
  }

  // 3. Quota / rate limit
  if (
    code === 429 ||
    /\b429\b/.test(combined) ||
    /RESOURCE_EXHAUSTED|quota|rate[_\s-]?limit/i.test(combined)
  ) {
    return {
      kind: 'quota',
      message: '已達使用額度，請稍後再試或更換模型',
      retryable: true,
      openApiKeyModal: false,
      originalMessage: message,
    };
  }

  // 4. Safety filter or missing image payload
  if (/SAFETY|no inlineData|blocked|prohibited/i.test(combined)) {
    return {
      kind: 'safety',
      message: '內容被安全過濾，請調整描述',
      retryable: false,
      openApiKeyModal: false,
      originalMessage: message,
    };
  }

  // 5. Network errors
  if (
    (err instanceof TypeError && /fetch/i.test(message)) ||
    /network|failed to fetch|ECONNRESET|ETIMEDOUT|ENOTFOUND|offline|ERR_NETWORK/i.test(combined)
  ) {
    return {
      kind: 'network',
      message: '網路連線異常，請檢查網路設定後再試',
      retryable: true,
      openApiKeyModal: false,
      originalMessage: message,
    };
  }

  // 6. Fallback
  return {
    kind: 'unknown',
    message: message || '發生未知錯誤，請稍後再試',
    retryable: false,
    openApiKeyModal: false,
    originalMessage: message,
  };
}

export interface RetryOptions {
  delaysMs?: readonly number[];
  onRetry?: (attempt: number, maxRetries: number, classified: ClassifiedGeminiError) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Execute an async Gemini operation with exponential backoff on retryable errors (quota / network). */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions
): Promise<T> {
  const delays = opts?.delaysMs ?? RETRY_DELAYS_MS;
  const sleep = opts?.sleep ?? defaultSleep;
  const maxRetries = delays.length;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const classified = classifyGeminiError(err);
      if (!classified.retryable || attempt >= maxRetries) {
        throw err;
      }
      opts?.onRetry?.(attempt + 1, maxRetries, classified);
      await sleep(delays[attempt]);
    }
  }
}
