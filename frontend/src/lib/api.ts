import type { TaskInfo, Template, UploadResult, UserProfile } from './types';

// 统一走 Next.js 同源代理 /backend/api，避免跨域并隐藏后端地址
const API_BASE = '/backend/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 用户身份：本地生成 UUID 并随请求携带 X-User-Id 头，后端据此隔离个人数据。 */
export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  let id = window.localStorage.getItem('ms-user-id');
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem('ms-user-id', id);
  }
  return id;
}

/**
 * 后端静态资源（模板示例图 /demo/**、上传素材 /files/**）统一加 /backend 前缀，
 * 经 Next.js 同源代理访问后端，避免路径未代理导致 404。
 */
export function backendAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.startsWith('/') ? `/backend${url}` : `/backend/${url}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'X-User-Id': getUserId(),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // 网络层失败（后端不可达等）与业务错误码区分
    throw new ApiError(0, '无法连接服务器，请稍后重试');
  }
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore body parse error
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export function fetchTemplates(channel?: string, category?: string): Promise<{ items: Template[] }> {
  const params = new URLSearchParams();
  if (channel) params.set('channel', channel);
  if (category) params.set('category', category);
  return request(`/templates?${params.toString()}`);
}

export function fetchTemplate(id: string): Promise<Template> {
  return request(`/templates/${encodeURIComponent(id)}`);
}

export function uploadImage(file: File, templateId: string, signal?: AbortSignal): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('templateId', templateId);
  return request('/uploads', { method: 'POST', body: form, signal });
}

export function createTask(templateId: string, assetIds: number[]): Promise<{ taskId: string }> {
  return request('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, assetIds }),
  });
}

export function fetchTasks(): Promise<{ items: TaskInfo[] }> {
  return request('/tasks');
}

export function deleteTask(taskId: string): Promise<{ deleted: boolean }> {
  return request(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
}

/** 获取当前用户资料（首次访问自动注册）。 */
export function fetchProfile(): Promise<UserProfile> {
  return request('/users/me');
}

/** 更新昵称与邮箱。 */
export function updateProfile(nickname: string, email: string): Promise<UserProfile> {
  return request('/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, email }),
  });
}

/** 删除账号（清空资料与个人任务记录），配合前端重置身份。 */
export function deleteAccount(): Promise<{ deleted: boolean }> {
  return request('/users/me', { method: 'DELETE' });
}

/** 重置身份：清空本地用户 ID 与昵称缓存，下次请求将生成全新身份。 */
export function resetIdentity(): void {
  window.localStorage.removeItem('ms-user-id');
  window.localStorage.removeItem('ms-nickname');
}
