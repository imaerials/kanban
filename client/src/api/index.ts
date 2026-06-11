import { Board, BoardListItem, Column, Task, Subtask, TaskComment, TaskDetail, SearchResult } from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Boards
export const getBoards = () => fetchJSON<BoardListItem[]>(`${API_BASE}/boards`);
export const getBoard = (id: string) => fetchJSON<Board>(`${API_BASE}/boards/${id}`);
export const createBoard = (data: { title: string; description?: string }) =>
  fetchJSON<Board>(`${API_BASE}/boards`, { method: 'POST', body: JSON.stringify(data) });
export const updateBoard = (id: string, data: Partial<{ title: string; description: string }>) =>
  fetchJSON<Board>(`${API_BASE}/boards/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteBoard = (id: string) =>
  fetchJSON<void>(`${API_BASE}/boards/${id}`, { method: 'DELETE' });

// Columns
export const createColumn = (boardId: string, data: { title: string; color?: string }) =>
  fetchJSON<Column>(`${API_BASE}/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify(data) });
export const updateColumn = (id: string, data: Partial<{ title: string; color: string }>) =>
  fetchJSON<Column>(`${API_BASE}/columns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteColumn = (id: string) =>
  fetchJSON<void>(`${API_BASE}/columns/${id}`, { method: 'DELETE' });

// Tasks
export const getTask = (id: string) => fetchJSON<TaskDetail>(`${API_BASE}/tasks/${id}`);
export const createTask = (columnId: string, data: Partial<Task>) =>
  fetchJSON<Task>(`${API_BASE}/columns/${columnId}/tasks`, { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id: string, data: Partial<Task>) =>
  fetchJSON<Task>(`${API_BASE}/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const moveTask = (id: string, data: { columnId: string; position: number; taskIds?: string[] }) =>
  fetchJSON<Task>(`${API_BASE}/tasks/${id}/move`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id: string) =>
  fetchJSON<void>(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });

// Search
export const searchBoardTasks = (boardId: string, q: string) =>
  fetchJSON<SearchResult>(`${API_BASE}/boards/${boardId}/tasks?q=${encodeURIComponent(q)}&limit=10`);
export const searchAllTasks = (q: string) =>
  fetchJSON<SearchResult>(`${API_BASE}/tasks/search?q=${encodeURIComponent(q)}&limit=10`);

// Subtasks
export const addSubtask = (taskId: string, title: string) =>
  fetchJSON<Subtask>(`${API_BASE}/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) });
export const toggleSubtask = (id: string) =>
  fetchJSON<Subtask>(`${API_BASE}/subtasks/${id}/toggle`, { method: 'PATCH' });
export const deleteSubtask = (id: string) =>
  fetchJSON<void>(`${API_BASE}/subtasks/${id}`, { method: 'DELETE' });
// Comments
export const getComments = (taskId: string) =>
  fetchJSON<TaskComment[]>(`${API_BASE}/tasks/${taskId}/comments`);
export const addComment = (taskId: string, data: { author?: string; content: string }) =>
  fetchJSON<TaskComment>(`${API_BASE}/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(data) });
