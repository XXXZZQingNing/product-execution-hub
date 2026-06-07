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
  TaskStatus,
} from './types';
import {
  deleteMedia,
  emptyDb,
  listMedia,
  rawUrl,
  readDb,
  testGithubConnection,
  uploadMedia,
  writeDb,
} from './lib/github';

type ModuleKey = 'products' | 'execution' | 'media';
type ProductDraft = Omit<Product, 'id' | 'developerId' | 'createdAt'>;

const CONFIG_KEY = 'product-execution-hub.github-config';
const LOCAL_DB_KEY = 'product-execution-hub.local-db';
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
  const [activeModule, setActiveModule] = useState<ModuleKey>('products');
  const [db, setDb] = useState<AppDb>(() => emptyDb());
  const [config, setConfig] = useState<GithubConfig | null>(null);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>('');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [productModal, setProductModal] = useState<{
    developerId: string;
    product?: Product;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('未连接 GitHub');
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      const localDb = readLocalDb();
      if (localDb) {
        setDb(localDb);
        setNotice('正在使用本地草稿，连接 GitHub 后可写入仓库');
      } else {
        setNotice('未连接 GitHub，可先使用本地草稿');
      }
      return;
    }

    const parsed = JSON.parse(raw) as GithubConfig;
    setConfig(parsed);
    void loadRemote(parsed);
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

  async function loadRemote(nextConfig = config) {
    if (!nextConfig) {
      const localDb = readLocalDb();
      if (localDb) {
        setDb(localDb);
        setNotice('已从本地草稿恢复数据');
      } else {
        setNotice('未连接 GitHub，也没有本地草稿');
      }
      return;
    }
    setLoading(true);
    try {
      const result = await readDb(nextConfig);
      setDb(result.db);
      setNotice(`已连接 ${nextConfig.owner}/${nextConfig.repo}`);
    } catch (error) {
      setNotice(errorMessage(error));
      setSettingsOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function persist(nextDb: AppDb) {
    setDb(nextDb);
    if (!config) {
      saveLocalDb(nextDb);
      setNotice('已保存为本地草稿，连接 GitHub 后可写入仓库');
      return;
    }

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

  async function connectAndSync(nextConfig: GithubConfig) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(nextConfig));
    setConfig(nextConfig);
    setSettingsOpen(false);
    setLoading(true);

    try {
      const localDb = readLocalDb() ?? db;
      const remote = await readDb(nextConfig);
      const shouldSeedRemote =
        hasDbContent(localDb) &&
        (!hasDbContent(remote.db) ||
          window.confirm('检测到 GitHub 仓库已有数据。是否用当前本地草稿覆盖仓库里的 data/db.json？选择“取消”则读取仓库数据。'));

      if (shouldSeedRemote) {
        const saved = await writeDb(nextConfig, localDb);
        setDb(saved);
        saveLocalDb(saved);
        setNotice(
          hasDbContent(remote.db)
            ? '本地草稿已覆盖 GitHub 仓库数据'
            : '本地草稿已写入空仓库，作为初始数据保存',
        );
      } else {
        setDb(remote.db);
        saveLocalDb(remote.db);
        setNotice(
          hasDbContent(remote.db)
            ? `已连接 ${nextConfig.owner}/${nextConfig.repo} 并读取仓库数据`
            : `已连接空仓库 ${nextConfig.owner}/${nextConfig.repo}，创建数据后会自动保存`,
        );
      }
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
              <button className="btn btn-secondary mt-4 w-full text-sm" onClick={() => setSettingsOpen(true)}>
                <Settings size={15} />
                连接设置
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

            {!config && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <p>首次使用需要连接 GitHub 仓库，才能把数据同步到云端。你也可以先关闭此提示，在本地创建草稿。</p>
                <button className="btn btn-primary shrink-0" onClick={() => setSettingsOpen(true)}>
                  <Settings size={16} />
                  连接 GitHub
                </button>
              </div>
            )}

            {activeModule === 'products' && (
              <ProductsModule
                config={config}
                db={db}
                selectedDeveloper={selectedDeveloper}
                selectedDeveloperId={selectedDeveloperId}
                onSelectDeveloper={setSelectedDeveloperId}
                onPersist={persist}
                onOpenProductModal={setProductModal}
              />
            )}
            {activeModule === 'execution' && (
              <ExecutionModule
                db={db}
                selectedExecution={selectedExecution}
                selectedExecutionId={selectedExecutionId}
                onSelectExecution={setSelectedExecutionId}
                onPersist={persist}
              />
            )}
            {activeModule === 'media' && <MediaModule config={config} />}
          </div>
        </main>
      </div>

      {settingsOpen && (
        <SettingsModal
          initial={config}
          onClose={() => setSettingsOpen(false)}
          onSave={(nextConfig) => void connectAndSync(nextConfig)}
        />
      )}

      {productModal && (
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
  config,
  db,
  selectedDeveloper,
  selectedDeveloperId,
  onSelectDeveloper,
  onPersist,
  onOpenProductModal,
}: {
  config: GithubConfig | null;
  db: AppDb;
  selectedDeveloper?: Developer;
  selectedDeveloperId: string;
  onSelectDeveloper: (id: string) => void;
  onPersist: (db: AppDb) => Promise<void>;
  onOpenProductModal: (payload: { developerId: string; product?: Product }) => void;
}) {
  const products = db.products.filter((item) => item.developerId === selectedDeveloperId);

  function addDeveloper() {
    const name = window.prompt('请输入开发者名称');
    if (!name?.trim()) return;
    const developer: Developer = {
      id: newId(),
      name: name.trim(),
      note: '',
      createdAt: now(),
    };
    onSelectDeveloper(developer.id);
    void onPersist({ ...db, developers: [...db.developers, developer] });
  }

  function renameDeveloper(developer: Developer) {
    const name = window.prompt('修改开发者名称', developer.name);
    if (!name?.trim()) return;
    void onPersist({
      ...db,
      developers: db.developers.map((item) =>
        item.id === developer.id ? { ...item, name: name.trim() } : item,
      ),
    });
  }

  function deleteDeveloper(developer: Developer) {
    if (!window.confirm(`删除开发者「${developer.name}」及其所有产品？`)) return;
    const developers = db.developers.filter((item) => item.id !== developer.id);
    const products = db.products.filter((item) => item.developerId !== developer.id);
    onSelectDeveloper(developers[0]?.id ?? '');
    void onPersist({ ...db, developers, products });
  }

  function deleteProduct(product: Product) {
    if (!window.confirm(`删除产品「${product.name}」？`)) return;
    void onPersist({ ...db, products: db.products.filter((item) => item.id !== product.id) });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="glass-panel rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">开发者</h3>
            <p className="text-sm font-medium text-slate-500">产品挂载在开发者下</p>
          </div>
          <button className="btn btn-primary px-3.5 shadow-md" onClick={addDeveloper}>
            <UserPlus size={16} />
          </button>
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
          <button
            className="btn btn-primary shadow-md"
            disabled={!selectedDeveloperId}
            onClick={() => onOpenProductModal({ developerId: selectedDeveloperId })}
          >
            <PackagePlus size={18} />
            新增产品
          </button>
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
                        src={resolveMediaUrl(config, product.referenceImages[0])}
                        muted
                        controls
                      />
                    ) : (
                      <img
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={resolveMediaUrl(config, product.referenceImages[0])}
                        alt={product.name}
                      />
                    )
                  ) : (
                    <div className="grid h-full place-items-center text-slate-300">
                      <ImagePlus size={40} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton label="编辑" onClick={() => onOpenProductModal({ developerId: selectedDeveloperId, product })}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton label="删除" danger onClick={() => deleteProduct(product)}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
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
  db,
  selectedExecution,
  selectedExecutionId,
  onSelectExecution,
  onPersist,
}: {
  db: AppDb;
  selectedExecution?: ExecutionPlan;
  selectedExecutionId: string;
  onSelectExecution: (id: string) => void;
  onPersist: (db: AppDb) => Promise<void>;
}) {
  function addExecution() {
    const name = window.prompt('请输入执行方案名称');
    if (!name?.trim()) return;
    const execution: ExecutionPlan = {
      id: newId(),
      name: name.trim(),
      plan: '',
      tasks: [],
      createdAt: now(),
    };
    onSelectExecution(execution.id);
    void onPersist({ ...db, executions: [...db.executions, execution] });
  }

  function updateExecution(execution: ExecutionPlan) {
    void onPersist({
      ...db,
      executions: db.executions.map((item) => (item.id === execution.id ? execution : item)),
    });
  }

  function deleteExecution(execution: ExecutionPlan) {
    if (!window.confirm(`删除执行方案「${execution.name}」？`)) return;
    const executions = db.executions.filter((item) => item.id !== execution.id);
    onSelectExecution(executions[0]?.id ?? '');
    void onPersist({ ...db, executions });
  }

  function addTask() {
    if (!selectedExecution) return;
    const title = window.prompt('请输入事项名称');
    if (!title?.trim()) return;
    updateExecution({
      ...selectedExecution,
      tasks: [
        ...selectedExecution.tasks,
        { id: newId(), title: title.trim(), status: 'todo', feedback: '' },
      ],
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
    if (!selectedExecution || !window.confirm(`删除事项「${task.title}」？`)) return;
    updateExecution({
      ...selectedExecution,
      tasks: selectedExecution.tasks.filter((item) => item.id !== task.id),
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
          <button className="btn btn-primary px-3.5 shadow-md" onClick={addExecution}>
            <Plus size={16} />
          </button>
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
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <IconButton label="删除" danger onClick={(event) => {
                    event.stopPropagation();
                    deleteExecution(execution);
                  }}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
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
                onChange={(event) => updateExecution({ ...selectedExecution, plan: event.target.value })}
              />
            </div>

            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-extrabold text-slate-900">具体事项</h3>
              <button className="btn btn-primary shadow-md" onClick={addTask}>
                <Plus size={16} />
                新增事项
              </button>
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
                        onChange={(event) => updateTask({ ...task, title: event.target.value })}
                      />
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
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {statuses.map((status) => (
                        <button
                          key={status.key}
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

function MediaModule({ config }: { config: GithubConfig | null }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    if (!config) {
      setMessage('请先连接 GitHub 仓库后再管理媒体文件。本地草稿会保存文字数据，但不会保存实际图片/视频文件。');
      return;
    }
    setLoading(true);
    try {
      setAssets(await listMedia(config));
      setMessage('媒体库已同步');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [config?.owner, config?.repo, config?.branch]);

  async function handleUpload(files: FileList | null) {
    if (!config || !files?.length) return;
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

  async function handleDelete(asset: MediaAsset) {
    if (!config || !window.confirm(`删除媒体文件「${asset.name}」？`)) return;
    setLoading(true);
    try {
      await deleteMedia(config, asset);
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
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
            <label className="btn btn-primary cursor-pointer shadow-md">
              <Upload size={16} />
              上传文件
              <input className="hidden" type="file" multiple onChange={(event) => void handleUpload(event.target.files)} />
            </label>
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
                  <button className="btn btn-danger px-3 shadow-sm" onClick={() => void handleDelete(asset)}>
                    <Trash2 size={15} />
                  </button>
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
  initial,
  onClose,
  onSave,
}: {
  initial: GithubConfig | null;
  onClose: () => void;
  onSave: (config: GithubConfig) => void;
}) {
  const [owner, setOwner] = useState(initial?.owner ?? '');
  const [repo, setRepo] = useState(initial?.repo ?? '');
  const [branch, setBranch] = useState(initial?.branch ?? 'main');
  const [token, setToken] = useState(initial?.token ?? '');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  const config: GithubConfig = {
    owner: owner.trim(),
    repo: repo.trim(),
    branch: branch.trim() || 'main',
    token: token.trim(),
  };

  async function test() {
    setTesting(true);
    try {
      await testGithubConnection(config);
      setMessage('连接成功。若仓库为空，保存数据时会自动创建 data/db.json。');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal title="连接 GitHub 仓库" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm leading-relaxed text-amber-800 shadow-sm backdrop-blur-sm">
          需要一个具备 Contents 读写权限的 Personal Access Token。若仓库是公开仓库，数据与上传媒体也会公开可访问。
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">Owner</span>
            <input className="field" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="GitHub 用户名或组织" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">Repo</span>
            <input className="field" value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="仓库名" />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">Branch</span>
          <input className="field" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="main" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">Personal Access Token</span>
          <input className="field font-mono" value={token} onChange={(event) => setToken(event.target.value)} type="password" placeholder="github_pat_..." />
        </label>
        {message && <p className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100">
          <button className="btn btn-secondary shadow-sm" onClick={test} disabled={testing}>
            {testing ? <Loader2 className="animate-spin text-slate-400" size={16} /> : <CheckCircle2 className="text-slate-500" size={16} />}
            测试连接
          </button>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary shadow-md" onClick={() => onSave(config)}>保存并同步</button>
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

function resolveMediaUrl(config: GithubConfig | null, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return config ? rawUrl(config, pathOrUrl) : pathOrUrl;
}

function shortName(value: string) {
  return value.split('/').pop() || value;
}

function readLocalDb() {
  const raw = localStorage.getItem(LOCAL_DB_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppDb;
  } catch {
    localStorage.removeItem(LOCAL_DB_KEY);
    return null;
  }
}

function saveLocalDb(db: AppDb) {
  localStorage.setItem(
    LOCAL_DB_KEY,
    JSON.stringify({ ...db, updatedAt: new Date().toISOString() }),
  );
}

function hasDbContent(db: AppDb) {
  return db.developers.length > 0 || db.products.length > 0 || db.executions.length > 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
