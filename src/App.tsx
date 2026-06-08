import { useEffect, useState } from 'react';
import {
  ClipboardList,
  GitBranch,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react';
import type { Product } from './types';
import type { ConfirmDialogState, ModuleKey, PromptDialogState } from './types/ui';
import { ConfirmModal } from './components/dialogs/ConfirmModal';
import { PromptModal } from './components/dialogs/PromptModal';
import { SettingsModal } from './components/dialogs/SettingsModal';
import { MobileNav } from './components/ui/MobileNav';
import { NavButton } from './components/ui/NavButton';
import { useGithubDb } from './hooks/useGithubDb';
import { ExecutionModule } from './modules/execution/ExecutionModule';
import { MediaModule } from './modules/media/MediaModule';
import { ProductModal } from './modules/products/ProductModal';
import { ProductsModule } from './modules/products/ProductsModule';

const moduleTitles: Record<ModuleKey, string> = {
  products: '产品开发',
  execution: '执行模块',
  media: '媒体库',
};

export default function App() {
  const {
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
  } = useGithubDb();

  const [activeModule, setActiveModule] = useState<ModuleKey>('products');
  const [selectedDeveloperId, setSelectedDeveloperId] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [productModal, setProductModal] = useState<{
    developerId: string;
    product?: Product;
  } | null>(null);

  useEffect(() => {
    if (!selectedDeveloperId && db.developers[0]) {
      setSelectedDeveloperId(db.developers[0].id);
    }
    if (selectedDeveloperId && !db.developers.some((dev) => dev.id === selectedDeveloperId)) {
      setSelectedDeveloperId(db.developers[0]?.id ?? '');
    }
  }, [db.developers, selectedDeveloperId]);

  useEffect(() => {
    if (!selectedExecutionId && db.executions[0]) {
      setSelectedExecutionId(db.executions[0].id);
    }
    if (selectedExecutionId && !db.executions.some((item) => item.id === selectedExecutionId)) {
      setSelectedExecutionId(db.executions[0]?.id ?? '');
    }
  }, [db.executions, selectedExecutionId]);

  const selectedDeveloper = db.developers.find((item) => item.id === selectedDeveloperId);
  const selectedExecution = db.executions.find((item) => item.id === selectedExecutionId);

  async function handleConnectWithToken(token: string) {
    const ok = await connectWithToken(token);
    if (ok) {
      setSettingsOpen(false);
    } else {
      setSettingsOpen(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/40 md:min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-100 bg-slate-50/50 p-6 lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white shadow-md">
              <LayoutDashboard size={20} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">开发执行管理站</h1>
              <p className="text-xs font-medium text-slate-500">GitHub Pages 托管</p>
            </div>
          </div>

          <nav className="space-y-3">
            <NavButton
              icon={<Users size={18} />}
              active={activeModule === 'products'}
              title="产品开发"
              subtitle="开发者与产品清单"
              onClick={() => setActiveModule('products')}
            />
            <NavButton
              icon={<ClipboardList size={18} />}
              active={activeModule === 'execution'}
              title="执行模块"
              subtitle="独立执行方案"
              onClick={() => setActiveModule('execution')}
            />
            <NavButton
              icon={<ImagePlus size={18} />}
              active={activeModule === 'media'}
              title="媒体库"
              subtitle="图片与视频资料"
              onClick={() => setActiveModule('media')}
            />
          </nav>

          <div className="mt-auto pt-8">
            <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <GitBranch size={16} className="text-slate-400" />
                GitHub 连接
              </div>
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{notice}</p>
              <p className="mt-2 text-xs font-semibold text-slate-600">{canEdit ? '编辑模式' : '只读模式'}</p>
              <button className="btn btn-secondary mt-4 w-full text-sm" onClick={() => setSettingsOpen(true)}>
                <Settings size={15} />
                {canEdit ? '编辑 Token' : '开启编辑'}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5 md:px-10 lg:py-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Workspace</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                {moduleTitles[activeModule]}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <MobileNav active={activeModule} onChange={setActiveModule} />
              <button className="btn btn-secondary shadow-sm" onClick={() => void loadRemote()}>
                {loading ? (
                  <Loader2 className="animate-spin text-slate-400" size={16} />
                ) : (
                  <RefreshCw className="text-slate-500" size={16} />
                )}
                同步
              </button>
              <button className="btn btn-secondary shadow-sm lg:hidden" onClick={() => setSettingsOpen(true)}>
                <Settings className="text-slate-500" size={16} />
                设置
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6 md:p-10 scrollbar-soft">
            {(saving || loading) && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur-md">
                <Loader2 className="animate-spin" size={16} />
                {saving ? '正在保存到 GitHub...' : '正在同步 GitHub 数据...'}
              </div>
            )}

            {remoteUpdateReady && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <p>检测到 GitHub 仓库有同事的新更新。你可以立即同步，或继续编辑，保存时会自动合并双方数据。</p>
                <button className="btn btn-primary shrink-0" onClick={() => void loadRemote()}>
                  <RefreshCw size={16} />
                  立即同步
                </button>
              </div>
            )}

            {!canEdit && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
                <p>
                  当前为只读浏览模式，访客无需配置即可查看内容。只有管理员填写 Token 后才能新增、编辑和上传资料。
                </p>
                <button className="btn btn-primary shrink-0" onClick={() => setSettingsOpen(true)}>
                  <Settings size={16} />
                  开启编辑
                </button>
              </div>
            )}

            {activeModule === 'products' && (
              <ProductsModule
                publicRepo={publicRepo}
                canEdit={canEdit}
                db={db}
                selectedDeveloper={selectedDeveloper}
                selectedDeveloperId={selectedDeveloperId}
                onSelectDeveloper={setSelectedDeveloperId}
                onPersist={persist}
                onOpenProductModal={setProductModal}
                onAskPrompt={setPromptDialog}
                onAskConfirm={setConfirmDialog}
              />
            )}
            {activeModule === 'execution' && (
              <ExecutionModule
                canEdit={canEdit}
                db={db}
                selectedExecution={selectedExecution}
                selectedExecutionId={selectedExecutionId}
                onSelectExecution={setSelectedExecutionId}
                onPersist={persist}
                onAskPrompt={setPromptDialog}
                onAskConfirm={setConfirmDialog}
              />
            )}
            {activeModule === 'media' && (
              <MediaModule
                publicRepo={publicRepo}
                config={config}
                canEdit={canEdit}
                onAskConfirm={setConfirmDialog}
              />
            )}
          </div>
        </main>
      </div>

      {settingsOpen && (
        <SettingsModal
          publicRepo={publicRepo}
          initialToken={config?.token ?? ''}
          onClose={() => setSettingsOpen(false)}
          onSave={(token) => void handleConnectWithToken(token)}
        />
      )}

      {promptDialog && (
        <PromptModal
          {...promptDialog}
          onClose={() => setPromptDialog(null)}
          onSubmit={(value) => {
            promptDialog.onSubmit(value);
            setPromptDialog(null);
          }}
        />
      )}

      {confirmDialog && (
        <ConfirmModal
          {...confirmDialog}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
        />
      )}

      {productModal && canEdit && (
        <ProductModal
          config={config}
          product={productModal.product}
          developerId={productModal.developerId}
          onClose={() => setProductModal(null)}
          onSave={(product) => {
            const products = productModal.product
              ? db.products.map((item) => (item.id === product.id ? product : item))
              : [...db.products, product];
            setProductModal(null);
            void persist({ ...db, products });
          }}
        />
      )}
    </div>
  );
}
