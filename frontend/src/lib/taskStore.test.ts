import { describe, expect, it } from 'vitest';
import {
  markQueryError,
  mergeTasks,
  removeTask,
  unfinishedTaskIds,
  type TaskMap,
} from './taskStore';
import type { TaskInfo } from './types';

function task(overrides: Partial<TaskInfo>): TaskInfo {
  return {
    taskId: 'T1',
    templateId: 'tpl-1',
    templateTitle: 'Demo',
    templateCoverUrl: null,
    status: 'PROCESSING',
    currentStage: 'MATERIAL_CHECK',
    failureStage: null,
    failureReason: null,
    resultUrl: null,
    assetUrls: [],
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

describe('多任务状态管理（taskStore）', () => {
  it('多个任务的状态互不覆盖', () => {
    let map: TaskMap = {};
    map = mergeTasks(map, [
      task({ taskId: 'A', status: 'PROCESSING', currentStage: 'SIMULATED_GENERATE' }),
      task({ taskId: 'B', status: 'PENDING', currentStage: null }),
    ]);

    // 任务 A 成功进入下一阶段，不应影响任务 B
    map = mergeTasks(map, [
      task({ taskId: 'A', status: 'SUCCESS', currentStage: null, resultUrl: '/demo/res-1.svg' }),
    ]);

    expect(map['A'].task.status).toBe('SUCCESS');
    expect(map['A'].task.resultUrl).toBe('/demo/res-1.svg');
    expect(map['B'].task.status).toBe('PENDING');
    expect(map['B'].task.resultUrl).toBeNull();
  });

  it('查询异常只标记 queryFailed，不把任务误判为失败', () => {
    let map: TaskMap = {};
    map = mergeTasks(map, [task({ taskId: 'A', status: 'PROCESSING' })]);

    map = markQueryError(map, ['A']);

    expect(map['A'].queryFailed).toBe(true);
    expect(map['A'].task.status).toBe('PROCESSING');
    expect(map['A'].task.failureReason).toBeNull();
  });

  it('查询恢复后清除异常标记并更新任务数据', () => {
    let map: TaskMap = {};
    map = mergeTasks(map, [task({ taskId: 'A', status: 'PROCESSING' })]);
    map = markQueryError(map, ['A']);
    map = mergeTasks(map, [task({ taskId: 'A', status: 'FAILED', failureReason: '模拟生成失败' })]);

    expect(map['A'].queryFailed).toBe(false);
    expect(map['A'].task.status).toBe('FAILED');
    expect(map['A'].task.failureReason).toBe('模拟生成失败');
  });

  it('未完成任务清单：只包含 PENDING/PROCESSING，任务结束后停止跟踪', () => {
    let map: TaskMap = {};
    map = mergeTasks(map, [
      task({ taskId: 'A', status: 'PENDING' }),
      task({ taskId: 'B', status: 'PROCESSING' }),
      task({ taskId: 'C', status: 'SUCCESS' }),
      task({ taskId: 'D', status: 'FAILED' }),
    ]);

    expect(unfinishedTaskIds(map)).toEqual(['A', 'B']);

    map = mergeTasks(map, [task({ taskId: 'A', status: 'SUCCESS' })]);
    expect(unfinishedTaskIds(map)).toEqual(['B']);
  });

  it('删除任务只影响被删除的那一个', () => {
    let map: TaskMap = {};
    map = mergeTasks(map, [task({ taskId: 'A' }), task({ taskId: 'B' })]);
    map = removeTask(map, 'A');

    expect(map['A']).toBeUndefined();
    expect(map['B']).toBeDefined();
  });
});
