import { useAuthStore } from '../store/useAuthStore';

const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 60000;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'opto_auth_token';
const TEMP_2FA_TOKEN_KEY = 'opto_2fa_temp_token'; // New key for temporary 2FA token

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status ?? null;
    this.code = details.code ?? 'API_ERROR';
    this.data = details.data ?? null;
    this.url = details.url ?? null;
    this.method = details.method ?? null;
  }
}

const withTimeoutSignal = (timeoutMs, externalSignal) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return { signal: controller.signal, timeoutId };
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

const normalizeFailure = ({ error, response, url, method }) => {
  if (response) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('opto-unauthorized'));
    }
    const fallback = `Request failed with status ${response.status}`;
    const data = error;
    const message =
      (data && typeof data === 'object' && data.message) ||
      (data && typeof data === 'object' && data.detail) ||
      (typeof data === 'string' && data) ||
      fallback;

    return new ApiError(message, {
      status: response.status,
      code: 'HTTP_ERROR',
      data,
      url,
      method
    });
  }

  if (error?.name === 'AbortError') {
    return new ApiError('Request timed out or was cancelled.', {
      code: 'REQUEST_ABORTED',
      url,
      method
    });
  }

  return new ApiError(error?.message || 'Network request failed.', {
    code: 'NETWORK_ERROR',
    url,
    method
  });
};

export async function apiRequest(endpoint, options = {}) {
  const {
    baseUrl = BASE_URL,
    method = 'GET',
    headers = {},
    params,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    useTempToken = false, // New option to use temporary 2FA token
    ...rest
  } = options;

  const targetUrl = new URL(endpoint, baseUrl || window.location.origin);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        targetUrl.searchParams.append(key, String(value));
      }
    });
  }

  const upperMethod = method.toUpperCase();
  const requestHeaders = new Headers(headers);

  let tokenToUse = null;
  if (useTempToken) {
    tokenToUse = localStorage.getItem(TEMP_2FA_TOKEN_KEY);
  } else {
    tokenToUse = useAuthStore.getState().token || localStorage.getItem(AUTH_TOKEN_KEY);
  }

  if (tokenToUse && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${tokenToUse}`);
  }
  
  const hasBody = body !== undefined && body !== null;
  const finalBody =
    hasBody && typeof body === 'object' && !(body instanceof FormData)
      ? JSON.stringify(body)
      : body;

  if (hasBody && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const { signal: timedSignal, timeoutId } = withTimeoutSignal(timeoutMs, signal);

  try {
    const response = await fetch(targetUrl.toString(), {
      method: upperMethod,
      headers: requestHeaders,
      body: hasBody ? finalBody : undefined,
      signal: timedSignal,
      credentials: 'include',
      ...rest
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
      throw normalizeFailure({
        error: data,
        response,
        url: targetUrl.toString(),
        method: upperMethod
      });
    }

    // Handle 2FA specific response — temp token is transport-level, handled here.
    if (data && data.two_factor_required) {
      localStorage.setItem(TEMP_2FA_TOKEN_KEY, data.access_token);
      return { ...data, two_factor_required: true }; 
    } else if (endpoint.includes('/api/auth/2fa/verify')) {
      // P2-2: 2FA verify clears temp token; caller sets main token via api.auth.setToken()
      localStorage.removeItem(TEMP_2FA_TOKEN_KEY);
    }

    // P2-2: Token storage for non-2FA auth flows is now handled by callers
    // (App.jsx login/register handlers call api.auth.setToken(data.access_token))

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw normalizeFailure({ error, url: targetUrl.toString(), method: upperMethod });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  auth: {
    tokenKey: AUTH_TOKEN_KEY,
    setToken: (token) => {
      useAuthStore.setState({ token, isAuthenticated: !!token });
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.removeItem(TEMP_2FA_TOKEN_KEY);
    },
    getToken: () => useAuthStore.getState().token || localStorage.getItem(AUTH_TOKEN_KEY),
    clearToken: () => {
      useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(TEMP_2FA_TOKEN_KEY);
    },
    getTemp2faToken: () => localStorage.getItem(TEMP_2FA_TOKEN_KEY),
    clearTemp2faToken: () => localStorage.removeItem(TEMP_2FA_TOKEN_KEY)
  },
  request: apiRequest,
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' })
};
