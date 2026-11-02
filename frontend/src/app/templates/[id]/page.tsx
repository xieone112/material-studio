'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createTask, fetchTemplate, uploadImage, backendAssetUrl, ApiError } from '@/lib/api';
import AccountButton from '@/components/AccountButton';
import { useTaskTracker } from '@/lib/useTaskTracker';
import type { TaskInfo, Template, UploadResult } from '@/lib/types';

type SlotState =
  | { kind: 'empty' }
  | { kind: 'uploading'; name: string }
  | { kind: 'done'; upload: UploadResult }
  | { kind: 'error'; message: string };

const STAGE_LABELS: Record<string, string> = {
  MATERIAL_CHECK: '素材检查中',
  SIMULATED_GENERATE: '模拟生成中',
  RESULT_ORGANIZE: '结果整理中',
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.ceil(bytes / 1024)}KB`;
}

function backendUrl(url: string | null): string {
  // 封面 / 结果 / 上传素材均保存在后端，统一走 /backend 同源代理
  return backendAssetUrl(url);
}

export default function TemplateStudioPage({ params }: { params: { id: string } }) {
  const templateId = params.id;
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');

  const [slots, setSlots] = useState<SlotState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { taskList, tracking, hasQueryError, refresh, trackTask, remove } = useTaskTracker();
  const historyTasks = useMemo(
    () => taskList.filter((t) => t.templateId === templateId),
    [taskList, templateId],
  );

  useEffect(() => {
    let cancelled = false;
    fetchTemplate(templateId)
      .then((t) => {
        if (cancelled) return;
        setTemplate(t);
        setSlots(Array.from({ length: t.requiredImageCount }, () => ({ kind: 'empty' as const })));
        setLoadState('ready');
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setLoadError(e.message);
          setLoadState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const handleFile = async (index: number, file: File) => {
    if (!template) return;
    if (!template.acceptedMimeTypes.includes(file.type)) {
      setSlots((s) => s.map((v, i) => (i === index ? { kind: 'error', message: `不支持的图片类型: ${file.type || '未知'}` } : v)));
      return;
    }
    if (file.size > template.maxFileSizeBytes) {
      setSlots((s) => s.map((v, i) => (i === index ? { kind: 'error', message: `图片不能超过 ${formatBytes(template.maxFileSizeBytes)}` } : v)));
      return;
    }
    setSlots((s) => s.map((v, i) => (i === index ? { kind: 'uploading', name: file.name } : v)));
    try {
      const upload = await uploadImage(file, template.id);
      setSlots((s) => s.map((v, i) => (i === index ? { kind: 'done', upload } : v)));
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '上传失败，请重试';
      setSlots((s) => s.map((v, i) => (i === index ? { kind: 'error', message } : v)));
    }
  };

  const resetSlot = (index: number) => {
    setSlots((s) => s.map((v, i) => (i === index ? { kind: 'empty' } : v)));
    if (inputRefs.current[index]) inputRefs.current[index]!.value = '';
  };

  const readyAssetIds = slots.flatMap((s) => (s.kind === 'done' ? [s.upload.assetId] : []));
  const allUploaded = template ? readyAssetIds.length === template.requiredImageCount : false;
  const submittingBlocked = submitting || !allUploaded;

  const handleCreate = async () => {
    if (submittingBlocked || !template) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { taskId } = await createTask(template.id, readyAssetIds);
      trackTask(null, taskId);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadState === 'loading') {
    return <main className="page-message">模板加载中…</main>;
  }
  if (loadState === 'error') {
    return (
      <main>
        <div className="error-banner" role="alert">
          <span>{loadError}</span>
          <Link href="/">返回模板列表</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="studio-layout">
      <section className="creator-panel" aria-label="制作面板">
        <div className="creator-topbar">
          <Link className="back-link" href="/">← {template!.title}</Link>
          <AccountButton />
        </div>

        <div className="cover-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backendUrl(template!.coverUrl)} alt={`${template!.title} 封面示例`} />
        </div>

        <p className="template-desc">{template!.description}</p>

        <div>
          <div className="section-label">
            上传素材（需 {template!.requiredImageCount} 张，支持 JPG / PNG / WebP，单张 ≤ {formatBytes(template!.maxFileSizeBytes)}）
          </div>
          <div className="upload-slots">
            {slots.map((slot, i) => (
              <div key={i}>
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="file"
                  accept={template!.acceptedMimeTypes.join(',')}
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(i, file);
                  }}
                />
                {slot.kind === 'done' ? (
                  <div className="upload-slot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={backendUrl(slot.upload.url)} alt={`素材 ${i + 1} 预览`} />
                    <div className="slot-actions">
                      <button
                        type="button"
                        aria-label={`替换素材 ${i + 1}`}
                        onClick={() => inputRefs.current[i]?.click()}
                      >
                        ⇄
                      </button>
                      <button
                        type="button"
                        aria-label={`移除素材 ${i + 1}`}
                        onClick={() => resetSlot(i)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="upload-slot empty"
                    onClick={() => inputRefs.current[i]?.click()}
                    disabled={slot.kind === 'uploading'}
                    aria-label={`上传素材 ${i + 1}`}
                  >
                    <span className="icon" aria-hidden>🖼️</span>
                    <span>
                      {slot.kind === 'uploading'
                        ? `上传中… ${slot.name}`
                        : slot.kind === 'error'
                          ? '重新选择图片'
                          : '点击上传图片'}
                    </span>
                  </button>
                )}
                {slot.kind === 'error' && <div className="slot-error" role="alert">{slot.message}</div>}
              </div>
            ))}
          </div>
        </div>

        {submitError && (
          <div className="error-banner" role="alert">
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="button"
          className="create-btn"
          disabled={submittingBlocked}
          onClick={handleCreate}
        >
          {submitting ? '提交中…' : '立即制作 ✦ 100'}
        </button>
      </section>

      <section className="history-panel" aria-label="历史记录">
        <div className="history-head">
          <h2>历史记录</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {hasQueryError && <span className="query-error-tip">查询异常，保留历史数据，正在自动恢复…</span>}
            {tracking && <span className="query-error-tip">跟踪 {historyTasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING').length} 个任务中</span>}
            <button type="button" className="icon-btn" aria-label="刷新历史" onClick={refresh}>⟳</button>
          </div>
        </div>

        {historyTasks.length === 0 ? (
          <div className="history-empty">暂无制作记录，提交任务后将在此展示进度与结果</div>
        ) : (
          <div className="history-grid">
            {historyTasks.map((t) => (
              <TaskCard
                key={t.taskId}
                task={t}
                onDelete={() => void remove(t.taskId)}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function TaskCard({ task, onDelete, onRefresh }: { task: TaskInfo; onDelete: () => void; onRefresh: () => void }) {
  const finished = task.status === 'SUCCESS' || task.status === 'FAILED';

  let body: React.ReactNode;
  if (task.status === 'SUCCESS') {
    body = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="result" src={backendUrl(task.resultUrl)} alt={`任务 ${task.taskId} 的制作结果`} />
        <span className="success-badge">✓ 已完成</span>
      </>
    );
  } else if (task.status === 'FAILED') {
    body = (
      <>
        {task.assetUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumbnail" src={backendUrl(task.assetUrls[0])} alt="" />
        )}
        <span className="stage-text">{task.failureReason ?? '任务执行失败'}</span>
      </>
    );
  } else {
    const stageText = task.status === 'PENDING'
      ? '等待处理…'
      : `Processing… ${STAGE_LABELS[task.currentStage ?? ''] ?? ''}`;
    body = (
      <>
        {task.assetUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumbnail" src={backendUrl(task.assetUrls[0])} alt="" />
        )}
        <span className="stage-text">
          {stageText}
          {task.status === 'PROCESSING' && (
            <span className="stage-dots" aria-hidden><span /><span /><span /></span>
          )}
        </span>
      </>
    );
  }

  return (
    <div className={`task-card${task.status === 'FAILED' ? ' failed' : ''}`} aria-label={`任务 ${task.taskId}`}>
      {body}
      {!finished && (
        <div className="card-actions">
          <button type="button" className="icon-btn" aria-label={`刷新任务 ${task.taskId}`} onClick={onRefresh}>
            ⟳
          </button>
        </div>
      )}
      {finished && (
        <div className="card-actions">
          <button type="button" className="icon-btn" aria-label={`删除任务 ${task.taskId}`} onClick={onDelete}>
            🗑
          </button>
        </div>
      )}
    </div>
  );
}
