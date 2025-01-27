/**
 * Simple API Client with CSRF protection
 */
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.csrfToken = null;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make an API request
   * @param {string} path - API endpoint path
   * @param {string} method - HTTP method (GET, POST, etc)
   * @param {object} [body] - Request body for POST/PUT/PATCH
   * @param {object} [params] - Query parameters
   * @returns {Promise<any>} Response data
   */
  async request(path, method = 'GET', body = null, params = null) {
    // Build URL with query parameters
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value != null) searchParams.set(key, value.toString());
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    // Build request options
    const options = {
      method,
      headers: { ...this.headers },
      credentials: 'include', // Important for CORS
    };

    // Add CSRF token for non-GET requests
    if (method !== 'GET' && this.csrfToken) {
      options.headers['X-CSRF-Token'] = this.csrfToken;
    }

    // Add body if provided
    if (body) {
      options.body = JSON.stringify(body);
    }

    // Make request
    const response = await fetch(url, options);

    // Handle errors
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    // Return response (or null for 204 No Content)
    return response.status === 204 ? null : response.json();
  }

  /**
   * Initialize CSRF token
   * Call this before making any POST/PUT/PATCH/DELETE requests
   */
  async init() {
    try {
      const response = await this.request('/api/v1/csrf');
      this.csrfToken = response.token;
      console.log('CSRF token initialized:', this.csrfToken);
    } catch (error) {
      console.error('Failed to initialize CSRF token:', error);
      throw error;
    }
  }

  /**
   * Refresh CSRF token
   * Call this if the CSRF token is expired
   */
  async refresh() {
    this.csrfToken = null;
    await this.init();
  }

  /**
   * Set custom headers
   * @param {object} headers - Headers to add
   */
  setHeaders(headers) {
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiClient };
}