'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchTemplates, backendAssetUrl } from '@/lib/api';
import AccountButton from '@/components/AccountButton';
import type { Template } from '@/lib/types';

const CHANNELS = [
  { key: 'video', label: '视频' },
  { key: 'workflow', label: '工作流' },
];

export default function TemplateListPage() {
  const router = useRouter();
  const [channel, setChannel] = useState('video');
  const [category, setCategory] = useState('全部');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchTemplates(channel)
      .then(({ items }) => {
        if (!cancelled) setTemplates(items);
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channel]);

  const categories = ['全部', ...Array.from(new Set(templates.map((t) => t.category)))];
  const filtered = category === '全部' ? templates : templates.filter((t) => t.category === category);

  return (
    <main>
      <header className="topbar">
        <div className="logo" aria-hidden>🎬</div>
        <div className="topbar-right">
          <Link href="/history" style={{ color: 'var(--text)', fontWeight: 600 }}>历史记录</Link>
          <span>中文</span>
          <span>年度会员</span>
          <span className="credits">5000 积分</span>
          <AccountButton />
        </div>
      </header>

      <nav className="channel-tabs" aria-label="频道">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            className={`channel-tab${channel === c.key ? ' active' : ''}`}
            onClick={() => {
              setChannel(c.key);
              setCategory('全部');
            }}
          >
            {c.label}
          </button>
        ))}
      </nav>

      <nav className="category-row" aria-label="分类筛选">
        {categories.map((c) => (
          <button
            key={c}
            className={`category-item${category === c ? ' active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </nav>

      {loadError && (
        <div className="error-banner" role="alert">
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="page-message">加载中…</div>
      ) : filtered.length === 0 && !loadError ? (
        <div className="page-message">该分类下暂无模板</div>
      ) : (
        <section className="template-grid" aria-label="模板列表">
          {filtered.map((t) => (
            <button
              key={t.id}
              className="template-card"
              onClick={() => router.push(`/templates/${t.id}`)}
              aria-label={`查看模板 ${t.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={backendAssetUrl(t.coverUrl)} alt="" />
              <span className="title">{t.title}</span>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
