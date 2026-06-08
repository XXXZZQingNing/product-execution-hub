import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trash2, Upload, Video } from 'lucide-react';
import type { GithubConfig, MediaAsset, RepoRef } from '../../types';
import type { ConfirmDialogState } from '../../types/ui';
import { deleteMedia, listMedia, listMediaPublic, uploadMedia } from '../../lib/github';
import { errorMessage } from '../../lib/utils';
import { EmptyState } from '../../components/ui/EmptyState';

export function MediaModule({
  publicRepo,
  config,
  canEdit,
  onAskConfirm,
}: {
  publicRepo: RepoRef;
  config: GithubConfig | null;
  canEdit: boolean;
  onAskConfirm: (options: ConfirmDialogState) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setAssets(
        canEdit && config?.token ? await listMedia(config) : await listMediaPublic(publicRepo),
      );
      setMessage(canEdit ? '媒体库已同步' : '已加载公开媒体库');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [publicRepo.owner, publicRepo.repo, publicRepo.branch, canEdit]);

  async function handleUpload(files: FileList | null) {
    if (!canEdit || !config?.token || !files?.length) return;
    setLoading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMedia(config, file);
      }
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(asset: MediaAsset) {
    if (!canEdit || !config?.token) return;
    onAskConfirm({
      title: '删除媒体文件',
      message: `确定删除媒体文件「${asset.name}」吗？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => {
        void (async () => {
          setLoading(true);
          try {
            await deleteMedia(config, asset);
            await refresh();
          } catch (error) {
            setMessage(errorMessage(error));
          } finally {
            setLoading(false);
          }
        })();
      },
    });
  }

  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900">图片 / 视频资料管理</h3>
            <p className="mt-1.5 text-sm font-medium text-slate-500">
              文件会上传到仓库的 <code>media/</code> 目录，公开仓库中的媒体也会公开可见。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit && (
              <label className="btn btn-primary cursor-pointer shadow-md">
                <Upload size={16} />
                上传文件
                <input
                  className="hidden"
                  type="file"
                  multiple
                  onChange={(event) => void handleUpload(event.target.files)}
                />
              </label>
            )}
            <button className="btn btn-secondary shadow-sm" onClick={() => void refresh()}>
              {loading ? (
                <Loader2 className="animate-spin text-slate-400" size={16} />
              ) : (
                <RefreshCw className="text-slate-500" size={16} />
              )}
              刷新
            </button>
          </div>
        </div>
        {message && (
          <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
            {message}
          </p>
        )}
      </div>

      {assets.length === 0 ? (
        <EmptyState title="媒体库为空" description="上传图片或视频后，可在产品表单中选择或复制链接使用。" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article
              key={asset.path}
              className="glass-panel group overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="relative h-56 bg-slate-100">
                {asset.type === 'image' && (
                  <img
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={asset.downloadUrl}
                    alt={asset.name}
                  />
                )}
                {asset.type === 'video' && (
                  <video className="h-full w-full object-cover" src={asset.downloadUrl} controls />
                )}
                {asset.type === 'file' && (
                  <div className="grid h-full place-items-center text-slate-300">
                    <Video size={42} strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="relative p-5">
                <p className="truncate text-base font-bold text-slate-900">{asset.name}</p>
                <p className="mt-1 truncate text-xs font-medium text-slate-500">{asset.path}</p>
                <div className="mt-5 flex gap-2">
                  <button
                    className="btn btn-secondary flex-1 text-sm shadow-sm"
                    onClick={() => void navigator.clipboard.writeText(asset.downloadUrl)}
                  >
                    复制链接
                  </button>
                  {canEdit && (
                    <button className="btn btn-danger px-3 shadow-sm" onClick={() => handleDelete(asset)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
