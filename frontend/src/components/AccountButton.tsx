'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchProfile, updateProfile, deleteAccount, resetIdentity, ApiError } from '@/lib/api';
import type { UserProfile } from '@/lib/types';

/**
 * 顶栏账号入口 + Account Settings 弹窗。
 * 身份说明：用户 ID 由浏览器首次访问时生成（UUID，localStorage 持久化），
 * 昵称/邮箱保存在后端 app_user 表，随 X-User-Id 请求头自动关联。
 */
export default function AccountButton() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setNickname(p.nickname);
        setEmail(p.email);
      })
      .catch(() => setLoadError(true));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    try {
      const p = await updateProfile(nickname, email);
      setProfile(p);
      setNickname(p.nickname);
      setEmail(p.email);
      setSaveMessage('已保存');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (e) {
      setSaveMessage(e instanceof ApiError ? e.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteAccount();
    } catch {
      // 即使后端清理失败也重置本地身份，保证演示可继续
    }
    resetIdentity();
    window.location.href = '/';
  }

  const avatarChar = (profile?.nickname ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      <button
        type="button"
        className="avatar-btn"
        aria-label="账号设置"
        onClick={() => {
          initialized.current = false;
          setConfirmDelete(false);
          setOpen(true);
        }}
      >
        {avatarChar}
      </button>

      {open && (
        <div className="modal-mask" onClick={() => setOpen(false)}>
          <div
            className="account-modal"
            role="dialog"
            aria-label="账号设置"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="account-modal-head">
              <h2>账号设置</h2>
              <button type="button" className="icon-btn" aria-label="关闭" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="account-card">
              <div className="account-id-row">
                <span className="account-avatar">{avatarChar}</span>
                <span className="account-name">
                  <strong>{profile?.nickname ?? (loadError ? '加载失败' : '加载中…')}</strong>
                  <small>{profile?.userId ?? '—'}</small>
                </span>
              </div>

              {loadError ? (
                <p className="account-error">资料加载失败，请关闭后重试</p>
              ) : (
                <>
                  <label className="account-field">
                    <span>昵称</span>
                    <input
                      value={nickname}
                      maxLength={64}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="给自己起个昵称"
                    />
                  </label>
                  <label className="account-field">
                    <span>邮箱</span>
                    <input
                      value={email}
                      maxLength={128}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="用于接收制作结果（演示用，仅保存）"
                    />
                  </label>
                  <div className="account-save-row">
                    <button type="button" className="primary-btn" disabled={saving || !nickname.trim()} onClick={() => void handleSave()}>
                      {saving ? '保存中…' : '保存'}
                    </button>
                    {saveMessage && <span className="save-message">{saveMessage}</span>}
                  </div>
                </>
              )}
            </div>

            <div className="account-menu">
              {['账单管理', '服务条款', '隐私政策', '订阅条款'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="account-menu-item"
                  title="演示占位入口"
                  onClick={() => setSaveMessage(`「${item}」为演示占位入口`)}
                >
                  <span>{item}</span>
                  <span aria-hidden>›</span>
                </button>
              ))}
            </div>

            <div className="account-danger">
              <div className="account-danger-head">
                <h3>注销账号</h3>
                <button type="button" className="icon-btn" aria-label="删除账号选项" onClick={() => setConfirmDelete((v) => !v)}>
                  {confirmDelete ? '⋯' : '…'}
                </button>
              </div>
              <p>将清空当前身份的昵称、邮箱与全部制作记录，并生成一个全新身份。</p>
              {confirmDelete && (
                <button type="button" className="danger-btn" onClick={() => void handleDelete()}>
                  确认清空并重置身份
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
