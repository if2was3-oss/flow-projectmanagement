import {
  ArrowDownUp,
  CalendarDays,
  ClipboardList,
  Columns3,
  GanttChart,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { useFlow } from '../lib/store';
import type { Status, Task } from '../lib/types';
import { statuses } from '../lib/types';
import {
  activeTasks,
  dateKey,
  errorMessage,
  formatDate,
  isOverdue,
  offsetDate,
} from '../lib/utils';
import { Avatar, Empty, PriorityBadge, StatusBadge, TaskCircle } from './ui';
export function TaskTable({
  tasks,
  onOpen,
  compact = false,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  compact?: boolean;
}) {
  const flow = useFlow();
  const data = flow.data!;
  const [saving, setSaving] = useState<string | null>(null);
  async function toggle(task: Task) {
    if (saving) return;
    setSaving(task.id);
    try {
      await flow.save(
        'tasks',
        { id: task.id, status: task.status === 'done' ? 'todo' : 'done' },
        `${task.status === 'done' ? 'újranyitotta' : 'befejezte'}: ${task.title}`,
      );
    } catch (e) {
      flow.setError(errorMessage(e));
    } finally {
      setSaving(null);
    }
  }
  return (
    <div className="table-scroll">
      <table className={`task-table ${compact ? 'compact' : ''}`}>
        <thead>
          <tr>
            <th className="task-title-cell">Feladat neve</th>
            <th>Projekt</th>
            <th>Határidő</th>
            <th>Prioritás</th>
            <th>Felelős</th>
            {!compact && <th>Állapot</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const project = data.projects.find((p) => p.id === task.project_id);
            return (
              <tr key={task.id} className={task.status === 'done' ? 'done-row' : ''}>
                <td>
                  <div className="task-name">
                    <TaskCircle
                      status={task.status}
                      onClick={() => void toggle(task)}
                      title={task.title}
                    />
                    <button className="task-link" onClick={() => onOpen(task)}>
                      {task.title}
                    </button>
                  </div>
                </td>
                <td>
                  <span className={`project-label ${project?.color}`}>
                    <i />
                    {project?.name}
                  </span>
                </td>
                <td>
                  <span className={`due-date ${isOverdue(task) ? 'overdue' : ''}`}>
                    {task.due_date === dateKey() ? 'Ma' : formatDate(task.due_date)}
                  </span>
                </td>
                <td>
                  <PriorityBadge value={task.priority} />
                </td>
                <td>
                  <Avatar member={data.members.find((m) => m.id === task.assignee_id)} size="xs" />
                </td>
                {!compact && (
                  <td>
                    <StatusBadge value={task.status} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <Empty
          icon={<CheckIllustration />}
          title="Minden rendben ezen a listán."
          description="Nincs a szűrésnek megfelelő feladat."
        />
      )}
    </div>
  );
}
function CheckIllustration() {
  return <ClipboardList size={30} />;
}
export type TaskFilter = 'all' | 'today' | 'overdue' | 'mine' | 'upcoming';
export function TasksPage({
  onOpen,
  onNew,
  projectId,
  onProjectChange,
  initialFilter = 'all',
  initialAssignee = 'all',
  onEditProject,
}: {
  onOpen: (task: Task) => void;
  onNew: () => void;
  projectId: string;
  onProjectChange: (id: string) => void;
  initialFilter?: TaskFilter;
  initialAssignee?: string;
  onEditProject: () => void;
}) {
  const flow = useFlow();
  const data = flow.data!;
  const [view, setView] = useState<'list' | 'board' | 'timeline'>('list');
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [sort, setSort] = useState(false);
  const [showFilters, setShowFilters] = useState(initialAssignee !== 'all');
  const [assignee, setAssignee] = useState(initialAssignee);
  let tasks = activeTasks(data.projects, data.tasks).filter(
    (t) =>
      (!projectId || t.project_id === projectId) &&
      t.title.toLocaleLowerCase('hu').includes(query.toLocaleLowerCase('hu')) &&
      (priority === 'all' || t.priority === priority) &&
      (assignee === 'all' || t.assignee_id === assignee),
  );
  if (filter === 'today')
    tasks = tasks.filter((t) => t.due_date === dateKey() && t.status !== 'done');
  if (filter === 'overdue') tasks = tasks.filter(isOverdue);
  if (filter === 'mine') tasks = tasks.filter((t) => t.assignee_id === flow.currentUserId);
  if (filter === 'upcoming')
    tasks = tasks.filter((t) => t.due_date >= dateKey() && t.status !== 'done');
  if (sort) tasks = [...tasks].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const project = data.projects.find((p) => p.id === projectId);
  async function move(id: string, status: Status) {
    try {
      await flow.save(
        'tasks',
        { id, status },
        `módosította egy feladat állapotát: ${statuses[status]}`,
      );
    } catch (e) {
      flow.setError(errorMessage(e));
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EGY LÉPÉSSEL KÖZELEBB</div>
          <h1>{project?.name || 'Feladatok'}</h1>
          <p>{project?.description || 'Minden teendő, egy átlátható helyen.'}</p>
        </div>
        <div className="heading-actions">
          {project && (
            <button className="button secondary" onClick={onEditProject}>
              Projekt szerkesztése
            </button>
          )}
          <button className="button primary" onClick={onNew}>
            <Plus size={17} />
            Új feladat
          </button>
        </div>
      </div>
      <div className="view-toolbar">
        <div className="view-tabs">
          {(
            [
              { key: 'list', label: 'Lista', icon: List },
              { key: 'board', label: 'Tábla', icon: Columns3 },
              { key: 'timeline', label: 'Idővonal', icon: GanttChart },
            ] as const
          ).map((v) => (
            <button
              key={v.key}
              className={view === v.key ? 'active' : ''}
              onClick={() => setView(v.key)}
            >
              <v.icon size={16} />
              {v.label}
            </button>
          ))}
        </div>
        <span className="muted">{tasks.length} feladat</span>
      </div>
      <div className="panel task-panel">
        <div className="task-filters">
          <div className="filter-tabs">
            {(
              [
                { id: 'all', name: 'Összes' },
                { id: 'today', name: 'Mai' },
                { id: 'overdue', name: 'Lejárt' },
                { id: 'mine', name: 'Saját feladataim' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? 'active' : ''}
                onClick={() => setFilter(f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="filter-actions">
            <div className="input-search">
              <Search size={15} />
              <input
                aria-label="Feladat keresése"
                placeholder="Keresés…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              className={`icon-button bordered ${showFilters ? 'selected' : ''}`}
              aria-label="További szűrők"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              className={`icon-button bordered ${sort ? 'selected' : ''}`}
              aria-label="Rendezés határidő szerint"
              onClick={() => setSort(!sort)}
            >
              <ArrowDownUp size={16} />
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="extra-filters">
            <label>
              Projekt
              <select value={projectId} onChange={(e) => onProjectChange(e.target.value)}>
                <option value="">Minden projekt</option>
                {data.projects
                  .filter((p) => p.status !== 'archived')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Prioritás
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="all">Minden prioritás</option>
                <option value="high">Magas</option>
                <option value="medium">Normál</option>
                <option value="low">Alacsony</option>
              </select>
            </label>
            <label>
              Felelős
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="all">Minden csapattag</option>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {view === 'list' && <TaskTable tasks={tasks} onOpen={onOpen} />}
        {view === 'board' && (
          <div className="kanban">
            {(Object.keys(statuses) as Status[]).map((status) => (
              <div
                className={`kanban-column column-${status}`}
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain');
                  if (tasks.some((t) => t.id === id)) void move(id, status);
                }}
              >
                <div className="kanban-heading">
                  <span className="column-dot" />
                  <h3>{statuses[status]}</h3>
                  <span className="count">{tasks.filter((t) => t.status === status).length}</span>
                  <button className="icon-button" aria-label="Új feladat" onClick={onNew}>
                    <Plus size={15} />
                  </button>
                </div>
                {tasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <article
                      className="kanban-card"
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                    >
                      <span
                        className={`project-label ${data.projects.find((p) => p.id === task.project_id)?.color}`}
                      >
                        {data.projects.find((p) => p.id === task.project_id)?.name}
                      </span>
                      <button className="kanban-title" onClick={() => onOpen(task)}>
                        {task.title}
                      </button>
                      <PriorityBadge value={task.priority} />
                      <div className="kanban-card-bottom">
                        <span className={isOverdue(task) ? 'overdue' : ''}>
                          <CalendarDays size={13} />
                          {formatDate(task.due_date)}
                        </span>
                        <Avatar
                          member={data.members.find((m) => m.id === task.assignee_id)}
                          size="xs"
                        />
                      </div>
                      <select
                        aria-label={`Állapot: ${task.title}`}
                        value={task.status}
                        onChange={(e) => void move(task.id, e.target.value as Status)}
                      >
                        {Object.entries(statuses).map(([key, value]) => (
                          <option key={key} value={key}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                {tasks.filter((t) => t.status === status).length === 0 && (
                  <div className="kanban-empty">Húzz ide egy feladatot</div>
                )}
              </div>
            ))}
          </div>
        )}
        {view === 'timeline' && <Timeline tasks={tasks} onOpen={onOpen} />}
      </div>
    </>
  );
}
function Timeline({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  const flow = useFlow();
  const data = flow.data!;
  const [week, setWeek] = useState(0);
  const days = Array.from({ length: 14 }, (_, i) => offsetDate(week * 7 + i - 2));
  return (
    <div className="timeline-wrap">
      <div className="timeline-controls">
        <button className="button secondary small-button" onClick={() => setWeek(week - 1)}>
          ← Előző hét
        </button>
        <span>
          {formatDate(days[0])} – {formatDate(days[13])}
        </span>
        <button className="button secondary small-button" onClick={() => setWeek(week + 1)}>
          Következő hét →
        </button>
      </div>
      <div className="timeline-scroll">
        <div className="timeline">
          <div className="timeline-head">
            <strong>Feladat / határidő</strong>
            {days.map((day) => (
              <span key={day} className={day === dateKey() ? 'today-col' : ''}>
                {new Date(day + 'T12:00:00').toLocaleDateString('hu-HU', { weekday: 'short' })}
                <b>{Number(day.slice(-2))}</b>
              </span>
            ))}
          </div>
          {tasks
            .filter((t) => t.due_date >= days[0] && t.due_date <= days[13])
            .map((task) => (
              <div className="timeline-row" key={task.id}>
                <button onClick={() => onOpen(task)}>{task.title}</button>
                {days.map((day) => (
                  <div key={day} className={day === dateKey() ? 'today-col' : ''}>
                    {day === task.due_date && (
                      <button
                        title={task.title}
                        aria-label={`${task.title}: ${formatDate(task.due_date)}`}
                        onClick={() => onOpen(task)}
                        className={`timeline-marker ${data.projects.find((p) => p.id === task.project_id)?.color}`}
                      >
                        <span />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          {!tasks.some((t) => t.due_date >= days[0] && t.due_date <= days[13]) && (
            <Empty title="Erre az időszakra nincs határidő." />
          )}
        </div>
      </div>
    </div>
  );
}
