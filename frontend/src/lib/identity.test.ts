import { beforeEach, describe, expect, it } from 'vitest';
import { getUserId, resetIdentity } from './api';

describe('用户身份管理（getUserId / resetIdentity）', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('首次访问自动生成 UUID 并持久化，刷新后复用同一身份', () => {
    const first = getUserId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(window.localStorage.getItem('ms-user-id')).toBe(first);

    expect(getUserId()).toBe(first);
  });

  it('重置身份后清除本地用户 ID，下次访问生成全新身份', () => {
    const old = getUserId();
    resetIdentity();

    expect(window.localStorage.getItem('ms-user-id')).toBeNull();
    const fresh = getUserId();
    expect(fresh).not.toBe(old);
  });

  it('不同浏览器身份互不相同（个人记录隔离的前提）', () => {
    // 模拟另一个"浏览器"的 localStorage
    const identityA = getUserId();
    resetIdentity();
    const identityB = getUserId();
    expect(identityA).not.toBe(identityB);
  });
});
