export interface ApiTestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiTestResponse {
  status: number;
  data: unknown;
  headers: Headers;
}

export async function makeRequest(request: ApiTestRequest): Promise<ApiTestResponse> {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3000';
  const url = `${baseUrl}${request.path}`;
  
  const options: RequestInit = {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      ...request.headers,
    },
  };

  if (request.body) {
    options.body = JSON.stringify(request.body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

export function assertStatus(response: ApiTestResponse, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}. Response: ${JSON.stringify(response.data)}`);
  }
}

export function assertBody<T>(response: ApiTestResponse, validator: (body: T) => boolean): void {
  if (!validator(response.data as T)) {
    throw new Error(`Body validation failed. Response: ${JSON.stringify(response.data)}`);
  }
}
