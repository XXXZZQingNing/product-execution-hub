import { useState } from 'react';
import { ChevronRight, ImagePlus, PackagePlus, Pencil, Trash2, UserPlus } from 'lucide-react';
import type { AppDb, Developer, Product, RepoRef } from '../../types';
import type { ConfirmDialogState, PromptDialogState } from '../../types/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { isVideoPath, newId, now, resolveMediaUrl } from '../../lib/utils';
import { ProductDetailPage } from './ProductDetailPage';
import { ReferenceLinkList } from './ReferenceLinkList';

export function ProductsModule({
  publicRepo,
  canEdit,
  db,
  selectedDeveloper,
  selectedDeveloperId,
  onSelectDeveloper,
  onPersist,
  onOpenProductModal,
  onAskPrompt,
  onAskConfirm,
}: {
  publicRepo: RepoRef;
  canEdit: boolean;
  db: AppDb;
  selectedDeveloper?: Developer;
  selectedDeveloperId: string;
  onSelectDeveloper: (id: string) => void;
  onPersist: (db: AppDb) => Promise<void>;
  onOpenProductModal: (payload: { developerId: string; product?: Product }) => void;
  onAskPrompt: (options: PromptDialogState) => void;
  onAskConfirm: (options: ConfirmDialogState) => void;
}) {
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const products = db.products.filter((item) => item.developerId === selectedDeveloperId);
  const detailProduct = detailProductId
    ? db.products.find((item) => item.id === detailProductId)
    : undefined;

  if (detailProduct) {
    return (
      <ProductDetailPage
        product={detailProduct}
        developer={db.developers.find((item) => item.id === detailProduct.developerId)}
        publicRepo={publicRepo}
        canEdit={canEdit}
        onBack={() => setDetailProductId(null)}
        onEdit={() =>
          onOpenProductModal({ developerId: detailProduct.developerId, product: detailProduct })
        }
        onDelete={() =>
          onAskConfirm({
            title: '删除产品',
            message: `确定删除产品「${detailProduct.name}」吗？`,
            confirmLabel: '删除',
            danger: true,
            onConfirm: () => {
              void onPersist({
                ...db,
                products: db.products.filter((item) => item.id !== detailProduct.id),
              });
              setDetailProductId(null);
            },
          })
        }
      />
    );
  }

  function addDeveloper() {
    onAskPrompt({
      title: '新增开发者',
      label: '开发者名称',
      confirmLabel: '创建',
      onSubmit: (name) => {
        if (!name.trim()) return;
        const developer: Developer = {
          id: newId(),
          name: name.trim(),
          note: '',
          createdAt: now(),
        };
        onSelectDeveloper(developer.id);
        void onPersist({ ...db, developers: [...db.developers, developer] });
      },
    });
  }

  function renameDeveloper(developer: Developer) {
    onAskPrompt({
      title: '重命名开发者',
      label: '开发者名称',
      defaultValue: developer.name,
      confirmLabel: '保存',
      onSubmit: (name) => {
        if (!name.trim()) return;
        void onPersist({
          ...db,
          developers: db.developers.map((item) =>
            item.id === developer.id ? { ...item, name: name.trim() } : item,
          ),
        });
      },
    });
  }

  function deleteDeveloper(developer: Developer) {
    onAskConfirm({
      title: '删除开发者',
      message: `确定删除开发者「${developer.name}」及其所有产品吗？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => {
        const developers = db.developers.filter((item) => item.id !== developer.id);
        const nextProducts = db.products.filter((item) => item.developerId !== developer.id);
        onSelectDeveloper(developers[0]?.id ?? '');
        void onPersist({ ...db, developers, products: nextProducts });
      },
    });
  }

  function deleteProduct(product: Product) {
    onAskConfirm({
      title: '删除产品',
      message: `确定删除产品「${product.name}」吗？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => {
        void onPersist({ ...db, products: db.products.filter((item) => item.id !== product.id) });
      },
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="glass-panel rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">开发者</h3>
            <p className="text-sm font-medium text-slate-500">产品挂载在开发者下</p>
          </div>
          {canEdit && (
            <button className="btn btn-primary px-3.5 shadow-md" onClick={addDeveloper}>
              <UserPlus size={16} />
            </button>
          )}
        </div>
        <div className="space-y-3">
          {db.developers.length === 0 && (
            <EmptyState title="还没有开发者" description="先创建一个开发者，再添加产品清单。" />
          )}
          {db.developers.map((developer) => (
            <button
              key={developer.id}
              className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                developer.id === selectedDeveloperId
                  ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
              onClick={() => {
                onSelectDeveloper(developer.id);
                setDetailProductId(null);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`font-bold ${developer.id === selectedDeveloperId ? 'text-blue-700' : 'text-slate-700'}`}
                  >
                    {developer.name}
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium ${developer.id === selectedDeveloperId ? 'text-blue-500' : 'text-slate-500'}`}
                  >
                    {db.products.filter((item) => item.developerId === developer.id).length} 个产品
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton
                      label="重命名"
                      onClick={(event) => {
                        event.stopPropagation();
                        renameDeveloper(developer);
                      }}
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      label="删除"
                      danger
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteDeveloper(developer);
                      }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500">当前开发者</p>
            <h3 className="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900">
              {selectedDeveloper?.name ?? '请选择或创建开发者'}
            </h3>
          </div>
          {canEdit && (
            <button
              className="btn btn-primary shadow-md"
              disabled={!selectedDeveloperId}
              onClick={() => onOpenProductModal({ developerId: selectedDeveloperId })}
            >
              <PackagePlus size={18} />
              新增产品
            </button>
          )}
        </div>

        {products.length === 0 ? (
          <EmptyState
            title="暂无产品"
            description="产品包含名称、功能需求、参考图、参考链接与硬件设备。"
          />
        ) : (
          <div className="space-y-12">
            {products.filter(p => p.status === 'developing').length > 0 && (
              <div>
                <h4 className="mb-4 text-xl font-bold text-slate-900">进行中</h4>
                <div className="grid gap-6 lg:grid-cols-2">
                  {products.filter(p => p.status === 'developing').map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
            
            {products.filter(p => p.status === 'shipped').length > 0 && (
              <div className="opacity-70 grayscale-[0.3]">
                <h4 className="mb-4 text-xl font-bold text-slate-500">归档 (已上线)</h4>
                <div className="grid gap-6 lg:grid-cols-2">
                  {products.filter(p => p.status === 'shipped').map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  function ProductCard({ product }: { product: Product }) {
    return (
      <article
        role="button"
        tabIndex={0}
        className="glass-panel group flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-200"
        onClick={() => setDetailProductId(product.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setDetailProductId(product.id);
          }
        }}
      >
        <div className="relative h-48 bg-slate-100">
          {product.referenceImages[0] ? (
            isVideoPath(product.referenceImages[0]) ? (
              <video
                className="h-full w-full object-cover"
                src={resolveMediaUrl(publicRepo, product.referenceImages[0])}
                muted
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <img
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={resolveMediaUrl(publicRepo, product.referenceImages[0])}
                alt={product.name}
              />
            )
          ) : (
            <div className="grid h-full place-items-center text-slate-300">
              <ImagePlus size={40} strokeWidth={1.5} />
            </div>
          )}
          {product.referenceImages.length > 1 && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              +{product.referenceImages.length - 1} 张图
            </span>
          )}
          {canEdit && (
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <IconButton
                label="编辑"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProductModal({ developerId: selectedDeveloperId, product });
                }}
              >
                <Pencil size={15} />
              </IconButton>
              <IconButton
                label="删除"
                danger
                onClick={(event) => {
                  event.stopPropagation();
                  deleteProduct(product);
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{product.name}</h4>
            <ChevronRight
              size={20}
              className="shrink-0 text-slate-300 transition-colors group-hover:text-blue-500"
            />
          </div>
          <p className="mt-2.5 line-clamp-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {product.requirements || '未填写功能需求描述'}
          </p>

          {product.hardware.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.hardware.map((item) => (
                <span className="chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          )}

          {product.referenceLinks.length > 0 && (
            <div
              className="mt-5 border-t border-slate-100 pt-4"
              onClick={(event) => event.stopPropagation()}
            >
              <ReferenceLinkList
                links={product.referenceLinks}
                onClickLink={(event) => event.stopPropagation()}
              />
            </div>
          )}

          <p className="mt-4 text-xs font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
            点击查看完整产品资料
          </p>
        </div>
      </article>
    );
  }
}
