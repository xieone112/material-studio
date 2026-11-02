'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AccountButton from '@/components/AccountButton';
import { backendAssetUrl } from '@/lib/api';
import { useTaskTracker } from '@/lib/useTaskTracker';
import type { TaskInfo, TaskStatus } from '@/lib/types';

const STAGE_LABELS: Record<string, string> = {
  MATERIAL_CHECK: '素材检查',
  SIMULATED_GENERATE: '模拟生成',
  RESULT_ORGANIZE: '结果整理',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: '等待处理',
  PROCESSING: '处理中',
  SUCCESS: '成功',
  FAILED: '失败',
};

const FILTERS: Array<{ key: 'ALL' | TaskStatus; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '等待处理' },
  { key: 'PROCESSING', label: '处理中' },
  { key: 'SUCCESS', label: '成功' },
  { key: 'FAILED', label: '失败' },
];

function statusBadge(task: TaskInfo) {
  const base = 'status-badge';
  if (task.status === 'SUCCESS') return <span className={`${base} success`}>{STATUS_LABELS.SUCCESS}</span>;
  if (task.status === 'FAILED') return <span className={`${base} failed`}>{STATUS_LABELS.FAILED}</span>;
  if (task.status === 'PENDING') return <span className={`${base} pending`}>{STATUS_LABELS.PENDING}</span>;
  return (
    <span className={`${base} processing`}>
      {STATUS_LABELS.PROCESSING}·{STAGE_LABELS[task.currentStage ?? ''] ?? ''}
      <span className="stage-dots" aria-hidden><span /><span /><span /></span>
    </span>
  );
}

export default function HistoryPage() {
  const { taskList, tracking, hasQueryError, refresh, remove } = useTaskTracker();
  const [filter, setFilter] = useState<'ALL' | TaskStatus>('ALL');

  const filtered = useMemo(
    () => (filter === 'ALL' ? taskList : taskList.filter((t) => t.status === filter)),
    [taskList, filter],
  );

  return (
    <main>
      <header className="topbar">
        <Link className="back-link" href="/">← 模板列表</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {tracking && (
            <span className="query-error-tip">
              正在跟踪 {taskList.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING').length} 个未完成任务
            </span>
          )}
          {hasQueryError && <span className="query-error-tip">查询异常，已保留当前记录</span>}
          <button type="button" className="icon-btn" aria-label="刷新历史记录" onClick={refresh}>⟳</button>
          <AccountButton />
        </div>
      </header>

      <nav className="category-row" aria-label="状态筛选">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`category-item${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <div className="page-message">
          暂无{filter === 'ALL' ? '' : STATUS_LABELS[filter as TaskStatus] + '的'}制作记录，
          去<Link href="/" style={{ color: 'var(--accent)', margin: '0 4px' }}>模板列表</Link>挑一个开始制作吧
        </div>
      ) : (
        <section className="history-table" aria-label="历史记录列表">
          <div className="history-row history-row-head" aria-hidden>
            <span>模板</span>
            <span>创建时间</span>
            <span>处理状态</span>
            <span>制作结果</span>
            <span />
          </div>
          {filtered.map((t) => (
            <div key={t.taskId} className="history-row">
              <span className="cell-template">
                {t.templateCoverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={backendAssetUrl(t.templateCoverUrl)} alt="" />
                )}
                <span className="template-meta">
                  <strong>{t.templateTitle}</strong>
                  <small>{t.taskId}</small>
                </span>
              </span>
              <span className="cell-time">{t.createdAt}</span>
              <span className="cell-status">
                {statusBadge(t)}
                {t.status === 'FAILED' && t.failureReason && (
                  <small className="fail-reason">{t.failureReason}</small>
                )}
              </span>
              <span className="cell-result">
                {t.status === 'SUCCESS' && t.resultUrl ? (
                  <a href={backendAssetUrl(t.resultUrl)} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={backendAssetUrl(t.resultUrl)} alt={`任务 ${t.taskId} 结果`} />
                  </a>
                ) : t.status === 'FAILED' ? (
                  <span className="no-result">—</span>
                ) : (
                  <span className="no-result">制作中…</span>
                )}
              </span>
              <span className="cell-actions">
                {(t.status === 'SUCCESS' || t.status === 'FAILED') && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`删除任务 ${t.taskId}`}
                    onClick={() => void remove(t.taskId)}
                  >
                    🗑
                  </button>
                )}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
