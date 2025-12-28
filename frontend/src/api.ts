export type Category = { id: number; name: string };
export type Tag = { id: number; name: string };

export type Note = {
  id: number;
  title: string;
  content: string;
  categories: Category[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
};

export type NoteUpsert = {
  title: string;
  content: string;
  categoryIds: number[];
  tagIds: number[];
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "http://localhost:9000";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const msg = typeof body === "string" ? body : body?.error ?? JSON.stringify(body);
    throw new Error(`${res.status} ${res.statusText}: ${msg}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => http<string>("/api/health"),

  listNotes: (params: { q?: string; categoryId?: number; tagId?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.categoryId) qs.set("categoryId", String(params.categoryId));
    if (params.tagId) qs.set("tagId", String(params.tagId));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return http<Note[]>(`/api/notes${suffix}`);
  },

  getNote: (id: number) => http<Note>(`/api/notes/${id}`),
  createNote: (payload: NoteUpsert) => http<Note>("/api/notes", { method: "POST", body: JSON.stringify(payload) }),
  updateNote: (id: number, payload: NoteUpsert) =>
    http<Note>(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNote: (id: number) => http<void>(`/api/notes/${id}`, { method: "DELETE" }),

  listCategories: () => http<Category[]>("/api/categories"),
  createCategory: (name: string) => http<Category>("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
  updateCategory: (id: number, name: string) =>
    http<Category>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteCategory: (id: number) => http<void>(`/api/categories/${id}`, { method: "DELETE" }),

  listTags: () => http<Tag[]>("/api/tags"),
  createTag: (name: string) => http<Tag>("/api/tags", { method: "POST", body: JSON.stringify({ name }) }),
  updateTag: (id: number, name: string) =>
    http<Tag>(`/api/tags/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteTag: (id: number) => http<void>(`/api/tags/${id}`, { method: "DELETE" })
};
