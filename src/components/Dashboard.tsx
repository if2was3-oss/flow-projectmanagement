import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Ellipsis,
  Folder,
  FolderOpen,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useFlow } from '../lib/store';
import type { Project, Task } from '../lib/types';
import { projectStatuses } from '../lib/types';
import { activeTasks, dateKey, formatDate, isOverdue, progress, relativeTime } from '../lib/utils';
import { TaskTable, type TaskFilter } from './Tasks';
import { Avatar, Empty, ProjectIcon } from './ui';
export function ProjectCard({
  project,
  onOpen,
  onEdit,
}: {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const data = useFlow().data!;
  const tasks = data.tasks.filter((t) => t.project_id === project.id);
  const people = data.members.filter(
    (m) => tasks.some((t) => t.assignee_id === m.id) || project.owner_id === m.id,
  );
  const percent = progress(project, data.tasks);
  return (
    <article className="project-card">
      <div className="project-card-top">
        <ProjectIcon project={project} />
        <span className={`project-state ${project.status}`}>
          <i />
          {projectStatuses[project.status]}
        </span>
        <button
          className="icon-button"
          aria-label={`Szerkesztés: ${project.name}`}
          onClick={onEdit}
        >
          <Ellipsis size={19} />
        </button>
      </div>
      <button className="project-card-title" onClick={onOpen}>
        {project.name}
        <ArrowUpRight size={17} />
      </button>
      <p>{project.description}</p>
      <div className="progress-label">
        <span>Előrehaladás</span>
        <strong>{percent}%</strong>
      </div>
      <div className={`progress-track ${project.color}`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="project-card-footer">
        <div className="avatar-stack">
          {people.slice(0, 3).map((m) => (
            <Avatar member={m} key={m.id} size="xs" />
          ))}
          {people.length > 3 && (
            <span className="avatar avatar-xs more-avatar">+{people.length - 3}</span>
          )}
        </div>
        <span>
          <CalendarDays size={13} />
          {formatDate(project.due_date)}
        </span>
        <span className="task-count">
          <CheckCircle2 size={13} />
          {tasks.filter((t) => t.status === 'done').length}/{tasks.length}
        </span>
      </div>
    </article>
  );
}
export function Dashboard({
  onProject,
  onEditProject,
  onNewProject,
  onNewTask,
  onTask,
  onTasks,
  onProjects,
}: {
  onProject: (id: string) => void;
  onEditProject: (p: Project) => void;
  onNewProject: () => void;
  onNewTask: () => void;
  onTask: (t: Task) => void;
  onTasks: (filter: TaskFilter) => void;
  onProjects: () => void;
}) {
  const flow = useFlow();
  const data = flow.data!;
  const tasks = activeTasks(data.projects, data.tasks);
  const current = data.members.find((m) => m.id === flow.currentUserId);
  const [tab, setTab] = useState<'today' | 'mine' | 'overdue'>('today');
  const active = data.projects.filter((p) => p.status === 'active');
  const today = tasks.filter((t) => t.due_date === dateKey() && t.status !== 'done');
  const overdue = tasks.filter(isOverdue);
  const done = tasks.filter((t) => t.status === 'done');
  const percentage = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const shown =
    tab === 'today'
      ? today
      : tab === 'overdue'
        ? overdue
        : tasks.filter((t) => t.assignee_id === flow.currentUserId && t.status !== 'done');
  const upcoming = tasks
    .filter((t) => t.due_date > dateKey() && t.status !== 'done')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 4);
  const hour = new Date().getHours();
  const greeting = hour < 10 ? 'Jó reggelt' : hour < 18 ? 'Szia' : 'Szép estét';
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="greeting">
            {greeting}, {current?.name.split(' ').slice(-1)[0] || 'alkotó'}!{' '}
            <span className="greeting-sun">☀</span>
          </div>
          <h1>Lássuk, mi van ma a fókuszban.</h1>
          <p>Egy helyen a projektek, a feladatok és a csapat lendülete.</p>
        </div>
        <button className="button secondary date-button" onClick={() => onTasks('today')}>
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date())}
        </button>
      </div>
      <div className="stats-grid">
        {[
          {
            label: 'Aktív projektek',
            value: active.length,
            icon: FolderOpen,
            color: 'peach',
            foot: 'Itt születnek a jó ötletek',
            click: onProjects,
          },
          {
            label: 'Mai feladatok',
            value: today.length,
            icon: CheckCircle2,
            color: 'blue',
            foot: 'Apró lépések, nagy haladás',
            click: () => onTasks('today'),
          },
          {
            label: 'Lejárt feladatok',
            value: overdue.length,
            icon: Clock3,
            color: 'rose',
            foot: overdue.length ? 'Egy kis figyelmet kérnek' : 'Minden határidő rendben',
            click: () => onTasks('overdue'),
          },
          {
            label: 'Befejezett feladatok',
            value: done.length,
            icon: TrendingUp,
            color: 'sage',
            foot: `Az összes feladat ${percentage}%-a`,
            click: () => onTasks('all'),
          },
        ].map((stat) => (
          <button className="stat-card" onClick={stat.click} key={stat.label}>
            <div className="stat-top">
              <span>{stat.label}</span>
              <span className={`stat-icon ${stat.color}`}>
                <stat.icon size={19} />
              </span>
            </div>
            <div className="stat-value">
              {stat.value}
              <ArrowUpRight size={18} />
            </div>
            <div className="stat-foot">
              {stat.color === 'sage' && <span className="green-dot" />}
              {stat.foot}
            </div>
          </button>
        ))}
      </div>
      <section className="projects-section">
        <div className="section-title">
          <div className="title-with-count">
            <h2>Aktív projektek</h2>
            <span className="count">{active.length}</span>
          </div>
          <button className="text-button" onClick={onProjects}>
            Összes projekt
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="project-grid">
          {active.slice(0, 3).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => onProject(project.id)}
              onEdit={() => onEditProject(project)}
            />
          ))}
          {active.length === 0 && (
            <Empty
              icon={<Folder size={28} />}
              title="Az első projekt itt kezdődik."
              description="Hozd létre, és hívd életre az ötleteket."
              action={
                <button className="button primary" onClick={onNewProject}>
                  <Plus size={16} />
                  Új projekt
                </button>
              }
            />
          )}
        </div>
      </section>
      <div className="dashboard-lower">
        <div className="dashboard-main">
          <section className="panel daily-panel">
            <div className="panel-heading">
              <div className="title-with-count">
                <h2>A következő lépések</h2>
                <span className="tiny-badge">TARTSD A FÓKUSZT</span>
              </div>
              <button className="text-button" onClick={onNewTask}>
                <Plus size={15} />
                Új feladat
              </button>
            </div>
            <div className="daily-tabs">
              <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
                Ma esedékes<span>{today.length}</span>
              </button>
              <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
                Saját feladataim
              </button>
              <button
                className={tab === 'overdue' ? 'active' : ''}
                onClick={() => setTab('overdue')}
              >
                Lejárt<span className="red-count">{overdue.length}</span>
              </button>
            </div>
            <TaskTable tasks={shown.slice(0, 5)} onOpen={onTask} compact />
            <button className="panel-bottom-link" onClick={() => onTasks(tab)}>
              {shown.length > 5
                ? `Mind a ${shown.length} feladat megtekintése`
                : 'Összes feladat megtekintése'}
              <ArrowRight size={14} />
            </button>
          </section>
          <section className="panel activity-panel">
            <div className="panel-heading">
              <h2>Ez történt a csapatban</h2>
              <span className="muted">Legutóbbi aktivitás</span>
            </div>
            <div className="activity-list">
              {data.activity.slice(0, 4).map((a) => (
                <div className="activity-item" key={a.id}>
                  <Avatar member={data.members.find((m) => m.id === a.actor_id)} />
                  <div>
                    <p>
                      <strong>
                        {data.members.find((m) => m.id === a.actor_id)?.name || 'Csapattag'}
                      </strong>{' '}
                      {a.message}
                    </p>
                    <span>{relativeTime(a.created_at)}</span>
                  </div>
                  <span className="activity-dot" />
                </div>
              ))}
              {data.activity.length === 0 && (
                <Empty
                  title="A közös történet most kezdődik."
                  description="A csapat frissítései itt jelennek majd meg."
                />
              )}
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="panel deadlines-panel">
            <div className="panel-heading">
              <h2>Közelgő határidők</h2>
              <CalendarDays size={17} />
            </div>
            <div className="deadline-list">
              {upcoming.map((task) => {
                const project = data.projects.find((p) => p.id === task.project_id);
                return (
                  <button key={task.id} className="deadline-item" onClick={() => onTask(task)}>
                    <span className={`deadline-date ${project?.color}`}>
                      <small>
                        {new Date(task.due_date + 'T12:00:00')
                          .toLocaleDateString('hu-HU', { month: 'short' })
                          .replace('.', '')}
                      </small>
                      <strong>{Number(task.due_date.slice(-2))}</strong>
                    </span>
                    <span className="deadline-text">
                      <strong>{task.title}</strong>
                      <small>
                        <i className={project?.color} />
                        {project?.name}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                );
              })}
              {upcoming.length === 0 && (
                <Empty title="Szabad a horizont." description="Nincs közelgő határidő." />
              )}
            </div>
            <button className="panel-bottom-link" onClick={() => onTasks('upcoming')}>
              Minden határidő
              <ArrowRight size={14} />
            </button>
          </section>
          <section className="momentum-card">
            <div className="momentum-top">
              <span className="momentum-icon">
                <Sparkles size={19} />
              </span>
              <span>CSAPATLENDÜLET</span>
            </div>
            <div className="momentum-content">
              <div>
                <h3>Jó úton jártok!</h3>
                <p>
                  {done.length} feladat már mögöttetek.
                  <br />
                  Minden kis lépés számít.
                </p>
              </div>
              <div
                className="donut"
                style={{ background: `conic-gradient(#6b876e ${percentage}%, #e0e7dc 0)` }}
              >
                <span>
                  {percentage}
                  <small>%</small>
                </span>
              </div>
            </div>
            <div className="momentum-bottom">
              <span className="green-dot" />
              Együtt könnyebb haladni.
            </div>
          </section>
        </aside>
      </div>
      <footer className="dashboard-footer">
        <span>Egy kis rend. Több hely az ötleteknek.</span>
        <span>
          flow<span className="brand-period">.</span>
        </span>
      </footer>
    </>
  );
}
