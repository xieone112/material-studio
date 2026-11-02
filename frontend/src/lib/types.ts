export interface Template {
  id: string;
  title: string;
  description: string;
  channel: string;
  category: string;
  coverUrl: string;
  requiredImageCount: number;
  acceptedMimeTypes: string[];
  maxFileSizeBytes: number;
}

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export type TaskStage = 'MATERIAL_CHECK' | 'SIMULATED_GENERATE' | 'RESULT_ORGANIZE';

export interface TaskInfo {
  taskId: string;
  templateId: string;
  templateTitle: string;
  templateCoverUrl: string | null;
  status: TaskStatus;
  currentStage: TaskStage | null;
  failureStage: TaskStage | null;
  failureReason: string | null;
  resultUrl: string | null;
  assetUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  assetId: number;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UserProfile {
  userId: string;
  nickname: string;
  email: string;
  createdAt: string | null;
}
