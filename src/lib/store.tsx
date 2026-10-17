import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createDemo, DEMO_USER } from './demo';
import { supabase } from './supabase';
import type { Attachment, Data, Entity, Member } from './types';
import { activeTasks, dateKey, errorMessage, offsetDate } from './utils';
const storageKey = 'flow-demo-v1';
function withDemoDeadlines(data: Data): Data {
  const next = { ...data, notifications: [...data.notifications] };
  for (const task of activeTasks(data.projects, data.tasks).filter(
    (t) => t.assignee_id && t.status !== 'done' && t.due_date <= offsetDate(2),
  )) {
    const kind = task.due_date < dateKey() ? 'overdue' : 'deadline';
    const id = `${kind}:${task.id}:${task.assignee_id}:${task.due_date}`;
    if (!next.notifications.some((n) => n.id === id))
      next.notifications.push({
        id,
        team_id: data.team.id,
        user_id: task.assignee_id!,
        title: `${kind === 'overdue' ? 'Lejárt határidő' : 'Közeleg a határidő'}: ${task.title}`,
        task_id: task.id,
        kind,
        read: false,
        created_at: new Date().toISOString(),
      });
  }
  return next;
}
function readDemo(): Data {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.team && data.tasks && data.members) return withDemoDeadlines(data);
    }
  } catch {
    /* A private browser may not allow storage. */
  }
  return withDemoDeadlines(createDemo());
}
function useFlowState() {
  const [demo, setDemo] = useState(!supabase || sessionStorage.getItem('flow-demo') === 'true');
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Data | null>(demo ? readDemo : null);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [recovery, setRecovery] = useState(false);
  const teamRef = useRef<string | null>(null);
  const requestSequence = useRef(0);
  const activeUser = useRef<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const currentUserId = demo ? DEMO_USER : user?.id || '';
  async function load(userId: string, initialize = false) {
    if (!supabase) return;
    const requestId = ++requestSequence.current;
    if (initialize) {
      const accepted = await supabase.rpc('accept_team_invitations');
      if (accepted.error) throw accepted.error;
    }
    const membership = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data) {
      if (requestId === requestSequence.current) setData(null);
      return;
    }
    const teamId = membership.data.team_id;
    teamRef.current = teamId;
    if (initialize) {
      const r = await supabase.rpc('refresh_deadline_notifications', { p_team_id: teamId });
      if (r.error) throw r.error;
    }
    const tables = [
      'projects',
      'tasks',
      'checklist',
      'comments',
      'attachments',
      'activity',
      'notifications',
      'invitations',
    ] as const;
    const results = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase
        .from('team_members')
        .select('user_id,role,profiles!team_members_user_id_fkey(id,name,email,job_title,color)')
        .eq('team_id', teamId),
      ...tables.map((table) =>
        supabase!
          .from(table)
          .select('*')
          .eq('team_id', teamId)
          .order(table === 'checklist' ? 'id' : 'created_at', {
            ascending: table !== 'activity' && table !== 'notifications',
          }),
      ),
    ]);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
    const team = results[0].data as unknown as Data['team'];
    const memberRows = results[1].data as unknown as {
      user_id: string;
      role: Member['role'];
      profiles: Omit<Member, 'role'>;
    }[];
    const next = {
      team,
      members: memberRows.map((row) => ({ ...row.profiles, role: row.role })),
    } as Data;
    tables.forEach((table, index) =>
      Object.assign(next, { [table]: results[index + 2].data || [] }),
    );
    if (requestId === requestSequence.current) {
      setData(next);
      setError('');
    }
  }
  useEffect(() => {
    if (demo) {
      const next = readDemo();
      setData(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        setError('A böngészőben a helyi mentés nem elérhető.');
      }
      setLoading(false);
      return;
    }
    if (!supabase) return;
    let alive = true;
    const initialize = async (u: User | null) => {
      if (!alive) return;
      if (activeUser.current !== (u?.id || null)) {
        activeUser.current = u?.id || null;
        requestSequence.current++;
        setData(null);
      }
      setUser(u);
      setLoading(true);
      try {
        if (u) await load(u.id, true);
        else setData(null);
      } catch (e) {
        if (alive) setError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(errorMessage(error));
        setLoading(false);
      } else void initialize(data.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY') {
        setTimeout(() => void initialize(session?.user || null), 0);
      }
    });
    return () => {
      alive = false;
      requestSequence.current++;
      listener.subscription.unsubscribe();
    };
  }, [demo]);
  useEffect(() => {
    if (demo || !supabase || !data?.team.id || !user) return;
    let timer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel('flow-team-' + data.team.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `team_id=eq.${data.team.id}` },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => void load(user.id).catch((e) => setError(errorMessage(e))), 250);
        },
      )
      .subscribe();
    const refresh = () => {
      if (document.visibilityState === 'visible')
        void load(user.id, true).catch((e) => setError(errorMessage(e)));
    };
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      void supabase!.removeChannel(channel);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [demo, data?.team.id, user?.id]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  function persist(next: Data) {
    next = withDemoDeadlines(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    dataRef.current = next;
    setData(next);
  }
  async function save(entity: Entity, item: Record<string, unknown>, message?: string) {
    const current = dataRef.current;
    if (!current) throw new Error('Nincs munkatér');
    const existing = Boolean(item.id && current[entity].some((row) => row.id === item.id));
    const row = {
      ...item,
      id: item.id || crypto.randomUUID(),
      team_id: current.team.id,
      ...(!existing && entity !== 'checklist' ? { created_at: new Date().toISOString() } : {}),
    };
    if (demo) {
      const next = {
        ...current,
        [entity]: existing
          ? current[entity].map((old) => (old.id === row.id ? { ...old, ...row } : old))
          : [...current[entity], row],
      } as Data;
      if (message)
        next.activity = [
          {
            id: crypto.randomUUID(),
            team_id: current.team.id,
            actor_id: currentUserId,
            message,
            created_at: new Date().toISOString(),
          },
          ...next.activity,
        ];
      if (
        entity === 'tasks' &&
        item.assignee_id &&
        item.assignee_id !== current.tasks.find((t) => t.id === row.id)?.assignee_id
      )
        next.notifications = [
          {
            id: crypto.randomUUID(),
            team_id: current.team.id,
            user_id: String(item.assignee_id),
            title: `Új feladatod: ${item.title}`,
            task_id: String(row.id),
            kind: 'assignment',
            read: false,
            created_at: new Date().toISOString(),
          },
          ...next.notifications,
        ];
      persist(next);
    } else if (supabase) {
      const { id: _id, team_id: _team, created_at: _created, ...changes } = item;
      const result = existing
        ? await supabase
            .from(entity)
            .update(changes)
            .eq('id', String(row.id))
            .eq('team_id', current.team.id)
            .select('id')
            .single()
        : await supabase.from(entity).insert(row).select('id').single();
      if (result.error) throw result.error;
      await load(currentUserId);
    }
    return String(row.id);
  }
  async function remove(entity: Entity, id: string) {
    const current = dataRef.current;
    if (!current) return;
    if (demo) persist({ ...current, [entity]: current[entity].filter((row) => row.id !== id) });
    else if (supabase) {
      const r = await supabase.from(entity).delete().eq('id', id).select('id').single();
      if (r.error) throw r.error;
      await load(currentUserId);
    }
  }
  async function upload(taskId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) throw new Error('A fájl legfeljebb 10 MB lehet.');
    if (!dataRef.current) return;
    const id = crypto.randomUUID();
    let path = '';
    if (demo) {
      if (file.size > 1024 * 1024)
        throw new Error('A mintakörnyezetben legfeljebb 1 MB-os fájl tölthető fel.');
      path = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } else if (supabase) {
      path = `${dataRef.current.team.id}/${taskId}/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const r = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
      if (r.error) throw r.error;
    }
    try {
      await save(
        'attachments',
        { id, task_id: taskId, name: file.name, size: file.size, path, uploaded_by: currentUserId },
        `fájlt csatolt: ${file.name}`,
      );
    } catch (e) {
      if (!demo && supabase) await supabase.storage.from('attachments').remove([path]);
      throw e;
    }
  }
  async function download(file: Attachment) {
    let url = file.path;
    if (!demo && supabase) {
      const r = await supabase.storage
        .from('attachments')
        .createSignedUrl(file.path, 60, { download: file.name });
      if (r.error) throw r.error;
      url = r.data.signedUrl;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.rel = 'noopener';
    link.click();
  }
  async function createTeam(name: string) {
    if (!supabase) return;
    const r = await supabase.rpc('create_team', { p_name: name });
    if (r.error) throw r.error;
    await load(currentUserId, true);
  }
  async function renameTeam(name: string) {
    if (!data) return;
    if (demo) persist({ ...data, team: { ...data.team, name } });
    else if (supabase) {
      const r = await supabase
        .from('teams')
        .update({ name })
        .eq('id', data.team.id)
        .select()
        .single();
      if (r.error) throw r.error;
      await load(currentUserId);
    }
  }
  async function updateProfile(name: string, job_title: string) {
    if (!data) return;
    if (demo)
      persist({
        ...data,
        members: data.members.map((m) => (m.id === currentUserId ? { ...m, name, job_title } : m)),
      });
    else if (supabase) {
      const r = await supabase.from('profiles').update({ name, job_title }).eq('id', currentUserId);
      if (r.error) throw r.error;
      await load(currentUserId);
    }
  }
  async function updateRole(id: string, role: 'admin' | 'member') {
    if (!data) return;
    if (demo)
      persist({ ...data, members: data.members.map((m) => (m.id === id ? { ...m, role } : m)) });
    else if (supabase) {
      const r = await supabase.rpc('change_member_role', {
        p_team_id: data.team.id,
        p_user_id: id,
        p_role: role,
      });
      if (r.error) throw r.error;
      await load(currentUserId);
    }
  }
  async function signOut() {
    if (demo && supabase) {
      sessionStorage.removeItem('flow-demo');
      setDemo(false);
      setData(null);
    } else if (supabase) {
      const r = await supabase.auth.signOut();
      if (r.error) throw r.error;
      setUser(null);
      setData(null);
    }
  }
  const enterDemo = () => {
    sessionStorage.setItem('flow-demo', 'true');
    setDemo(true);
    setError('');
  };
  return {
    demo,
    user,
    data,
    loading,
    error,
    setError,
    currentUserId,
    save,
    remove,
    upload,
    download,
    createTeam,
    renameTeam,
    updateProfile,
    updateRole,
    signOut,
    enterDemo,
    toast,
    setToast,
    recovery,
    setRecovery,
    reload: () => load(currentUserId, true),
    resetDemo: () => {
      persist(createDemo());
      setToast('A mintaadatokat visszaállítottuk.');
    },
  };
}
type FlowContext = ReturnType<typeof useFlowState>;
const Context = createContext<FlowContext | null>(null);
export function FlowProvider({ children }: { children: ReactNode }) {
  const value = useFlowState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useFlow() {
  const context = useContext(Context);
  if (!context) throw new Error('Missing provider');
  return context;
}
