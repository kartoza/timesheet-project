import {
  ApiProject,
  CreateProjectPayload,
  LoginResponse,
  SessionResponse,
  UIProjectRow,
  UISubTask,
} from '../../types/pmo_dashboard';
import {
  API_STATUS_TO_UI_STATUS,
  NUMERIC_UI_FIELDS,
  UI_PROJECT_KEYS,
  UI_STATUS_TO_BACKEND,
  UI_TO_BACKEND_FIELD_MAP,
} from '../../constants/pmo_dashboard';

function normalizeProjectType(projectType: string | null | undefined): string {
  if (!projectType) return 'Unknown';
  const normalized = projectType.trim().toLowerCase();
  if (!normalized) return 'Unknown';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const UI_PROJECT_MAPPERS: Record<keyof UIProjectRow, (project: ApiProject) => UIProjectRow[keyof UIProjectRow]> = {
  _id: (project) => String(project.id),
  [UI_PROJECT_KEYS.PROJECT]: (project) => project.name,
  [UI_PROJECT_KEYS.PROJECT_TYPE]: (project) => normalizeProjectType(project.project_type),
  [UI_PROJECT_KEYS.RELATIONSHIP_MANAGER]: (project) => project.relations_manager || '',
  [UI_PROJECT_KEYS.PROJECT_MANAGER]: (project) => project.project_manager || '',
  [UI_PROJECT_KEYS.TEAM_MEMBERS]: (project) => (project.team_members || []).map((member) => member.name),
  [UI_PROJECT_KEYS.DUE_DATE]: (project) => project.due_date || '',
  [UI_PROJECT_KEYS.START_DATE]: (project) => project.start_date || '',
  [UI_PROJECT_KEYS.STATUS]: (project) => project.status_label || API_STATUS_TO_UI_STATUS[project.status] || project.status,
  [UI_PROJECT_KEYS.BUDGET_HOURS]: (project) => project.budget_hours || 0,
  [UI_PROJECT_KEYS.CONSUMED_TIME]: (project) => project.consumed_time || 0,
  [UI_PROJECT_KEYS.TOTAL_COSTING]: (project) => project.total_costing || 0,
  [UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT]: (project) => project.total_sales_amount || 0,
  [UI_PROJECT_KEYS.TOTAL_BILLED_AMOUNT]: (project) => project.total_billed_amount || 0,
  [UI_PROJECT_KEYS.ACTUAL_PROGRESS]: (project) => project.actual_progress || 0,
  [UI_PROJECT_KEYS.BUSINESS_UNIT]: (project) => project.business_unit || 'General',
  [UI_PROJECT_KEYS.SUBTASKS]: (project) => (project.subtasks || []).map(mapSubTask),
  _statusKey: (project) => project.status,
  _statusReasons: (project) => project.status_reasons || [],
  _riskReason: () => undefined,
  _lastSyncedAt: (project) => project.last_synced_at ?? null,
};

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || '';
  }
  return '';
}

type ApiSubTask = NonNullable<ApiProject['subtasks']>[number];

function mapSubTask(subtask: ApiSubTask): UISubTask {
  return {
    id: subtask.id,
    name: subtask.name,
    budgetTime: subtask.budget_time || 0,
    consumedTime: subtask.consumed_time || 0,
    billableHours: subtask.billable_hours || 0,
  };
}

function mapApiProject(project: ApiProject): UIProjectRow {
  return Object.fromEntries(
    Object.entries(UI_PROJECT_MAPPERS).map(([key, mapper]) => [key, mapper(project)])
  ) as UIProjectRow;
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

function mapStatusToBackend(status: string): { rag?: string; is_active?: boolean } {
  const normalized = normalizeStatus(status);
  return UI_STATUS_TO_BACKEND[normalized] || { is_active: true };
}

function mapFieldToBackend(field: string, value: string | number): Record<string, unknown> {
  if (field === UI_PROJECT_KEYS.STATUS) {
    return mapStatusToBackend(String(value));
  }

  const backendField = UI_TO_BACKEND_FIELD_MAP[field];
  if (!backendField) return {};

  if (field === UI_PROJECT_KEYS.DUE_DATE) {
    return { [backendField]: value || null };
  }

  if (NUMERIC_UI_FIELDS.has(field)) {
    return { [backendField]: Number(value) };
  }

  return { [backendField]: value };
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method || 'GET';
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Content-Type') && method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('X-CSRFToken') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie('csrftoken');
    if (csrf) {
      headers.set('X-CSRFToken', csrf);
    }
  }

  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const json = await response.json();
      if (json?.detail) {
        message = json.detail;
      }
    } catch (_error) {
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

export async function fetchProjects(): Promise<UIProjectRow[]> {
  const data = await apiFetch<ApiProject[]>('/api/pmo/projects/');
  return data.map(mapApiProject);
}

export async function fetchProjectDetail(id: string): Promise<UIProjectRow> {
  const data = await apiFetch<ApiProject>(`/api/pmo/projects/${id}/`);
  return mapApiProject(data);
}

export async function syncProjects(): Promise<UIProjectRow[]> {
  const data = await apiFetch<ApiProject[]>('/api/pmo/projects/sync/', { method: 'POST' });
  return data.map(mapApiProject);
}

export async function syncProjectDetail(id: string): Promise<UIProjectRow> {
  const data = await apiFetch<ApiProject>(`/api/pmo/projects/${id}/sync/`, { method: 'POST' });
  return mapApiProject(data);
}

export async function updateProject(id: string, field: string, value: string | number): Promise<void> {
  const body = mapFieldToBackend(field, value);
  await apiFetch(`/api/pmo/projects/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/api/pmo/projects/${id}/`, {
    method: 'DELETE',
  });
}

export async function createProject(projectData: CreateProjectPayload): Promise<UIProjectRow> {
  const payload = {
    name: projectData[UI_PROJECT_KEYS.PROJECT],
    relations_manager_name: projectData[UI_PROJECT_KEYS.RELATIONSHIP_MANAGER],
    due_date: projectData[UI_PROJECT_KEYS.DUE_DATE] || null,
    budget_hours: Number(projectData[UI_PROJECT_KEYS.BUDGET_HOURS] || 0),
    consumed_time: Number(projectData[UI_PROJECT_KEYS.CONSUMED_TIME] || 0),
    total_sales_amount: Number(projectData[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0),
    total_costing: Number(projectData[UI_PROJECT_KEYS.TOTAL_COSTING] || 0),
    actual_progress: Number(projectData[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0),
    ...mapStatusToBackend(projectData[UI_PROJECT_KEYS.STATUS]),
  };
  const created = await apiFetch<ApiProject>('/api/pmo/projects/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapApiProject(created);
}

export async function getSession(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/pmo/auth/session/');
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/pmo/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch('/api/pmo/auth/logout/', {
    method: 'POST',
  });
}
