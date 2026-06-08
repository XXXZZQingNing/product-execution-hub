import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppDb, GithubConfig } from '../types';
import { AUTO_SYNC_MS, CONFIG_KEY } from '../constants';
import { emptyDb, readDb, readDbPublic, writeDb } from '../lib/github';
import { getPublicRepo } from '../lib/publicRepo';
import { errorMessage, readStoredToken } from '../lib/utils';

const SAVE_DEBOUNCE_MS = 650;

export function useGithubDb() {
  const publicRepo = getPublicRepo();
  const [db, setDb] = useState<AppDb>(() => emptyDb());
  const [config, setConfig] = useState<GithubConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('正在加载公开数据...');
  const [remoteUpdateReady, setRemoteUpdateReady] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const saveSeq = useRef(0);
  const dbRef = useRef(db);
  const canEdit = Boolean(config?.token);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const hasPendingSave = useCallback(() => {
    return saving || saveTimer.current !== null;
  }, [saving]);

  const fetchRemoteDb = useCallback(async () => {
    if (config?.token) {
      const result = await readDb(config);
      return result.db;
    }
    const result = await readDbPublic(publicRepo);
    return result.db;
  }, [config, publicRepo]);

  const applyRemoteIfIdle = useCallback(
    async (options?: { silent?: boolean }) => {
      if (hasPendingSave()) {
        return false;
      }

      try {
        const remoteDb = await fetchRemoteDb();
        const localUpdatedAt = Date.parse(dbRef.current.updatedAt);
        const remoteUpdatedAt = Date.parse(remoteDb.updatedAt);

        if (!Number.isFinite(remoteUpdatedAt) || remoteUpdatedAt <= localUpdatedAt) {
          setRemoteUpdateReady(false);
          return false;
        }

        setDb(remoteDb);
        setRemoteUpdateReady(false);
        if (!options?.silent) {
          setNotice('已同步同事的最新更新');
        }
        return true;
      } catch {
        return false;
      }
    },
    [fetchRemoteDb, hasPendingSave],
  );

  const checkRemoteUpdate = useCallback(async () => {
    if (hasPendingSave()) {
      try {
        const remoteDb = await fetchRemoteDb();
        const localUpdatedAt = Date.parse(dbRef.current.updatedAt);
        const remoteUpdatedAt = Date.parse(remoteDb.updatedAt);
        setRemoteUpdateReady(
          Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt > localUpdatedAt,
        );
      } catch {
        setRemoteUpdateReady(false);
      }
      return;
    }

    await applyRemoteIfIdle({ silent: true });
  }, [applyRemoteIfIdle, fetchRemoteDb, hasPendingSave]);

  useEffect(() => {
    const token = readStoredToken();
    if (token) {
      setConfig({ ...publicRepo, token });
    }
    void loadPublicData(Boolean(token));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void checkRemoteUpdate();
    }, AUTO_SYNC_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkRemoteUpdate();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkRemoteUpdate]);

  async function loadPublicData(editing?: boolean) {
    const isEditing = editing ?? canEdit;
    setLoading(true);
    try {
      const result = await readDbPublic(publicRepo);
      setDb(result.db);
      setRemoteUpdateReady(false);
      setNotice(
        isEditing
          ? `编辑模式：已加载 ${publicRepo.owner}/${publicRepo.repo}`
          : `只读模式：访客可直接浏览 ${publicRepo.owner}/${publicRepo.repo}`,
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadRemote() {
    setLoading(true);
    try {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const result = config?.token ? await readDb(config) : await readDbPublic(publicRepo);
      setDb(result.db);
      setRemoteUpdateReady(false);
      setNotice(
        canEdit
          ? `已同步 ${publicRepo.owner}/${publicRepo.repo} 的最新数据`
          : '已刷新公开数据',
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }

  async function persist(nextDb: AppDb) {
    if (!canEdit || !config?.token) {
      setNotice('当前为只读模式，请填写 Token 后再编辑');
      return;
    }

    setDb(nextDb);
    dbRef.current = nextDb;
    const currentSeq = ++saveSeq.current;

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    setSaving(true);
    setNotice('更改将在片刻后保存到 GitHub');

    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void (async () => {
        try {
          const saved = await writeDb(config, nextDb);
          if (currentSeq === saveSeq.current) {
            setDb(saved);
            dbRef.current = saved;
          }
          setRemoteUpdateReady(false);
          setNotice('已保存到 GitHub，并自动合并了仓库中的最新数据');
        } catch (error) {
          setNotice(errorMessage(error));
        } finally {
          if (currentSeq === saveSeq.current) {
            setSaving(false);
          }
        }
      })();
    }, SAVE_DEBOUNCE_MS);
  }

  async function connectWithToken(token: string) {
    const nextConfig: GithubConfig = { ...publicRepo, token: token.trim() };
    if (!nextConfig.token) return false;

    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: nextConfig.token }));
    setConfig(nextConfig);
    setLoading(true);

    try {
      const remote = await readDb(nextConfig);
      setDb(remote.db);
      setRemoteUpdateReady(false);
      setNotice(`编辑模式已开启：${publicRepo.owner}/${publicRepo.repo}`);
      return true;
    } catch (error) {
      setNotice(errorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    publicRepo,
    db,
    config,
    loading,
    saving,
    notice,
    canEdit,
    remoteUpdateReady,
    loadRemote,
    persist,
    connectWithToken,
  };
}
