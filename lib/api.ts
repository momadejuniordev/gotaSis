export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    ...init,
  });

  const dados = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(dados?.error ?? `Falha na requisição (${res.status})`);
  }

  return dados as T;
}