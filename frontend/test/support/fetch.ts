export interface MockResponse {
  status?: number;
  body?: unknown;
}

export type Routes = Record<string, MockResponse | ((body: unknown) => MockResponse)>;

export function mockFetch(routes: Routes) {
  const calls: { method: string; path: string; body: unknown; headers: Record<string, string> }[] = [];

  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = input.replace(/^\/api/, '');
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body, headers: (init.headers ?? {}) as Record<string, string> });

    const route = routes[`${method} ${path}`];
    if (!route) {
      return new Response(JSON.stringify({ error: { code: 'not_found', message: 'Rota não encontrada.' } }), { status: 404 });
    }
    const { status = 200, body: responseBody } = typeof route === 'function' ? route(body) : route;
    return new Response(status === 204 ? null : JSON.stringify(responseBody ?? {}), { status });
  });

  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

export const session = {
  user: { id: 'u1', name: 'Ana Souza', email: 'ana@empresa.com', role: 'master' as const, jobRoleId: null },
  company: { id: 'c1', name: 'Empresa Teste' },
};
