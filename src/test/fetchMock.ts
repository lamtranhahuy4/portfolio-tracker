import { vi } from 'vitest';

export type FetchMock = ReturnType<typeof vi.fn>;

export function setupFetchMock(): FetchMock {
  const fetchMock = vi.fn();
  global.fetch = fetchMock;
  return fetchMock;
}

export function mockFetchResponse(fetchMock: FetchMock, data: unknown, status = 200, ok = true) {
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
  } as Response);
}

export function mockFetchError(fetchMock: FetchMock, error: Error) {
  fetchMock.mockRejectedValueOnce(error);
}
