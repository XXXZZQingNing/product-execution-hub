import { ArrowLeft, ImagePlus, Pencil, Trash2 } from 'lucide-react';
import type { Developer, Product, RepoRef } from '../../types';
import { isVideoPath, resolveMediaUrl, shortName } from '../../lib/utils';
import { ReferenceLinkList } from './ReferenceLinkList';

export function ProductDetailPage({
  product,
  developer,
  publicRepo,
  canEdit,
  onBack,
  onEdit,
  onDelete,
}: {
  product: Product;
  developer?: Developer;
  publicRepo: RepoRef;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button className="btn btn-secondary shadow-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          返回产品列表
        </button>
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn btn-secondary shadow-sm" onClick={onEdit}>
              <Pencil size={16} />
              编辑产品
            </button>
            <button className="btn btn-danger shadow-sm" onClick={onDelete}>
              <Trash2 size={16} />
              删除产品
            </button>
          </div>
        )}
      </div>

      <header className="glass-panel rounded-2xl p-6 md:p-8">
        <p className="text-sm font-bold text-slate-500">所属开发者</p>
        <p className="mt-1 text-lg font-semibold text-blue-600">{developer?.name ?? '未知开发者'}</p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          {product.name}
        </h2>
      </header>

      <section className="glass-panel rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900">功能需求描述</h3>
        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-600">
          {product.requirements || '未填写功能需求描述'}
        </p>
      </section>

      {product.hardware.length > 0 && (
        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <h3 className="text-lg font-bold text-slate-900">硬件设备</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.hardware.map((item) => (
              <span className="chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900">
          参考图片 / 视频
          {product.referenceImages.length > 0 && (
            <span className="ml-2 text-sm font-medium text-slate-400">
              共 {product.referenceImages.length} 个
            </span>
          )}
        </h3>
        {product.referenceImages.length === 0 ? (
          <div className="mt-6 grid h-48 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
            <ImagePlus size={40} strokeWidth={1.5} />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.referenceImages.map((item, index) => {
              const url = resolveMediaUrl(publicRepo, item);
              return (
                <figure
                  key={`${item}-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                >
                  {isVideoPath(item) ? (
                    <video className="aspect-video w-full bg-black object-contain" src={url} controls />
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer">
                      <img
                        className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-105"
                        src={url}
                        alt={`${product.name} 参考图 ${index + 1}`}
                      />
                    </a>
                  )}
                  <figcaption className="truncate px-4 py-2.5 text-xs font-medium text-slate-500">
                    {shortName(item)}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>

      <section className="glass-panel rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900">
          参考链接
          {product.referenceLinks.length > 0 && (
            <span className="ml-2 text-sm font-medium text-slate-400">
              共 {product.referenceLinks.length} 个
            </span>
          )}
        </h3>
        {product.referenceLinks.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">暂无参考链接</p>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <ReferenceLinkList links={product.referenceLinks} />
          </div>
        )}
      </section>
    </div>
  );
}
