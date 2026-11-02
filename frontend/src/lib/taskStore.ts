import type { TaskInfo } from './types';

/**
 * 多任务状态存取的纯函数层，便于单测验证：
 * - 多个任务的状态、阶段、错误与结果互不覆盖；
 * - 查询异常（queryFailed）与任务执行失败（status=FAILED）严格区分。
 */
export interface TaskState {
  task: TaskInfo;
  /** 查询接口异常标记：true 表示最近一次查询失败，与任务本身是否失败无关 */
  queryFailed: boolean;
}

export type TaskMap = Record<string, TaskState>;

export function mergeTasks(map: TaskMap, incoming: TaskInfo[]): TaskMap {
  const next: TaskMap = { ...map };
  for (const info of incoming) {
    next[info.taskId] = { task: info, queryFailed: false };
  }
  return next;
}

/** 查询失败：保留已有任务信息，只把受影响任务标记为查询异常，绝不改写任务状态。 */
export function markQueryError(map: TaskMap, affectedTaskIds: string[]): TaskMap {
  const next: TaskMap = { ...map };
  for (const id of affectedTaskIds) {
    const current = next[id];
    if (current) {
      next[id] = { ...current, queryFailed: true };
    }
  }
  return next;
}

export function removeTask(map: TaskMap, taskId: string): TaskMap {
  const next: TaskMap = { ...map };
  delete next[taskId];
  return next;
}

/** 仍需跟踪（轮询）的任务：PENDING / PROCESSING。任务结束后停止自动跟踪。 */
export function unfinishedTaskIds(map: TaskMap): string[] {
  return Object.values(map)
    .filter((s) => s.task.status === 'PENDING' || s.task.status === 'PROCESSING')
    .map((s) => s.task.taskId);
}
