import {
  Archive,
  Check,
  CheckSquare,
  FileText,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useFlow } from '../lib/store';
import {
  priorities,
  projectStatuses,
  statuses,
  type Priority,
  type Project,
  type ProjectStatus,
  type Status,
  type Task,
} from '../lib/types';
import { dateKey, errorMessage, fileSize, offsetDate, relativeTime } from '../lib/utils';
import { Avatar, Modal, Submit } from './ui';
export function ProjectEditor({
  project,
  onClose,
  onCreated,
}: {
  project?: Project;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const flow = useFlow();
  const data = flow.data!;
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || ('active' as ProjectStatus),
    priority: project?.priority || ('medium' as Priority),
    start_date: project?.start_date || dateKey(),
    due_date: project?.due_date || offsetDate(14),
    owner_id: project?.owner_id || flow.currentUserId,
    color: project?.color || 'peach',
    icon: project?.icon || 'folder',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.due_date < form.start_date) {
      setError('A határidő nem lehet korábbi a kezdésnél.');
      return;
    }
    setBusy(true);
    try {
      const id = await flow.save(
        'projects',
        { ...form, name: form.name.trim(), ...(project ? { id: project.id } : {}) },
        `${project ? 'frissítette' : 'létrehozta'} a projektet: ${form.name}`,
      );
      flow.setToast(project ? 'Projekt módosítva.' : 'Az új projekt elkészült.');
      onClose();
      onCreated?.(id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={project ? 'Projekt szerkesztése' : 'Adj teret egy új ötletnek.'}
      subtitle={
        project
          ? 'A projekt részletei és felelősei.'
          : 'Minden nagyszerű munka egy első lépéssel kezdődik.'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="editor-form">
        <label>
          Projekt neve
          <input
            required
            autoFocus
            maxLength={120}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Például: Tavaszi márkakampány"
          />
        </label>
        <label>
          Leírás
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Miről szól a projekt? Mi a közös cél?"
          />
        </label>
        <div className="form-grid">
          <label>
            Állapot
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              {Object.entries(projectStatuses).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioritás
            <select value={form.priority} onChange={(e) => update('priority', e.target.value)}>
              {Object.entries(priorities).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kezdés
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(e) => update('start_date', e.target.value)}
            />
          </label>
          <label>
            Határidő
            <input
              required
              type="date"
              min={form.start_date}
              value={form.due_date}
              onChange={(e) => update('due_date', e.target.value)}
            />
          </label>
        </div>
        <label>
          Projektfelelős
          <select value={form.owner_id} onChange={(e) => update('owner_id', e.target.value)}>
            {data.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="color-field">
          <legend>Projekt színe</legend>
          <div className="color-choices">
            {['peach', 'sage', 'lavender', 'sand', 'blue'].map((color) => (
              <button
                type="button"
                key={color}
                className={`color-choice ${color} ${form.color === color ? 'selected' : ''}`}
                aria-label={`Szín: ${{ peach: 'barack', sage: 'zsálya', lavender: 'levendula', sand: 'homok', blue: 'kék' }[color]}`}
                aria-pressed={form.color === color}
                onClick={() => update('color', color)}
              >
                {form.color === color && <Check size={16} />}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          {project && project.status !== 'archived' && (
            <button
              className="button danger-quiet"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await flow.save(
                    'projects',
                    { id: project.id, status: 'archived' },
                    `archiválta a projektet: ${project.name}`,
                  );
                  flow.setToast('A projekt az archívumba került.');
                  onClose();
                } catch (e) {
                  setError(errorMessage(e));
                  setBusy(false);
                }
              }}
            >
              <Archive size={15} />
              Archiválás
            </button>
          )}
          <button type="button" className="button secondary" onClick={onClose}>
            Mégse
          </button>
          <Submit busy={busy}>{project ? 'Változtatások mentése' : 'Projekt létrehozása'}</Submit>
        </div>
      </form>
    </Modal>
  );
}
export function TaskEditor({
  task,
  projectId,
  initialDate,
  onClose,
}: {
  task?: Task;
  projectId?: string;
  initialDate?: string;
  onClose: () => void;
}) {
  const flow = useFlow();
  const data = flow.data!;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    project_id:
      task?.project_id || projectId || data.projects.find((p) => p.status !== 'archived')?.id || '',
    status: task?.status || ('todo' as Status),
    priority: task?.priority || ('medium' as Priority),
    due_date: task?.due_date || initialDate || dateKey(),
    assignee_id: task?.assignee_id || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('details');
  const [checkText, setCheckText] = useState('');
  const [comment, setComment] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const checks = data.checklist.filter((c) => c.task_id === task?.id);
  const comments = data.comments.filter((c) => c.task_id === task?.id);
  const attachments = data.attachments.filter((c) => c.task_id === task?.id);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setError('');
    try {
      await flow.save(
        'tasks',
        {
          ...form,
          title: form.title.trim(),
          assignee_id: form.assignee_id || null,
          ...(task ? { id: task.id } : {}),
        },
        `${task ? 'frissítette a feladatot' : 'új feladatot hozott létre'}: ${form.title}`,
      );
      flow.setToast(task ? 'Feladat módosítva.' : 'Az új feladat elkészült.');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function action(fn: () => Promise<unknown>) {
    setActionBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error && e.message.includes('MB') ? e.message : errorMessage(e));
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <Modal
      title={task ? 'Feladat részletei' : 'Mi a következő lépés?'}
      subtitle={
        task
          ? data.projects.find((p) => p.id === task.project_id)?.name
          : 'Egy jól meghatározott feladat fél siker.'
      }
      wide
      onClose={onClose}
    >
      <div className="editor-tabs">
        <button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>
          <CheckSquare size={16} />
          Részletek
        </button>
        {task && (
          <>
            <button
              className={tab === 'comments' ? 'active' : ''}
              onClick={() => setTab('comments')}
            >
              <MessageSquare size={16} />
              Hozzászólások <span>{comments.length}</span>
            </button>
            <button className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>
              <Paperclip size={16} />
              Csatolmányok <span>{attachments.length}</span>
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="form-error editor-error" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={submit}
        className="editor-form"
        style={{ display: tab === 'details' ? 'block' : 'none' }}
      >
        <label>
          Feladat neve
          <input
            required
            autoFocus
            value={form.title}
            maxLength={180}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Például: Kreatív koncepció bemutatása"
          />
        </label>
        <label>
          Leírás
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Mire van szükség a feladat elvégzéséhez?"
          />
        </label>
        <div className="form-grid">
          <label>
            Projekt
            <select
              required
              value={form.project_id}
              onChange={(e) => update('project_id', e.target.value)}
            >
              <option value="" disabled>
                Válassz projektet
              </option>
              {data.projects
                .filter((p) => p.status !== 'archived' || p.id === task?.project_id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Felelős
            <select
              value={form.assignee_id}
              onChange={(e) => update('assignee_id', e.target.value)}
            >
              <option value="">Nincs kijelölve</option>
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Állapot
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              {Object.entries(statuses).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioritás
            <select value={form.priority} onChange={(e) => update('priority', e.target.value)}>
              {Object.entries(priorities).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Határidő
            <input
              required
              type="date"
              value={form.due_date}
              onChange={(e) => update('due_date', e.target.value)}
            />
          </label>
        </div>
        {task && (
          <div className="checklist-section">
            <div className="section-title">
              <h3>Ellenőrzőlista</h3>
              <span className="muted">
                {checks.filter((c) => c.completed).length}/{checks.length}
              </span>
            </div>
            {checks.map((c) => (
              <div className="checklist-item" key={c.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={c.completed}
                    disabled={actionBusy}
                    onChange={(e) =>
                      void action(() =>
                        flow.save('checklist', { id: c.id, completed: e.target.checked }),
                      )
                    }
                  />
                  <span className={c.completed ? 'struck' : ''}>{c.text}</span>
                </label>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Törlés: ${c.text}`}
                  disabled={actionBusy}
                  onClick={() => void action(() => flow.remove('checklist', c.id))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="inline-input">
              <input
                value={checkText}
                onChange={(e) => setCheckText(e.target.value)}
                placeholder="Új ellenőrzőpont…"
                aria-label="Új ellenőrzőpont"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (checkText.trim())
                      void action(async () => {
                        await flow.save('checklist', {
                          task_id: task.id,
                          text: checkText.trim(),
                          completed: false,
                        });
                        setCheckText('');
                      });
                  }
                }}
              />
              <button
                className="button secondary"
                type="button"
                disabled={!checkText.trim() || actionBusy}
                onClick={() =>
                  void action(async () => {
                    await flow.save('checklist', {
                      task_id: task.id,
                      text: checkText.trim(),
                      completed: false,
                    });
                    setCheckText('');
                  })
                }
              >
                <Plus size={16} />
                Hozzáadás
              </button>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Mégse
          </button>
          <Submit busy={busy}>{task ? 'Változtatások mentése' : 'Feladat létrehozása'}</Submit>
        </div>
      </form>
      {tab === 'comments' && task && (
        <div className="discussion">
          <div className="comments-list">
            {comments.length === 0 && (
              <p className="muted">Itt kezdődik a beszélgetés. Oszd meg az első gondolatot!</p>
            )}
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <Avatar member={data.members.find((m) => m.id === c.author_id)} />
                <div>
                  <strong>
                    {data.members.find((m) => m.id === c.author_id)?.name || 'Csapattag'}
                  </strong>
                  <span className="muted">{relativeTime(c.created_at)}</span>
                  <p>{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (comment.trim())
                void action(async () => {
                  await flow.save(
                    'comments',
                    { task_id: task.id, author_id: flow.currentUserId, body: comment.trim() },
                    `hozzászólt: ${task.title}`,
                  );
                  setComment('');
                });
            }}
          >
            <label>
              Új hozzászólás
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Írj a csapatnak… Említés: @email-cím"
                maxLength={5000}
              />
            </label>
            <div className="comment-footer">
              <span className="muted">Említéshez: @anna@csapatod.hu</span>
              <button className="button primary" disabled={actionBusy || !comment.trim()}>
                <Send size={15} />
                Küldés
              </button>
            </div>
          </form>
        </div>
      )}
      {tab === 'files' && task && (
        <div className="discussion">
          <label className={`upload-zone ${actionBusy ? 'disabled' : ''}`}>
            <Upload size={28} />
            <strong>
              {actionBusy ? 'Feltöltés folyamatban…' : 'Kattints egy fájl feltöltéséhez'}
            </strong>
            <span>Legfeljebb {flow.demo ? '1' : '10'} MB · biztonságos csapatcsatolmányok</span>
            <input
              type="file"
              disabled={actionBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void action(() => flow.upload(task.id, file));
                e.target.value = '';
              }}
            />
          </label>
          {attachments.map((file) => (
            <button
              key={file.id}
              className="file-row"
              onClick={() => void action(() => flow.download(file))}
            >
              <span className="file-icon">
                <FileText size={22} />
              </span>
              <span>
                <strong>{file.name}</strong>
                <small>
                  {fileSize(file.size)} · {relativeTime(file.created_at)}
                </small>
              </span>
              <Paperclip size={16} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
export function InviteEditor({ onClose }: { onClose: () => void }) {
  const flow = useFlow();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal
      title="Hozzuk össze a csapatot."
      subtitle="Hívd meg a következő közös ötlet alkotóját."
      onClose={onClose}
    >
      <form
        className="editor-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const clean = email.trim().toLowerCase();
            if (
              flow.data!.members.some((m) => m.email.toLowerCase() === clean) ||
              flow.data!.invitations.some((i) => i.email === clean)
            ) {
              setError('Ez az e-mail-cím már tag vagy meghívott.');
              return;
            }
            await flow.save('invitations', { email: clean, role });
            flow.setToast('A meghívás elkészült. Oszd meg az alkalmazás címét a meghívottal.');
            onClose();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          E-mail-cím
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kollega@csapatod.hu"
          />
        </label>
        <label>
          Szerepkör
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Csapattag</option>
            <option value="admin">Adminisztrátor</option>
          </select>
        </label>
        <p className="info-note">
          A meghívott az alkalmazás címén, ezzel az e-mail-címmel regisztrálva vagy bejelentkezve
          csatlakozik a csapathoz. A meghívás nem küld automatikus e-mailt.
          {flow.demo ? ' A mintakörnyezetben a meghívás csak bemutató.' : ''}
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Mégse
          </button>
          <Submit busy={busy}>Meghívás létrehozása</Submit>
        </div>
      </form>
    </Modal>
  );
}
