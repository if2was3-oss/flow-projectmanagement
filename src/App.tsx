import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  Layers3,
  LayoutDashboard,
  ListTodo,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Auth, WorkspaceSetup } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { InviteEditor, ProjectEditor, TaskEditor } from './components/Editors';
import { CalendarPage, FilesPage, ProjectsPage, SettingsPage, TeamPage } from './components/Pages';
import { TasksPage, type TaskFilter } from './components/Tasks';
import { Avatar, Empty, Modal, ProjectIcon } from './components/ui';
import { useFlow } from './lib/store';
import { supabase } from './lib/supabase';
import type { Project, Task } from './lib/types';
import { activeTasks, errorMessage, relativeTime } from './lib/utils';
type Page = 'dashboard' | 'projects' | 'tasks' | 'calendar' | 'team' | 'files' | 'settings';
const navigation = [
  { id: 'dashboard', label: 'Áttekintés', icon: LayoutDashboard },
  { id: 'projects', label: 'Projektek', icon: FolderOpen },
  { id: 'tasks', label: 'Feladatok', icon: ListTodo },
  { id: 'calendar', label: 'Naptár', icon: CalendarDays },
  { id: 'team', label: 'Csapat', icon: Users },
  { id: 'files', label: 'Fájlok', icon: FileText },
] as const;
export default function App() {
  const flow = useFlow();
  const [page, setPage] = useState<Page>('dashboard');
  const [projectFilter, setProjectFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [taskKey, setTaskKey] = useState(0);
  const [editor, setEditor] = useState<'project' | 'task' | 'invite' | null>(null);
  const [editingProject, setEditingProject] = useState<Project>();
  const [editingTask, setEditingTask] = useState<Task>();
  const [newTaskDate, setNewTaskDate] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
      if (e.key === 'Escape') {
        setNewMenu(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
  useEffect(() => {
    document.title = `${page === 'settings' ? 'Beállítások' : navigation.find((n) => n.id === page)?.label || 'Áttekintés'} · Flow`;
  }, [page]);
  function navigate(next: Page) {
    setPage(next);
    setSidebarOpen(false);
    setNewMenu(false);
    setProfileOpen(false);
    if (next === 'tasks') {
      setProjectFilter('');
      setTaskFilter('all');
      setAssigneeFilter('all');
      setTaskKey((k) => k + 1);
    }
    window.scrollTo({ top: 0 });
  }
  function openTasks(filter: TaskFilter = 'all', project = '', assignee = 'all') {
    setAssigneeFilter(assignee);
    setTaskFilter(filter);
    setProjectFilter(project);
    setTaskKey((k) => k + 1);
    setPage('tasks');
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  }
  function newProject() {
    setEditingProject(undefined);
    setEditor('project');
    setNewMenu(false);
  }
  function newTask(date = '') {
    setEditingTask(undefined);
    setNewTaskDate(date);
    if (!flow.data?.projects.some((p) => p.status !== 'archived')) {
      flow.setToast('Először hozz létre egy projektet a feladatnak.');
      newProject();
      return;
    }
    setEditor('task');
    setNewMenu(false);
  }
  function openTask(task: Task) {
    setEditingTask(task);
    setNewTaskDate('');
    setEditor('task');
    setSearchOpen(false);
    setNotificationsOpen(false);
  }
  function editProject(project: Project) {
    setEditingProject(project);
    setEditor('project');
  }
  if (flow.loading && !flow.data)
    return (
      <div className="loading-page">
        <span className="brand-mark">
          <Layers3 />
        </span>
        <LoaderCircle size={26} className="spin" />
        <p>A munkatered betöltése…</p>
      </div>
    );
  if (flow.recovery || (!flow.demo && !flow.user)) return <Auth />;
  if (!flow.data)
    return flow.error ? (
      <div className="setup-page">
        <div className="setup-card">
          <h1>A munkatér most nem elérhető.</h1>
          <p role="alert">{flow.error}</p>
          <p>Ellenőrizd, hogy a Supabase-migráció lefutott-e.</p>
          <button
            className="button primary"
            onClick={() => void flow.reload().catch((e) => flow.setError(errorMessage(e)))}
          >
            Újrapróbálás
          </button>
          <button className="text-button" onClick={() => void flow.signOut()}>
            Kijelentkezés
          </button>
        </div>
      </div>
    ) : (
      <WorkspaceSetup />
    );
  const data = flow.data;
  const me = data.members.find((m) => m.id === flow.currentUserId);
  const tasks = activeTasks(data.projects, data.tasks);
  const notices = data.notifications.filter((n) => n.user_id === flow.currentUserId);
  const allNotices = notices;
  const unread = notices.filter((n) => !n.read).length;
  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="brand" onClick={() => navigate('dashboard')} aria-label="Flow kezdőlap">
          <span className="brand-mark">
            <Layers3 size={23} strokeWidth={2.5} />
          </span>
          flow<span className="brand-period">.</span>
        </button>
        <button className="workspace-switch" onClick={() => navigate('settings')}>
          <span className="workspace-avatar">{data.team.name.slice(0, 1)}</span>
          <span>
            <strong>{data.team.name}</strong>
            <small>Kreatív munkatér</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">MUNKATÉR</div>
        <nav>
          {navigation.map((item) => (
            <button
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {item.id === 'tasks' && (
                <span className="nav-count">{tasks.filter((t) => t.status !== 'done').length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-projects">
          <div className="nav-label">
            KIEMELT PROJEKTEK
            <button aria-label="Új projekt" className="icon-button" onClick={newProject}>
              <Plus size={15} />
            </button>
          </div>
          {data.projects
            .filter((p) => p.status === 'active')
            .slice(0, 3)
            .map((p) => (
              <button className="sidebar-project" key={p.id} onClick={() => openTasks('all', p.id)}>
                <span className={`project-dot ${p.color}`} />
                <span>{p.name}</span>
              </button>
            ))}
        </div>
        <div className="sidebar-bottom">
          <div className="team-nudge">
            <span className="nudge-art">
              <Users size={21} />
              <Sparkles size={13} />
            </span>
            <h3>Jó dolgok, közösen.</h3>
            <p>
              A következő nagy ötlethez
              <br />
              csak a csapatod hiányzik.
            </p>
            <button
              onClick={() => {
                if (me?.role === 'member') navigate('team');
                else setEditor('invite');
              }}
            >
              Hívd meg a csapatod
              <ArrowRight size={14} />
            </button>
          </div>
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings size={19} strokeWidth={1.7} />
            Beállítások
          </button>
          <button className="nav-item" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={19} strokeWidth={1.7} />
            Segítség és tippek
            <ArrowRight size={14} />
          </button>
          <div className="sidebar-profile">
            <Avatar member={me} />
            <span>
              <strong>{me?.name}</strong>
              <small>{flow.demo ? 'Mintakörnyezet' : 'Személyes fiók'}</small>
            </span>
            <button
              className="icon-button"
              aria-label="Profilbeállítások"
              onClick={() => navigate('settings')}
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Navigáció megnyitása"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <span>Munkatér</span>
            <ChevronRight size={13} />
            <strong>
              {page === 'settings' ? 'Beállítások' : navigation.find((n) => n.id === page)?.label}
            </strong>
          </div>
          <div className="topbar-actions">
            <button className="global-search" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
              <span>Keresés bárhol…</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="popover-anchor">
              <button
                className="icon-button bell-button"
                aria-label={`Értesítések, ${unread} olvasatlan`}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setNewMenu(false);
                }}
              >
                <Bell size={20} />
                {unread > 0 && <i />}
              </button>
              {notificationsOpen && (
                <>
                  <div className="popover-backdrop" onClick={() => setNotificationsOpen(false)} />
                  <div className="notifications-popover">
                    <div className="popover-heading">
                      <h3>Értesítések</h3>
                      <button
                        className="text-button"
                        onClick={async () => {
                          try {
                            for (const n of notices.filter((n) => !n.read))
                              await flow.save('notifications', { id: n.id, read: true });
                          } catch (e) {
                            flow.setError(errorMessage(e));
                          }
                        }}
                      >
                        Mind olvasott
                      </button>
                    </div>
                    {allNotices.length === 0 && (
                      <Empty
                        title="Mindenről tudsz."
                        description="Itt jelennek meg a csapat frissítései."
                      />
                    )}
                    {allNotices.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        className={`notice ${n.read ? 'read' : ''}`}
                        onClick={() => {
                          const task = data.tasks.find((t) => t.id === n.task_id);
                          if (task) openTask(task);
                          void flow
                            .save('notifications', { id: n.id, read: true })
                            .catch((e) => flow.setError(errorMessage(e)));
                        }}
                      >
                        <span className="notice-icon">
                          {n.kind === 'assignment' ? <ListTodo size={17} /> : <Bell size={17} />}
                        </span>
                        <span>
                          <strong>{n.title}</strong>
                          <small>{relativeTime(n.created_at)}</small>
                        </span>
                        {!n.read && <i />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <span className="topbar-divider" />
            <div className="popover-anchor">
              <button
                className="profile-button"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="Fiókmenü"
              >
                <Avatar member={me} size="sm" />
              </button>
              {profileOpen && (
                <>
                  <div className="popover-backdrop" onClick={() => setProfileOpen(false)} />
                  <div className="dropdown profile-dropdown">
                    <button onClick={() => navigate('settings')}>
                      <Settings size={16} />
                      Profilbeállítások
                    </button>
                    {supabase && (
                      <button
                        onClick={() =>
                          void flow.signOut().catch((e) => flow.setError(errorMessage(e)))
                        }
                      >
                        <LogOut size={16} />
                        Kijelentkezés
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="popover-anchor">
              <button
                className="button primary top-new"
                onClick={() => {
                  setNewMenu(!newMenu);
                  setNotificationsOpen(false);
                }}
              >
                <Plus size={17} />
                Új létrehozása
                <ChevronDown size={14} />
              </button>
              {newMenu && (
                <>
                  <div className="popover-backdrop" onClick={() => setNewMenu(false)} />
                  <div className="dropdown">
                    <button onClick={newProject}>
                      <FolderOpen size={17} />
                      Új projekt
                    </button>
                    <button onClick={() => newTask()}>
                      <ListTodo size={17} />
                      Új feladat
                    </button>
                    {me?.role !== 'member' && (
                      <button
                        onClick={() => {
                          setEditor('invite');
                          setNewMenu(false);
                        }}
                      >
                        <Users size={17} />
                        Csapattag meghívása
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="main-content">
          {flow.error && (
            <div className="error-banner" role="alert">
              <span>{flow.error}</span>
              <button
                className="icon-button"
                aria-label="Hiba bezárása"
                onClick={() => flow.setError('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {page === 'dashboard' && (
            <Dashboard
              onProject={(id) => openTasks('all', id)}
              onEditProject={editProject}
              onNewProject={newProject}
              onNewTask={() => newTask()}
              onTask={openTask}
              onTasks={openTasks}
              onProjects={() => navigate('projects')}
            />
          )}
          {page === 'projects' && (
            <ProjectsPage
              onOpen={(id) => openTasks('all', id)}
              onEdit={editProject}
              onNew={newProject}
            />
          )}
          {page === 'tasks' && (
            <TasksPage
              key={taskKey}
              onOpen={openTask}
              onNew={() => newTask()}
              projectId={projectFilter}
              onProjectChange={setProjectFilter}
              initialFilter={taskFilter}
              initialAssignee={assigneeFilter}
              onEditProject={() => {
                const p = data.projects.find((p) => p.id === projectFilter);
                if (p) editProject(p);
              }}
            />
          )}
          {page === 'calendar' && <CalendarPage onTask={openTask} onNew={newTask} />}
          {page === 'team' && (
            <TeamPage
              onInvite={() => setEditor('invite')}
              onTasks={(id) => openTasks('all', '', id)}
            />
          )}
          {page === 'files' && <FilesPage onTask={openTask} />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
      {editor === 'project' && (
        <ProjectEditor project={editingProject} onClose={() => setEditor(null)} />
      )}
      {editor === 'task' && (
        <TaskEditor
          key={editingTask?.id || newTaskDate || 'new'}
          task={
            editingTask ? data.tasks.find((t) => t.id === editingTask.id) || editingTask : undefined
          }
          projectId={projectFilter || undefined}
          initialDate={newTaskDate}
          onClose={() => setEditor(null)}
        />
      )}
      {editor === 'invite' && <InviteEditor onClose={() => setEditor(null)} />}
      {searchOpen && (
        <Modal title="Találd meg, amire szükséged van." onClose={() => setSearchOpen(false)}>
          <div className="search-modal">
            <div className="input-search">
              <Search size={20} />
              <input
                autoFocus
                placeholder="Projekt vagy feladat keresése…"
                aria-label="Globális keresés"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!search && <p className="muted search-hint">Kezdj el gépelni a kereséshez.</p>}
            {search && (
              <>
                <h4>Projektek</h4>
                {data.projects
                  .filter((p) =>
                    p.name.toLocaleLowerCase('hu').includes(search.toLocaleLowerCase('hu')),
                  )
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      className="search-result"
                      key={p.id}
                      onClick={() => {
                        setSearchOpen(false);
                        if (p.status === 'archived') editProject(p);
                        else openTasks('all', p.id);
                      }}
                    >
                      <ProjectIcon project={p} small />
                      <span>{p.name}</span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                <h4>Feladatok</h4>
                {tasks
                  .filter((t) =>
                    t.title.toLocaleLowerCase('hu').includes(search.toLocaleLowerCase('hu')),
                  )
                  .slice(0, 8)
                  .map((t) => (
                    <button className="search-result" key={t.id} onClick={() => openTask(t)}>
                      <ListTodo size={19} />
                      <span>{t.title}</span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                {!data.projects.some((p) =>
                  p.name.toLocaleLowerCase('hu').includes(search.toLocaleLowerCase('hu')),
                ) &&
                  !tasks.some((t) =>
                    t.title.toLocaleLowerCase('hu').includes(search.toLocaleLowerCase('hu')),
                  ) && (
                    <Empty
                      title="Nincs találat."
                      description="Próbálj egy másik keresőkifejezést."
                    />
                  )}
              </>
            )}
          </div>
        </Modal>
      )}
      {helpOpen && (
        <Modal
          title="Találd meg a közös ritmust."
          subtitle="Néhány tipp az első lépésekhez."
          onClose={() => setHelpOpen(false)}
        >
          <div className="help-content">
            {[
              {
                title: '1. Adj nevet az ötletnek',
                body: 'Hozz létre egy projektet, válassz felelőst és határidőt.',
              },
              {
                title: '2. Bontsd kisebb lépésekre',
                body: 'Készíts feladatokat, rendeld a csapattagokhoz, és kövesd őket listán vagy táblán. A kártyákat át is húzhatod az állapotok között.',
              },
              {
                title: '3. Beszéljétek meg egy helyen',
                body: 'A feladatokon belül írj hozzászólást, említs meg valakit @email-cím formában, vagy csatolj egy anyagot.',
              },
              {
                title: '4. Maradjatok képben',
                body: 'A naptár és a csapatnézet segít átlátni a határidőket és az elosztott feladatokat.',
              },
            ].map((t) => (
              <div key={t.title}>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
            <div className="info-note">
              Gyorskeresés: Ctrl + K (Macen ⌘ K). A mintaadatok a Beállításokban visszaállíthatók.
            </div>
          </div>
        </Modal>
      )}
      {flow.toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {flow.toast}
          <button
            className="icon-button"
            aria-label="Üzenet bezárása"
            onClick={() => flow.setToast('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
