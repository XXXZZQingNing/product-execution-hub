import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  GitBranch,
  ImagePlus,
  LayoutDashboard,
  Link2,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import type {
  AppDb,
  Developer,
  ExecutionPlan,
  ExecutionTask,
  GithubConfig,
  MediaAsset,
  Product,
  ReferenceLink,
  RepoRef,
  TaskStatus,
} from './types';
import {
  deleteMedia,
  emptyDb,
  listMedia,
  listMediaPublic,
  rawUrl,
  readDb,
  readDbPublic,
  testGithubConnection,
  uploadMedia,
  writeDb,
} from './lib/github';
import { getPublicRepo } from './lib/publicRepo';

type ModuleKey = 'products' | 'execution' | 'media';
type ProductDraft = Omit<Product, 'id' | 'developerId' | 'createdAt'>;
type PromptDialogState = {
  title: string;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
};
type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

const CONFIG_KEY = 'product-execution-hub.github-config';
const statuses: Array<{ key: TaskStatus; label: string }> = [
  { key: 'todo', label: '待办' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
];

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const starterProductDraft = (): ProductDraft => ({
  name: '',
  requirements: '',
  referenceImages: [],
  referenceLinks: [],
  hardware: [],
});

export default function App() {
  const publicRepo = getPublicRepo();
  const [activeModule, setActiveModule] = useState<ModuleKey>('products');
  const [db, setDb] = useState<AppDb>(() => emptyDb());
  const [config, setConfig] = useState<GithubConfig | null>(null);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>('');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [productModal, setProductModal] = useState<{
    developerId: string;
    product?: Product;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('正在加载公开数据...');
  const saveTimer = useRef<number | null>(null);
  const canEdit = Boolean(config?.token);

  useEffect(() => {
    const token = readStoredToken();
    if (token) {
      setConfig({ ...publicRepo, token });
    }
    void loadPublicData(Boolean(token));
  }, []);

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

  async function loadPublicData(editing = canEdit) {
    setLoading(true);
    try {
      const result = await readDbPublic(publicRepo);
      setDb(result.db);
      setNotice(
        editing
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
      const result = config?.token ? await readDb(config) : await readDbPublic(publicRepo);
      setDb(result.db);
      setNotice(
        canEdit
          ? `已同步 ${publicRepo.owner}/${publicRepo.repo} 的最新数据`
          : `已刷新公开数据`,
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function persist(nextDb: AppDb) {
    if (!canEdit || !config?.token) {
      setNotice('当前为只读模式，请填写 Token 后再编辑');
      return;
    }

    setDb(nextDb);
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    setSaving(true);
    setNotice('更改将在片刻后保存到 GitHub');
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const saved = await writeDb(config, nextDb);
          setDb(saved);
          setNotice('已保存到 GitHub');
        } catch (error) {
          setNotice(errorMessage(error));
        } finally {
          setSaving(false);
        }
      })();
    }, 650);
  }

  function askPrompt(options: Omit<PromptDialogState, 'onSubmit'> & { onSubmit: (value: string) => void }) {
    setPromptDialog(options);
  }

  function askConfirm(options: Omit<ConfirmDialogState, 'onConfirm'> & { onConfirm: () => void }) {
    setConfirmDialog(options);
  }

  async function connectWithToken(token: string) {
    const nextConfig: GithubConfig = { ...publicRepo, token: token.trim() };
    if (!nextConfig.token) return;

    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: nextConfig.token }));
    setConfig(nextConfig);
    setSettingsOpen(false);
    setLoading(true);

    try {
      const remote = await readDb(nextConfig);
      setDb(remote.db);
      setNotice(`编辑模式已开启：${publicRepo.owner}/${publicRepo.repo}`);
    } catch (error) {
      setNotice(errorMessage(error));
      setSettingsOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const selectedDeveloper = db.developers.find((item) => item.id === selectedDeveloperId);
  const selectedExecution = db.executions.find((item) => item.id === selectedExecutionId);

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
              <p className="mt-2 text-xs font-semibold text-slate-600">
                {canEdit ? '编辑模式' : '只读模式'}
              </p>
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
                {activeModule === 'products' && '产品开发'}
                {activeModule === 'execution' && '执行模块'}
                {activeModule === 'media' && '媒体库'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <MobileNav active={activeModule} onChange={setActiveModule} />
              <button className="btn btn-secondary shadow-sm" onClick={() => void loadRemote()}>
                {loading ? <Loader2 className="animate-spin text-slate-400" size={16} /> : <RefreshCw className="text-slate-500" size={16} />}
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

            {!canEdit && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
                <p>当前为只读浏览模式，访客无需配置即可查看内容。只有管理员填写 Token 后才能新增、编辑和上传资料。</p>
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
                onAskPrompt={askPrompt}
                onAskConfirm={askConfirm}
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
                onAskPrompt={askPrompt}
                onAskConfirm={askConfirm}
              />
            )}
            {activeModule === 'media' && (
              <MediaModule
                publicRepo={publicRepo}
                config={config}
                canEdit={canEdit}
                onAskConfirm={askConfirm}
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
          onSave={(token) => void connectWithToken(token)}
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

function ProductsModule({
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
  const products = db.products.filter((item) => item.developerId === selectedDeveloperId);

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
              onClick={() => onSelectDeveloper(developer.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-bold ${developer.id === selectedDeveloperId ? 'text-blue-700' : 'text-slate-700'}`}>{developer.name}</p>
                  <p className={`mt-1 text-xs font-medium ${developer.id === selectedDeveloperId ? 'text-blue-500' : 'text-slate-500'}`}>
                    {db.products.filter((item) => item.developerId === developer.id).length} 个产品
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton label="重命名" onClick={(event) => {
                      event.stopPropagation();
                      renameDeveloper(developer);
                    }}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton label="删除" danger onClick={(event) => {
                      event.stopPropagation();
                      deleteDeveloper(developer);
                    }}>
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
          <div className="grid gap-6 lg:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="glass-panel group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <div className="relative h-48 bg-slate-100">
                  {product.referenceImages[0] ? (
                    product.referenceImages[0].match(/\.(mp4|mov|webm|m4v)$/i) ? (
                      <video
                        className="h-full w-full object-cover"
                        src={resolveMediaUrl(publicRepo, product.referenceImages[0])}
                        muted
                        controls
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
                  {canEdit && (
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconButton label="编辑" onClick={() => onOpenProductModal({ developerId: selectedDeveloperId, product })}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton label="删除" danger onClick={() => deleteProduct(product)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h4 className="text-xl font-bold text-slate-900">{product.name}</h4>
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
                    <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
                      {product.referenceLinks.map((link) => (
                        <a
                          key={link.id}
                          className="group/link flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Link2 size={15} className="text-blue-400 group-hover/link:text-blue-600" />
                          <span className="truncate">{link.label || link.url}</span>
                          <ExternalLink size={13} className="ml-auto opacity-50 group-hover/link:opacity-100" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ExecutionModule({
  canEdit,
  db,
  selectedExecution,
  selectedExecutionId,
  onSelectExecution,
  onPersist,
  onAskPrompt,
  onAskConfirm,
}: {
  canEdit: boolean;
  db: AppDb;
  selectedExecution?: ExecutionPlan;
  selectedExecutionId: string;
  onSelectExecution: (id: string) => void;
  onPersist: (db: AppDb) => Promise<void>;
  onAskPrompt: (options: PromptDialogState) => void;
  onAskConfirm: (options: ConfirmDialogState) => void;
}) {
  function addExecution() {
    onAskPrompt({
      title: '新增执行方案',
      label: '方案名称',
      confirmLabel: '创建',
      onSubmit: (name) => {
        if (!name.trim()) return;
        const execution: ExecutionPlan = {
          id: newId(),
          name: name.trim(),
          plan: '',
          tasks: [],
          createdAt: now(),
        };
        onSelectExecution(execution.id);
        void onPersist({ ...db, executions: [...db.executions, execution] });
      },
    });
  }

  function updateExecution(execution: ExecutionPlan) {
    void onPersist({
      ...db,
      executions: db.executions.map((item) => (item.id === execution.id ? execution : item)),
    });
  }

  function deleteExecution(execution: ExecutionPlan) {
    onAskConfirm({
      title: '删除执行方案',
      message: `确定删除执行方案「${execution.name}」吗？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => {
        const executions = db.executions.filter((item) => item.id !== execution.id);
        onSelectExecution(executions[0]?.id ?? '');
        void onPersist({ ...db, executions });
      },
    });
  }

  function addTask() {
    if (!selectedExecution) return;
    onAskPrompt({
      title: '新增事项',
      label: '事项名称',
      confirmLabel: '添加',
      onSubmit: (title) => {
        if (!title.trim()) return;
        updateExecution({
          ...selectedExecution,
          tasks: [
            ...selectedExecution.tasks,
            { id: newId(), title: title.trim(), status: 'todo', feedback: '' },
          ],
        });
      },
    });
  }

  function updateTask(task: ExecutionTask) {
    if (!selectedExecution) return;
    updateExecution({
      ...selectedExecution,
      tasks: selectedExecution.tasks.map((item) => (item.id === task.id ? task : item)),
    });
  }

  function deleteTask(task: ExecutionTask) {
    if (!selectedExecution) return;
    onAskConfirm({
      title: '删除事项',
      message: `确定删除事项「${task.title}」吗？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => {
        updateExecution({
          ...selectedExecution,
          tasks: selectedExecution.tasks.filter((item) => item.id !== task.id),
        });
      },
    });
  }

  function moveTask(taskId: string, direction: -1 | 1) {
    if (!selectedExecution) return;
    const tasks = [...selectedExecution.tasks];
    const index = tasks.findIndex((task) => task.id === taskId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= tasks.length) return;
    [tasks[index], tasks[nextIndex]] = [tasks[nextIndex], tasks[index]];
    updateExecution({ ...selectedExecution, tasks });
  }

  const complete = selectedExecution?.tasks.filter((task) => task.status === 'done').length ?? 0;
  const total = selectedExecution?.tasks.length ?? 0;
  const progress = total ? Math.round((complete / total) * 100) : 0;

  return (
    <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="glass-panel rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">执行方案</h3>
            <p className="text-sm font-medium text-slate-500">独立于开发者和产品</p>
          </div>
          {canEdit && (
            <button className="btn btn-primary px-3.5 shadow-md" onClick={addExecution}>
              <Plus size={16} />
            </button>
          )}
        </div>
        <div className="space-y-3">
          {db.executions.length === 0 && (
            <EmptyState title="还没有执行方案" description="创建独立方案后即可添加事项与反馈。" />
          )}
          {db.executions.map((execution) => (
            <button
              key={execution.id}
              onClick={() => onSelectExecution(execution.id)}
              className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                execution.id === selectedExecutionId
                  ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-bold ${execution.id === selectedExecutionId ? 'text-blue-700' : 'text-slate-700'}`}>{execution.name}</p>
                  <p className={`mt-1 text-xs font-medium ${execution.id === selectedExecutionId ? 'text-blue-500' : 'text-slate-500'}`}>
                    {execution.tasks.filter((task) => task.status === 'done').length}/{execution.tasks.length} 已完成
                  </p>
                </div>
                {canEdit && (
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton label="删除" danger onClick={(event) => {
                      event.stopPropagation();
                      deleteExecution(execution);
                    }}>
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
        {!selectedExecution ? (
          <EmptyState title="请选择执行方案" description="执行模块是独立空间，不会关联产品或开发者。" />
        ) : (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 md:p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">方案名称</label>
                  <input
                    className="mt-2 w-full bg-transparent text-3xl font-extrabold tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
                    value={selectedExecution.name}
                    placeholder="输入方案名称..."
                    readOnly={!canEdit}
                    onChange={(event) => updateExecution({ ...selectedExecution, name: event.target.value })}
                  />
                </div>
                <div className="min-w-56 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between text-sm font-bold text-slate-700">
                    <span>完成进度</span>
                    <span className="text-blue-600">{progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 shadow-inner">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">执行方案描述</label>
              <textarea
                className="field mt-3 min-h-32 text-base leading-relaxed"
                value={selectedExecution.plan}
                placeholder="描述执行方案、策略、交付节奏或注意事项..."
                readOnly={!canEdit}
                onChange={(event) => updateExecution({ ...selectedExecution, plan: event.target.value })}
              />
            </div>

            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-extrabold text-slate-900">具体事项</h3>
              {canEdit && (
                <button className="btn btn-primary shadow-md" onClick={addTask}>
                  <Plus size={16} />
                  新增事项
                </button>
              )}
            </div>

            {selectedExecution.tasks.length === 0 ? (
              <EmptyState title="暂无事项" description="新增事项后可设置状态并填写反馈。" />
            ) : (
              <div className="grid gap-5">
                {selectedExecution.tasks.map((task, index) => (
                  <article key={task.id} className="glass-panel group rounded-2xl p-6 transition-all duration-200 hover:shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <input
                        className="min-w-0 flex-1 bg-transparent text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
                        value={task.title}
                        placeholder="输入事项标题..."
                        readOnly={!canEdit}
                        onChange={(event) => updateTask({ ...task, title: event.target.value })}
                      />
                      {canEdit && (
                        <div className="flex items-center gap-2 opacity-60 transition-opacity group-hover:opacity-100">
                          <button className="btn btn-secondary px-3 py-1.5 text-xs shadow-sm" onClick={() => moveTask(task.id, -1)} disabled={index === 0}>
                            上移
                          </button>
                          <button className="btn btn-secondary px-3 py-1.5 text-xs shadow-sm" onClick={() => moveTask(task.id, 1)} disabled={index === selectedExecution.tasks.length - 1}>
                            下移
                          </button>
                          <div className="ml-2">
                            <IconButton label="删除" danger onClick={() => deleteTask(task)}>
                              <Trash2 size={15} />
                            </IconButton>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {statuses.map((status) => (
                        <button
                          key={status.key}
                          disabled={!canEdit}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${
                            task.status === status.key
                              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          onClick={() => updateTask({ ...task, status: status.key })}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-5">
                      <textarea
                        className="field min-h-24 bg-slate-50/50 text-sm leading-relaxed focus:bg-white"
                        value={task.feedback}
                        placeholder="填写完成情况、问题反馈或下一步..."
                        readOnly={!canEdit}
                        onChange={(event) => updateTask({ ...task, feedback: event.target.value })}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function MediaModule({
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
        canEdit && config?.token
          ? await listMedia(config)
          : await listMediaPublic(publicRepo),
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
                <input className="hidden" type="file" multiple onChange={(event) => void handleUpload(event.target.files)} />
              </label>
            )}
            <button className="btn btn-secondary shadow-sm" onClick={() => void refresh()}>
              {loading ? <Loader2 className="animate-spin text-slate-400" size={16} /> : <RefreshCw className="text-slate-500" size={16} />}
              刷新
            </button>
          </div>
        </div>
        {message && <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">{message}</p>}
      </div>

      {assets.length === 0 ? (
        <EmptyState title="媒体库为空" description="上传图片或视频后，可在产品表单中选择或复制链接使用。" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article key={asset.path} className="glass-panel group overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <div className="relative h-56 bg-slate-100">
                {asset.type === 'image' && <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={asset.downloadUrl} alt={asset.name} />}
                {asset.type === 'video' && <video className="h-full w-full object-cover" src={asset.downloadUrl} controls />}
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
                  <button className="btn btn-secondary flex-1 text-sm shadow-sm" onClick={() => void navigator.clipboard.writeText(asset.downloadUrl)}>
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

function ProductModal({
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
      setError('请先连接 GitHub 后再上传文件。本地草稿会保存产品文字数据，但实际图片/视频需要上传到仓库 media/ 目录。');
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
          <input className="field text-lg font-bold" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="输入产品名称..." />
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
              {uploading ? <Loader2 className="animate-spin text-slate-400" size={16} /> : <Upload className="text-slate-500" size={16} />}
              上传到仓库
              <input className="hidden" type="file" multiple accept="image/*,video/*" onChange={(event) => void handleUpload(event.target.files)} />
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
                  onClick={() => setDraft({ ...draft, referenceImages: draft.referenceImages.filter((value) => value !== item) })}
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
            <input className="field" placeholder="链接名称 (可选)" value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} />
            <input className="field" placeholder="https://..." value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
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
                  onClick={() => setDraft({ ...draft, referenceLinks: draft.referenceLinks.filter((item) => item.id !== link.id) })}
                >
                  <span className="font-medium text-slate-700 truncate">{link.label || link.url}</span>
                  <span className="text-xs font-bold text-rose-500 opacity-0 transition-opacity group-hover:opacity-100">删除</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">硬件设备</span>
          <div className="flex gap-2.5">
            <input className="field" value={hardwareInput} onChange={(event) => setHardwareInput(event.target.value)} placeholder="如 Arduino、树莓派、传感器..." />
            <button
              className="btn btn-secondary shadow-sm"
              onClick={() => {
                if (!hardwareInput.trim()) return;
                setDraft({ ...draft, hardware: [...new Set([...draft.hardware, hardwareInput.trim()])] });
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
                  onClick={() => setDraft({ ...draft, hardware: draft.hardware.filter((value) => value !== item) })}
                >
                  {item} <span className="ml-1 opacity-50">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary shadow-md" onClick={submit}>保存产品</button>
        </div>
      </div>
    </Modal>
  );
}

function SettingsModal({
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

  const config: GithubConfig = { ...publicRepo, token: token.trim() };

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
          <p><span className="font-bold text-slate-700">Owner：</span>{publicRepo.owner}</p>
          <p className="mt-1"><span className="font-bold text-slate-700">Repo：</span>{publicRepo.repo}</p>
          <p className="mt-1"><span className="font-bold text-slate-700">Branch：</span>{publicRepo.branch}</p>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">Personal Access Token</span>
          <input className="field font-mono" value={token} onChange={(event) => setToken(event.target.value)} type="password" placeholder="github_pat_..." />
        </label>
        {message && <p className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100">
          <button className="btn btn-secondary shadow-sm" onClick={test} disabled={testing || !token.trim()}>
            {testing ? <Loader2 className="animate-spin text-slate-400" size={16} /> : <CheckCircle2 className="text-slate-500" size={16} />}
            测试 Token
          </button>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary shadow-md" onClick={() => onSave(token)} disabled={!token.trim()}>
            开启编辑
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PromptModal({
  title,
  label,
  defaultValue = '',
  confirmLabel = '确定',
  onClose,
  onSubmit,
}: PromptDialogState & { onClose: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">{label}</span>
          <input
            className="field"
            value={value}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSubmit(value);
            }}
          />
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary shadow-md" onClick={() => onSubmit(value)} disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel = '确定',
  danger,
  onClose,
  onConfirm,
}: ConfirmDialogState & { onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className={`btn shadow-md ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all">
      <div className="glass-panel max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl p-6 md:p-8 shadow-2xl scrollbar-soft">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-2xl font-extrabold text-slate-900">{title}</h3>
          <button className="btn btn-secondary px-4 shadow-sm" onClick={onClose}>关闭</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NavButton({
  icon,
  active,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`group flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition-all duration-200 ${
        active 
          ? 'bg-white shadow-sm ring-1 ring-slate-200/50' 
          : 'hover:bg-slate-200/50'
      }`}
      onClick={onClick}
    >
      <span className={`grid size-10 place-items-center rounded-xl transition-colors ${
        active 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
      }`}>
        {icon}
      </span>
      <span>
        <span className={`block font-bold ${active ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>{title}</span>
        <span className={`block text-xs font-medium ${active ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-500'}`}>{subtitle}</span>
      </span>
    </button>
  );
}

function MobileNav({ active, onChange }: { active: ModuleKey; onChange: (key: ModuleKey) => void }) {
  return (
    <select
      className="field block w-auto py-2 pr-8 font-bold text-slate-700 shadow-sm lg:hidden"
      value={active}
      onChange={(event) => onChange(event.target.value as ModuleKey)}
    >
      <option value="products">产品开发</option>
      <option value="execution">执行模块</option>
      <option value="media">媒体库</option>
    </select>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-panel rounded-2xl p-10 text-center border-dashed border-slate-300 bg-slate-50/50 shadow-none">
      <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm border border-slate-100">
        <ClipboardList size={28} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2.5 max-w-md text-sm font-medium leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function IconButton({
  label,
  danger,
  children,
  onClick,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className={`grid size-8 place-items-center rounded-full transition-all duration-200 ${
        danger 
          ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-500/20' 
          : 'bg-white/80 text-slate-500 shadow-sm border border-slate-200 hover:bg-slate-100 hover:text-slate-700'
      }`}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function resolveMediaUrl(repo: RepoRef, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return rawUrl(repo, pathOrUrl);
}

function readStoredToken() {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { token?: string } & Partial<GithubConfig>;
    return parsed.token?.trim() || null;
  } catch {
    localStorage.removeItem(CONFIG_KEY);
    return null;
  }
}

function shortName(value: string) {
  return value.split('/').pop() || value;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
