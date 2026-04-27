/**
 * API Client Utility
 * Centralized HTTP client for external API calls
 */

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  params?: Record<string, string | number | undefined>;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string;
  private companyId: string;
  
  constructor() {
    this.baseUrl = `${process.env.EXTERNAL_API_URL || 'https://apidev.linengrass.com'}/api`;
    this.authToken = process.env.API_AUTH_TOKEN || "";
    this.companyId = '1';
  }
  
  /**
   * Builds query string from params object
   */
  private buildQueryString(params: Record<string, string | number | undefined>): string {
    return Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
  }
  
  /**
   * Makes HTTP request to API
   */
  async fetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body, params = {} } = options;
    
    const query = this.buildQueryString(params);
    const url = `${this.baseUrl}${endpoint}${query ? `?${query}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'x-company-id': this.companyId,
        },
        ...(body && { body: JSON.stringify(body) })
      });
      
      if (!response.ok) {
        console.error(`API Error: ${response.status} from ${url}`);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error(`Failed to fetch from ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetches data and returns as JSON string (for tool compatibility)
   */
  async fetchAsString(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<string> {
    try {
      const data = await this.fetch(endpoint, { params });
      return JSON.stringify(data);
    } catch (error) {
      return JSON.stringify({ error: String(error) });
    }
  }
  
  /**
   * Fetches data using POST method with params in body and returns as JSON string
   */
  async fetchAsStringPost(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<string> {
    try {
      const data = await this.fetch(endpoint, { method: 'POST', body: params });
      return JSON.stringify(data);
    } catch (error) {
      return JSON.stringify({ error: String(error) });
    }
  }
  
  /**
   * Fetches paginated data and returns as JSON string
   */
  async fetchPaginatedAsString<T>(
    endpoint: string, 
    params: Record<string, string | number | undefined> = {}
  ): Promise<string> {
    try {
      const data = await this.fetch<PaginatedResponse<T>>(endpoint, { params });
      return JSON.stringify(data);
    } catch (error) {
      return JSON.stringify({ 
        error: String(error), 
        content: [], 
        totalElements: 0 
      });
    }
  }
  
  /**
   * Special handler for endpoints that may return 500 when no data exists
   * (e.g., pickup fulfillment for orders without pickups)
   */
  async fetchOptional<T>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<string> {
    const query = this.buildQueryString(params);
    const url = `${this.baseUrl}${endpoint}${query ? `?${query}` : ''}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'x-company-id': this.companyId,
        }
      });
      
      if (!response.ok) {
        // 500 typically means no data exists for this resource
        if (response.status === 500) {
          return JSON.stringify({ 
            error: "NO_DATA",
            message: "No data available for this resource"
          });
        }
        return JSON.stringify({ error: `API Error: ${response.status} ${response.statusText}` });
      }
      
      const data = await response.json();
      return JSON.stringify(data);
    } catch (error) {
      return JSON.stringify({ error: String(error) });
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();
