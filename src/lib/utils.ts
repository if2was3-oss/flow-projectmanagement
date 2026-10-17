import type { Project, Task } from './types';
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
export function formatDate(value: string, long = false) {
  if (!value) return 'Nincs határidő';
  return new Intl.DateTimeFormat('hu-HU', {
    month: long ? 'long' : 'short',
    day: 'numeric',
  }).format(new Date(value + 'T12:00:00'));
}
export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
}
export function progress(project: Project, tasks: Task[]) {
  const list = tasks.filter((t) => t.project_id === project.id);
  return list.length
    ? Math.round((list.filter((t) => t.status === 'done').length / list.length) * 100)
    : 0;
}
export function isOverdue(task: Task) {
  return !!task.due_date && task.due_date < dateKey() && task.status !== 'done';
}
export function isOpen(task: Task) {
  return task.status !== 'done';
}
export function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Épp most';
  if (minutes < 60) return `${minutes} perce`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} órája`;
  return `${Math.floor(minutes / 1440)} napja`;
}
export function fileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.round(size / 1024)} KB`
    : `${(size / 1024 / 1024).toFixed(1)} MB`;
}
export function activeTasks(projects: Project[], tasks: Task[]) {
  const ids = new Set(projects.filter((p) => p.status !== 'archived').map((p) => p.id));
  return tasks.filter((t) => ids.has(t.project_id));
}
export function errorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : (error as { message?: string })?.message || '';
  if (/Invalid login credentials/i.test(message)) return 'Hibás e-mail-cím vagy jelszó.';
  if (/Email not confirmed/i.test(message))
    return 'Először erősítsd meg az e-mail-címedet a kapott levélben.';
  if (/already registered/i.test(message)) return 'Ezzel az e-mail-címmel már van fiók.';
  if (/rate limit/i.test(message)) return 'Túl sok próbálkozás. Kérjük, próbáld újra később.';
  if (/fetch|network/i.test(message))
    return 'Nem sikerült kapcsolódni. Ellenőrizd az internetkapcsolatot.';
  if (/row-level|permission|42501/i.test(message)) return 'Ehhez a művelethez nincs jogosultságod.';
  return 'A művelet nem sikerült. Próbáld újra, vagy ellenőrizd a szolgáltatás beállításait.';
}
