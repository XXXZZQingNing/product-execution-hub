import { Plus, Trash2 } from 'lucide-react';
import type { AppDb, ExecutionPlan, ExecutionTask } from '../../types';
import type { ConfirmDialogState, PromptDialogState } from '../../types/ui';
import { statuses } from '../../constants';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { newId, now } from '../../lib/utils';

export function ExecutionModule({
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
                  <p
                    className={`font-bold ${execution.id === selectedExecutionId ? 'text-blue-700' : 'text-slate-700'}`}
                  >
                    {execution.name}
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium ${execution.id === selectedExecutionId ? 'text-blue-500' : 'text-slate-500'}`}
                  >
                    {execution.tasks.filter((task) => task.status === 'done').length}/{execution.tasks.length} 已完成
                  </p>
                </div>
                {canEdit && (
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton
                      label="删除"
                      danger
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteExecution(execution);
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
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
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
                  <article
                    key={task.id}
                    className="glass-panel group rounded-2xl p-6 transition-all duration-200 hover:shadow-md"
                  >
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
                          <button
                            className="btn btn-secondary px-3 py-1.5 text-xs shadow-sm"
                            onClick={() => moveTask(task.id, -1)}
                            disabled={index === 0}
                          >
                            上移
                          </button>
                          <button
                            className="btn btn-secondary px-3 py-1.5 text-xs shadow-sm"
                            onClick={() => moveTask(task.id, 1)}
                            disabled={index === selectedExecution.tasks.length - 1}
                          >
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
