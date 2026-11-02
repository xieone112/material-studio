'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTasks, deleteTask as apiDeleteTask } from './api';
import {
  markQueryError,
  mergeTasks,
  removeTask,
  unfinishedTaskIds,
  type TaskMap,
} from './taskStore';
import type { TaskInfo } from './types';

const POLL_INTERVAL_MS = 2000;

/**
 * 多任务跟踪 Hook：
 * - 每个任务的状态独立保存，互不覆盖；
 * - 仅当存在未完成任务时按固定间隔轮询，全部结束后停止；
 * - 查询异常时保留旧数据并标记 queryFailed，任务状态不被误判为失败；
 * - 组件卸载时清理定时器，避免离开页面后旧请求覆盖数据。
 */
export function useTaskTracker() {
  const [tasks, setTasks] = useState<TaskMap>({});
  const [tracking, setTracking] = useState(false);
  const tasksRef = useRef<TaskMap>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);
  const disposedRef = useRef(false);

  const applyTasks = useCallback((next: TaskMap) => {
    tasksRef.current = next;
    if (!disposedRef.current) {
      setTasks(next);
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (disposedRef.current) return;
    const pending = unfinishedTaskIds(tasksRef.current);
    setTracking(pending.length > 0);
    if (pending.length === 0) return;
    if (timerRef.current !== null) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void poll();
    }, POLL_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTasks]);

  const poll = useCallback(async () => {
    if (inflightRef.current || disposedRef.current) return;
    inflightRef.current = true;
    try {
      const { items } = await fetchTasks();
      applyTasks(mergeTasks(tasksRef.current, items));
    } catch {
      // 查询异常：保留已有任务信息，标记查询失败，但不把任务状态改成 FAILED
      applyTasks(markQueryError(tasksRef.current, Object.keys(tasksRef.current)));
    } finally {
      inflightRef.current = false;
      scheduleNext();
    }
  }, [applyTasks, scheduleNext]);

  /** 立即拉取一次（页面加载 / 新任务提交 / 手动刷新）。 */
  const refresh = useCallback(() => {
    void poll();
  }, [poll]);

  /** 新任务受理成功后加入跟踪并立刻查询。 */
  const trackTask = useCallback(
    (_info: TaskInfo | null, taskId?: string) => {
      if (taskId && !tasksRef.current[taskId]) {
        // 先以占位状态加入，下一次 poll 会用服务端数据覆盖
        applyTasks(tasksRef.current);
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void poll();
    },
    [applyTasks, poll],
  );

  const remove = useCallback(
    async (taskId: string) => {
      applyTasks(removeTask(tasksRef.current, taskId));
      try {
        await apiDeleteTask(taskId);
      } catch {
        // 删除失败不阻塞前端：刷新列表时以后端数据为准
      }
    },
    [applyTasks],
  );

  // 首次加载 + 卸载清理
  useEffect(() => {
    disposedRef.current = false;
    void poll();
    return () => {
      disposedRef.current = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taskList = Object.values(tasks).map((s) => s.task);
  const hasQueryError = Object.values(tasks).some((s) => s.queryFailed);

  return { tasks, taskList, tracking, hasQueryError, refresh, trackTask, remove };
}
