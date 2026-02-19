/**
 * HTTP Client - Base para todas as requisições da API
 * Inclui interceptors para autenticação e refresh token
 */

import { storageService } from '../storage';
import { AuthResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/**
 * Extrai mensagem de erro padronizada da resposta da API.
 * Backend retorna: { message, success, errors? }
 */
function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error: unknown }).error;
    if (typeof e === 'string' && e.trim()) return e;
  }
  if (data && typeof data === 'object' && 'errors' in data) {
    const errs = (data as { errors: unknown }).errors;
    if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
      const firstVal = Object.values(errs)[0];
      if (typeof firstVal === 'string' && firstVal) return firstVal;
    }
    if (Array.isArray(errs) && errs.length > 0) {
      const first = errs[0];
      if (first && typeof first === 'object' && 'defaultMessage' in first) {
        const d = (first as { defaultMessage: unknown }).defaultMessage;
        if (typeof d === 'string' && d) return d;
      }
      if (first && typeof first === 'object' && 'message' in first) {
        const m = (first as { message: unknown }).message;
        if (typeof m === 'string' && m) return m;
      }
      const firstVal = Object.values(first as object)[0];
      if (typeof firstVal === 'string' && firstVal) return firstVal;
    }
  }
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 403) return 'Acesso negado.';
  if (status === 404) return 'Recurso não encontrado.';
  if (status >= 500) return 'Erro no servidor. Tente novamente mais tarde.';
  return 'Erro na requisição. Tente novamente.';
}

interface RequestConfig extends RequestInit {
    skipAuth?: boolean;
}

class HttpClient {
    private baseUrl: string;
    private isRefreshing = false;
    private refreshSubscribers: ((token: string) => void)[] = [];

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Adiciona subscriber para quando o token for atualizado
     */
    private subscribeTokenRefresh(callback: (token: string) => void) {
        this.refreshSubscribers.push(callback);
    }

    /**
     * Notifica todos os subscribers que o token foi atualizado
     */
    private onTokenRefreshed(token: string) {
        this.refreshSubscribers.forEach((callback) => callback(token));
        this.refreshSubscribers = [];
    }

    /**
     * Tenta atualizar o access token usando o refresh token
     */
    private async refreshToken(): Promise<boolean> {
        const refreshToken = storageService.getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) return false;

            const data: AuthResponse = await response.json();
            storageService.setTokens(data.accessToken, data.refreshToken);
            storageService.setUser(data.user);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Faz uma requisição HTTP com tratamento de autenticação
     */
    /**
     * Faz uma requisição HTTP com tratamento de autenticação
     */
    async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const { skipAuth = false, ...fetchConfig } = config;

        // Log request (DEBUG)
        console.log(`🌐 API Request [${fetchConfig.method || 'GET'}]:`, endpoint);

        // Verifica se é FormData para não definir Content-Type manualmente
        const isFormData = fetchConfig.body instanceof FormData;

        const headers: Record<string, string> = {};

        // Só define Content-Type se não for FormData e se não foi definido nos headers customizados
        if (!isFormData && !(fetchConfig.headers && 'Content-Type' in (fetchConfig.headers as Record<string, string>))) {
            headers['Content-Type'] = 'application/json';
        }

        // Adiciona headers customizados (mas remove Content-Type se for FormData)
        if (fetchConfig.headers) {
            const customHeaders = fetchConfig.headers as Record<string, string>;
            Object.keys(customHeaders).forEach(key => {
                if (!(isFormData && key.toLowerCase() === 'content-type')) {
                    headers[key] = customHeaders[key];
                }
            });
        }

        // Adiciona token de autenticação se disponível
        if (!skipAuth) {
            const accessToken = storageService.getAccessToken();
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }
        }

        let response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchConfig,
            headers,
        });

        // Log response (DEBUG)
        console.log(`✅ API Response [${response.status}]:`, endpoint);

        // Handle 401 (Unauthorized) or 403 (Forbidden) - Tenta refresh ou logout
        if ((response.status === 401 || response.status === 403) && !skipAuth) {
            if (!this.isRefreshing) {
                this.isRefreshing = true;
                const refreshed = await this.refreshToken();
                this.isRefreshing = false;

                if (refreshed) {
                    const newToken = storageService.getAccessToken();
                    this.onTokenRefreshed(newToken || '');

                    // Retry original request
                    headers['Authorization'] = `Bearer ${newToken}`;
                    response = await fetch(`${this.baseUrl}${endpoint}`, {
                        ...fetchConfig,
                        headers,
                    });
                } else {
                    // Refresh failed, logout and redirect
                    storageService.clear();
                    window.location.href = '/login?expired=true';
                    throw new ApiError('Sessão expirada', 401);
                }
            } else {
                // Wait for other refresh to complete
                return new Promise((resolve) => {
                    this.subscribeTokenRefresh((token) => {
                        headers['Authorization'] = `Bearer ${token}`;
                        resolve(
                            this.request<T>(endpoint, {
                                ...config,
                                headers,
                            })
                        );
                    });
                });
            }
        }

        const data: T = await this.handleResponse<T>(response);

        // Log data for messages (DEBUG)
        if (endpoint.includes('/messages')) {
            console.log('📦 API Data (Messages):', data);
        }

        return data;
    }

    /**
     * Processa a resposta da API - extrai mensagem padronizada de erro para exibição no admin
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const message = extractErrorMessage(data, response.status);
            throw new ApiError(message, response.status, data);
        }

        return data as T;
    }

    // Métodos de conveniência
    async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    async post<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
        // Se body for FormData, não fazer JSON.stringify
        const requestBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);

        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: requestBody,
        });
    }

    async put<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async patch<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }
}

/**
 * Classe de erro customizada para erros da API
 */
export class ApiError extends Error {
    status: number;
    data?: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Instância singleton do HttpClient
export const httpClient = new HttpClient(API_BASE_URL);
export default httpClient;
