import {
  Archive,
  ArrowDownToLine,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useFlow } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { Project, Task } from '../lib/types';
import { roles } from '../lib/types';
import { activeTasks, dateKey, errorMessage, fileSize, formatDate, isOverdue } from '../lib/utils';
import { ProjectCard } from './Dashboard';
import { Avatar, Empty, Submit } from './ui';
export function ProjectsPage({
  onOpen,
  onEdit,
  onNew,
}: {
  onOpen: (id: string) => void;
  onEdit: (p: Project) => void;
  onNew: () => void;
}) {
  const data = useFlow().data!;
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const projects = data.projects.filter(
    (p) =>
      (tab === 'archived'
        ? p.status === 'archived'
        : tab === 'all'
          ? p.status !== 'archived'
          : p.status === tab) &&
      p.name.toLocaleLowerCase('hu').includes(query.toLocaleLowerCase('hu')),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ÖTLETBŐL VALÓSÁG</div>
          <h1>Projektek</h1>
          <p>Közös célok, átlátható lépések. Itt áll össze a nagy kép.</p>
        </div>
        <button className="button primary" onClick={onNew}>
          <Plus size={17} />
          Új projekt
        </button>
      </div>
      <div className="projects-toolbar">
        <div className="filter-tabs">
          {[
            { id: 'all', name: 'Összes projekt' },
            { id: 'active', name: 'Folyamatban' },
            { id: 'planned', name: 'Tervezés' },
            { id: 'completed', name: 'Lezárva' },
            { id: 'archived', name: 'Archívum' },
          ].map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.id === 'archived' && <Archive size={14} />} {t.name}
            </button>
          ))}
        </div>
        <div className="input-search">
          <Search size={16} />
          <input
            aria-label="Projekt keresése"
            placeholder="Projekt keresése…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="project-grid full-project-grid">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onOpen={() => (p.status === 'archived' ? onEdit(p) : onOpen(p.id))}
            onEdit={() => onEdit(p)}
          />
        ))}
        {tab !== 'archived' && (
          <button className="new-project-card" onClick={onNew}>
            <span>
              <Plus size={24} />
            </span>
            <strong>A következő nagy ötlet?</strong>
            <small>Hozz létre egy új projektet</small>
          </button>
        )}
      </div>
      {projects.length === 0 && tab === 'archived' && (
        <Empty
          icon={<Archive size={30} />}
          title="Az archívum még üres."
          description="A lezárt projektek itt kapnak helyet, ha archiválod őket."
        />
      )}
    </>
  );
}
export function CalendarPage({
  onTask,
  onNew,
}: {
  onTask: (t: Task) => void;
  onNew: (date: string) => void;
}) {
  const data = useFlow().data!;
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState(dateKey());
  const tasks = activeTasks(data.projects, data.tasks).filter((t) => t.status !== 'done');
  const first = new Date(month);
  first.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    return d;
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HELYE VAN MINDENNEK</div>
          <h1>Naptár</h1>
          <p>A csapat határidői, egy közös ritmusban.</p>
        </div>
        <button className="button primary" onClick={() => onNew(selected)}>
          <Plus size={17} />
          Új feladat
        </button>
      </div>
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="panel-heading">
            <h2 className="capitalize">
              {month.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
            </h2>
            <div className="calendar-navigation">
              <button
                className="button secondary small-button"
                onClick={() => {
                  setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                  setSelected(dateKey());
                }}
              >
                Ma
              </button>
              <button
                className="icon-button"
                aria-label="Előző hónap"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="icon-button"
                aria-label="Következő hónap"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <div className="calendar-weekdays">
            {['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((day) => {
              const key = dateKey(day);
              const list = tasks.filter((t) => t.due_date === key);
              return (
                <div
                  key={key}
                  className={`calendar-cell ${day.getMonth() !== month.getMonth() ? 'other-month' : ''} ${selected === key ? 'selected-day' : ''}`}
                >
                  <button
                    className={`day-number ${key === dateKey() ? 'today' : ''}`}
                    aria-label={day.toLocaleDateString('hu-HU')}
                    onClick={() => setSelected(key)}
                  >
                    {day.getDate()}
                  </button>
                  {list.slice(0, 2).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onTask(t)}
                      className={`calendar-event ${data.projects.find((p) => p.id === t.project_id)?.color}`}
                      title={t.title}
                    >
                      {t.title}
                    </button>
                  ))}
                  {list.length > 2 && (
                    <button className="calendar-more" onClick={() => setSelected(key)}>
                      +{list.length - 2} feladat
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <aside className="panel calendar-agenda">
          <div className="panel-heading">
            <h2>{formatDate(selected, true)}</h2>
            <CalendarDays size={18} />
          </div>
          {tasks
            .filter((t) => t.due_date === selected)
            .map((t) => (
              <button className="agenda-item" key={t.id} onClick={() => onTask(t)}>
                <span
                  className={`project-dot ${data.projects.find((p) => p.id === t.project_id)?.color}`}
                />
                <span>
                  <strong>{t.title}</strong>
                  <small>{data.projects.find((p) => p.id === t.project_id)?.name}</small>
                </span>
                <Avatar member={data.members.find((m) => m.id === t.assignee_id)} size="xs" />
              </button>
            ))}
          {!tasks.some((t) => t.due_date === selected) && (
            <Empty
              icon={<CalendarDays size={26} />}
              title="Egy kis szabad tér."
              description="Erre a napra nincs határidő."
            />
          )}
          <button className="panel-bottom-link" onClick={() => onNew(selected)}>
            <Plus size={15} />
            Feladat erre a napra
          </button>
        </aside>
      </div>
    </>
  );
}
export function TeamPage({
  onInvite,
  onTasks,
}: {
  onInvite: () => void;
  onTasks: (id: string) => void;
}) {
  const flow = useFlow();
  const data = flow.data!;
  const me = data.members.find((m) => m.id === flow.currentUserId);
  const canManage = me?.role === 'owner' || me?.role === 'admin';
  const tasks = activeTasks(data.projects, data.tasks).filter((t) => t.status !== 'done');
  const [query, setQuery] = useState('');
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A JÓ MUNKA MÖGÖTT EMBEREK ÁLLNAK</div>
          <h1>A csapat</h1>
          <p>{data.members.length} különböző nézőpont. Egy közös lendület.</p>
        </div>
        {canManage && (
          <button className="button primary" onClick={onInvite}>
            <Plus size={17} />
            Csapattag meghívása
          </button>
        )}
      </div>
      <div className="team-summary">
        <div>
          <span className="stat-icon lavender">
            <Users size={22} />
          </span>
          <div>
            <strong>{data.members.length}</strong>
            <span>csapattag</span>
          </div>
        </div>
        <div>
          <span className="stat-icon peach">
            <Folder size={22} />
          </span>
          <div>
            <strong>{tasks.length}</strong>
            <span>nyitott feladat</span>
          </div>
        </div>
        <div>
          <span className="stat-icon sage">
            <Check size={22} />
          </span>
          <div>
            <strong>{data.tasks.filter((t) => t.status === 'done').length}</strong>
            <span>közös siker</span>
          </div>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Emberek és kapacitás</h2>
          <div className="input-search">
            <Search size={15} />
            <input
              placeholder="Csapattag keresése…"
              aria-label="Csapattag keresése"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="team-table">
            <thead>
              <tr>
                <th>Csapattag</th>
                <th>Szerepkör</th>
                <th>Nyitott feladatok</th>
                <th>Terhelés</th>
              </tr>
            </thead>
            <tbody>
              {data.members
                .filter((m) =>
                  m.name.toLocaleLowerCase('hu').includes(query.toLocaleLowerCase('hu')),
                )
                .map((m) => {
                  const assigned = tasks.filter((t) => t.assignee_id === m.id);
                  const overdue = assigned.filter(isOverdue).length;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="member-cell">
                          <Avatar member={m} size="md" />
                          <div>
                            <strong>
                              {m.name}
                              {m.id === flow.currentUserId && <span className="you-badge">Te</span>}
                            </strong>
                            <small>{m.job_title || m.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {me?.role === 'owner' && m.id !== me.id ? (
                          <select
                            className="role-select"
                            aria-label={`${m.name} szerepköre`}
                            value={m.role}
                            onChange={(e) =>
                              void flow
                                .updateRole(m.id, e.target.value as 'admin' | 'member')
                                .catch((err) => flow.setError(errorMessage(err)))
                            }
                          >
                            <option value="member">Csapattag</option>
                            <option value="admin">Adminisztrátor</option>
                          </select>
                        ) : (
                          <span className={`role-badge ${m.role}`}>{roles[m.role]}</span>
                        )}
                      </td>
                      <td>
                        <button className="text-button" onClick={() => onTasks(m.id)}>
                          {assigned.length} feladat
                          <ChevronRight size={14} />
                        </button>
                        {overdue > 0 && <small className="overdue">{overdue} lejárt</small>}
                      </td>
                      <td>
                        <div className="workload">
                          <div
                            className={`progress-track ${assigned.length > 5 ? 'peach' : 'sage'}`}
                          >
                            <span
                              style={{ width: `${Math.min((assigned.length / 8) * 100, 100)}%` }}
                            />
                          </div>
                          <small>
                            {assigned.length === 0
                              ? 'Szabad kapacitás'
                              : assigned.length > 5
                                ? 'Sűrű napok'
                                : 'Kiegyensúlyozott'}
                          </small>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="table-note">
          A terhelés a nyitott feladatok száma alapján számított tájékoztató érték.
        </div>
      </section>
      {canManage && data.invitations.length > 0 && (
        <section className="panel invitations-panel">
          <div className="panel-heading">
            <h2>Függő meghívások</h2>
            <Mail size={18} />
          </div>
          {data.invitations.map((i) => (
            <div className="invitation-row" key={i.id}>
              <Mail size={16} />
              <span>{i.email}</span>
              <span className="muted">{roles[i.role]}</span>
              <button
                className="text-button"
                onClick={() =>
                  void flow.remove('invitations', i.id).catch((e) => flow.setError(errorMessage(e)))
                }
              >
                Visszavonás
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
export function FilesPage({ onTask }: { onTask: (t: Task) => void }) {
  const flow = useFlow();
  const data = flow.data!;
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('');
  const files = data.attachments.filter(
    (f) =>
      f.name.toLocaleLowerCase('hu').includes(query.toLocaleLowerCase('hu')) &&
      (!project || data.tasks.find((t) => t.id === f.task_id)?.project_id === project),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A MUNKA MINDEN DARABJA</div>
          <h1>Fájlok</h1>
          <p>A feladatokhoz csatolt anyagok, mindig kéznél.</p>
        </div>
        <span className="count large-count">{data.attachments.length} fájl</span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div className="input-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Fájl keresése…"
              aria-label="Fájl keresése"
            />
          </div>
          <select
            aria-label="Projekt szerinti fájlszűrés"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">Minden projekt</option>
            {data.projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {files.length === 0 ? (
          <Empty
            icon={<FileText size={34} />}
            title="Minden anyagnak meglesz a helye."
            description="Nyiss meg egy feladatot, és a Csatolmányok fülön tölts fel egy fájlt. A feltöltött anyagok itt is megjelennek."
          />
        ) : (
          <div className="table-scroll">
            <table className="files-table">
              <thead>
                <tr>
                  <th>Fájlnév</th>
                  <th>Kapcsolódó feladat</th>
                  <th>Feltöltötte</th>
                  <th>Méret</th>
                  <th>Letöltés</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const task = data.tasks.find((t) => t.id === file.task_id);
                  return (
                    <tr key={file.id}>
                      <td>
                        <div className="file-name">
                          <FileText size={21} />
                          <strong>{file.name}</strong>
                        </div>
                      </td>
                      <td>
                        <button className="text-button" onClick={() => task && onTask(task)}>
                          {task?.title}
                        </button>
                      </td>
                      <td>
                        <Avatar member={data.members.find((m) => m.id === file.uploaded_by)} />
                      </td>
                      <td>{fileSize(file.size)}</td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Letöltés: ${file.name}`}
                          onClick={() =>
                            void flow.download(file).catch((e) => flow.setError(errorMessage(e)))
                          }
                        >
                          <ArrowDownToLine size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
export function SettingsPage() {
  const flow = useFlow();
  const data = flow.data!;
  const me = data.members.find((m) => m.id === flow.currentUserId)!;
  const [name, setName] = useState(me?.name || '');
  const [title, setTitle] = useState(me?.job_title || '');
  const [team, setTeam] = useState(data.team.name);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function save(kind: string) {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'profile') await flow.updateProfile(name.trim(), title.trim());
      else await flow.renameTeam(team.trim());
      flow.setToast('A beállításokat elmentettük.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AHOGY NEKTEK JÓ</div>
          <h1>Beállítások</h1>
          <p>A profilod és a közös munkatér beállításai.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="panel-heading">
            <h2>Saját profil</h2>
            <Avatar member={me} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save('profile');
            }}
          >
            <label>
              Teljes név
              <input
                value={name}
                required
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Munkakör
              <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              E-mail-cím
              <input value={me?.email || ''} disabled />
            </label>
            <Submit busy={busy === 'profile'}>Profil mentése</Submit>
          </form>
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading">
            <h2>Munkatér</h2>
            <Users size={19} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save('team');
            }}
          >
            <label>
              Munkatér neve
              <input
                value={team}
                required
                maxLength={80}
                disabled={me?.role === 'member'}
                onChange={(e) => setTeam(e.target.value)}
              />
            </label>
            <div className="workspace-info">
              <span className="muted">Csapattagok</span>
              <strong>{data.members.length}</strong>
              <span className="muted">Saját szerepkör</span>
              <strong>{roles[me?.role || 'member']}</strong>
              <span className="muted">Felület nyelve</span>
              <strong>Magyar</strong>
            </div>
            {me?.role !== 'member' && <Submit busy={busy === 'team'}>Munkatér mentése</Submit>}
          </form>
        </section>
        <section className="panel settings-panel connection-panel">
          <div className="panel-heading">
            <h2>Adatok és kapcsolat</h2>
            <ShieldCheck size={19} />
          </div>
          <div className="settings-body">
            <div className={`connection-badge ${flow.demo ? 'demo' : 'live'}`}>
              <span />
              {flow.demo ? 'Mintakörnyezet' : 'Supabase csatlakoztatva'}
            </div>
            <p>
              {flow.demo
                ? 'A mintaadatok ebben a böngészőben tárolódnak. Szabadon kipróbálhatod a projekt- és feladatkezelést.'
                : 'A fiókod és a csapatadatok Supabase-ben tárolódnak. A hozzáférést csapatszintű adatbázis-szabályok védik.'}
            </p>
            {flow.demo && (
              <>
                <p className="muted">
                  Az éles kapcsolat aktiválásához kövesd a projekt README-jének Supabase-beállítási
                  lépéseit.
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Visszaállítod a mintaadatokat? A mintakörnyezetben végzett módosítások elvesznek.',
                      )
                    )
                      flow.resetDemo();
                  }}
                >
                  Mintaadatok visszaállítása
                </button>
                {supabase && (
                  <button className="text-button" onClick={() => void flow.signOut()}>
                    Vissza a bejelentkezéshez
                  </button>
                )}
              </>
            )}
            {!flow.demo && (
              <button
                className="button secondary"
                onClick={() => void flow.signOut().catch((e) => setError(errorMessage(e)))}
              >
                Kijelentkezés
              </button>
            )}
          </div>
        </section>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
