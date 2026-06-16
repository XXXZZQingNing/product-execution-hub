import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import type { GithubConfig, Product, ReferenceLink } from '../../types';
import type { ProductDraft } from '../../types/ui';
import { uploadMedia } from '../../lib/github';
import { errorMessage, newId, now, shortName, starterProductDraft } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';

export function ProductModal({
  config,
  developerId,
  product,
  onClose,
  onSave,
}: {
  config: GithubConfig | null;
  developerId: string;
  product?: Product;
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product
      ? {
          name: product.name,
          status: product.status,
          requirements: product.requirements,
          referenceImages: product.referenceImages,
          referenceLinks: product.referenceLinks,
          hardware: product.hardware,
        }
      : starterProductDraft(),
  );
  const [hardwareInput, setHardwareInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(files: FileList | null) {
    if (!config || !files?.length) {
      setError(
        '请先连接 GitHub 后再上传文件。本地草稿会保存产品文字数据，但实际图片/视频需要上传到仓库 media/ 目录。',
      );
      return;
    }

    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files)) {
        paths.push(await uploadMedia(config, file));
      }
      setDraft((current) => ({ ...current, referenceImages: [...current.referenceImages, ...paths] }));
      setError('');
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!draft.name.trim()) {
      setError('请填写产品名称');
      return;
    }

    onSave({
      id: product?.id ?? newId(),
      developerId,
      name: draft.name.trim(),
      status: product?.status ?? 'developing',
      requirements: draft.requirements.trim(),
      referenceImages: draft.referenceImages,
      referenceLinks: draft.referenceLinks,
      hardware: draft.hardware,
      createdAt: product?.createdAt ?? now(),
    });
  }

  return (
    <Modal title={product ? '编辑产品' : '新增产品'} onClose={onClose}>
      <div className="space-y-6">
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">产品名称</span>
          <input
            className="field text-lg font-bold"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="输入产品名称..."
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">功能需求描述</span>
          <textarea
            className="field min-h-32 text-base leading-relaxed"
            value={draft.requirements}
            placeholder="描述产品的核心功能与需求..."
            onChange={(event) => setDraft({ ...draft, requirements: event.target.value })}
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">参考图片 / 视频</span>
          <div className="flex flex-wrap gap-2.5">
            <label className="btn btn-secondary cursor-pointer shadow-sm">
              {uploading ? (
                <Loader2 className="animate-spin text-slate-400" size={16} />
              ) : (
                <Upload className="text-slate-500" size={16} />
              )}
              上传到仓库
              <input
                className="hidden"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(event) => void handleUpload(event.target.files)}
              />
            </label>
            <input
              className="field min-w-0 flex-1"
              placeholder="或粘贴外链 URL"
              value={imageInput}
              onChange={(event) => setImageInput(event.target.value)}
            />
            <button
              className="btn btn-secondary shadow-sm"
              onClick={() => {
                if (!imageInput.trim()) return;
                setDraft({ ...draft, referenceImages: [...draft.referenceImages, imageInput.trim()] });
                setImageInput('');
              }}
            >
              添加
            </button>
          </div>
          {draft.referenceImages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
              {draft.referenceImages.map((item) => (
                <button
                  key={item}
                  className="chip hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      referenceImages: draft.referenceImages.filter((value) => value !== item),
                    })
                  }
                >
                  {shortName(item)} <span className="ml-1 opacity-50">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">参考链接</span>
          <div className="grid gap-2.5 md:grid-cols-[1fr_2fr_auto]">
            <input
              className="field"
              placeholder="链接名称 (可选)"
              value={linkLabel}
              onChange={(event) => setLinkLabel(event.target.value)}
            />
            <input
              className="field"
              placeholder="https://..."
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
            <button
              className="btn btn-secondary shadow-sm"
              onClick={() => {
                if (!linkUrl.trim()) return;
                const link: ReferenceLink = { id: newId(), label: linkLabel.trim(), url: linkUrl.trim() };
                setDraft({ ...draft, referenceLinks: [...draft.referenceLinks, link] });
                setLinkLabel('');
                setLinkUrl('');
              }}
            >
              添加
            </button>
          </div>
          {draft.referenceLinks.length > 0 && (
            <div className="mt-4 space-y-2">
              {draft.referenceLinks.map((link) => (
                <button
                  key={link.id}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition-colors hover:border-slate-300 hover:bg-slate-100"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      referenceLinks: draft.referenceLinks.filter((item) => item.id !== link.id),
                    })
                  }
                >
                  <span className="font-medium text-slate-700 truncate">{link.label || link.url}</span>
                  <span className="text-xs font-bold text-rose-500 opacity-0 transition-opacity group-hover:opacity-100">
                    删除
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">硬件设备</span>
          <div className="flex gap-2.5">
            <input
              className="field"
              value={hardwareInput}
              onChange={(event) => setHardwareInput(event.target.value)}
              placeholder="如 Arduino、树莓派、传感器..."
            />
            <button
              className="btn btn-secondary shadow-sm"
              onClick={() => {
                if (!hardwareInput.trim()) return;
                setDraft({
                  ...draft,
                  hardware: [...new Set([...draft.hardware, hardwareInput.trim()])],
                });
                setHardwareInput('');
              }}
            >
              添加
            </button>
          </div>
          {draft.hardware.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
              {draft.hardware.map((item) => (
                <button
                  key={item}
                  className="chip hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  onClick={() =>
                    setDraft({ ...draft, hardware: draft.hardware.filter((value) => value !== item) })
                  }
                >
                  {item} <span className="ml-1 opacity-50">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary shadow-md" onClick={submit}>
            保存产品
          </button>
        </div>
      </div>
    </Modal>
  );
}
