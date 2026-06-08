import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { RepoRef } from '../../types';
import { testGithubConnection } from '../../lib/github';
import { errorMessage } from '../../lib/utils';
import { Modal } from '../ui/Modal';

export function SettingsModal({
  publicRepo,
  initialToken,
  onClose,
  onSave,
}: {
  publicRepo: RepoRef;
  initialToken: string;
  onClose: () => void;
  onSave: (token: string) => void;
}) {
  const [token, setToken] = useState(initialToken);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  const config = { ...publicRepo, token: token.trim() };

  async function test() {
    setTesting(true);
    try {
      await testGithubConnection(config);
      setMessage('Token 验证成功，可以开启编辑模式。');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal title="开启编辑模式" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-5 py-4 text-sm leading-relaxed text-blue-900 shadow-sm">
          访客无需配置即可浏览内容。只有你填写具备 Contents 读写权限的 Token 后，才能新增、编辑和上传资料。
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          <p>
            <span className="font-bold text-slate-700">Owner：</span>
            {publicRepo.owner}
          </p>
          <p className="mt-1">
            <span className="font-bold text-slate-700">Repo：</span>
            {publicRepo.repo}
          </p>
          <p className="mt-1">
            <span className="font-bold text-slate-700">Branch：</span>
            {publicRepo.branch}
          </p>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">
            Personal Access Token
          </span>
          <input
            className="field font-mono"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            type="password"
            placeholder="github_pat_..."
          />
        </label>
        {message && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">
            {message}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100">
          <button className="btn btn-secondary shadow-sm" onClick={test} disabled={testing || !token.trim()}>
            {testing ? (
              <Loader2 className="animate-spin text-slate-400" size={16} />
            ) : (
              <CheckCircle2 className="text-slate-500" size={16} />
            )}
            测试 Token
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary shadow-md" onClick={() => onSave(token)} disabled={!token.trim()}>
            开启编辑
          </button>
        </div>
      </div>
    </Modal>
  );
}
