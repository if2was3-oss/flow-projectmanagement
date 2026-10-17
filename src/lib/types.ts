export type Status = 'todo' | 'in_progress' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type ProjectStatus = 'active' | 'planned' | 'completed' | 'archived';
export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  job_title: string;
  color: string;
}
export interface Project {
  id: string;
  team_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  start_date: string;
  due_date: string;
  owner_id: string | null;
  color: string;
  icon: string;
  created_at: string;
}
export interface Task {
  id: string;
  team_id: string;
  project_id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string;
  assignee_id: string | null;
  created_at: string;
}
export interface CheckItem {
  id: string;
  task_id: string;
  team_id: string;
  text: string;
  completed: boolean;
}
export interface Comment {
  id: string;
  task_id: string;
  team_id: string;
  author_id: string;
  body: string;
  created_at: string;
}
export interface Attachment {
  id: string;
  task_id: string;
  team_id: string;
  name: string;
  size: number;
  path: string;
  uploaded_by: string;
  created_at: string;
}
export interface Activity {
  id: string;
  team_id: string;
  actor_id: string;
  message: string;
  created_at: string;
}
export interface Notice {
  id: string;
  team_id: string;
  user_id: string;
  title: string;
  task_id: string | null;
  kind: string;
  read: boolean;
  created_at: string;
}
export interface Invitation {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member';
  created_at: string;
}
export interface Data {
  team: { id: string; name: string };
  members: Member[];
  projects: Project[];
  tasks: Task[];
  checklist: CheckItem[];
  comments: Comment[];
  attachments: Attachment[];
  activity: Activity[];
  notifications: Notice[];
  invitations: Invitation[];
}
export type Entity =
  'projects' | 'tasks' | 'checklist' | 'comments' | 'attachments' | 'notifications' | 'invitations';
export const statuses: Record<Status, string> = {
  todo: 'Teendő',
  in_progress: 'Folyamatban',
  review: 'Ellenőrzés',
  done: 'Kész',
};
export const priorities: Record<Priority, string> = {
  low: 'Alacsony',
  medium: 'Normál',
  high: 'Magas',
};
export const projectStatuses: Record<ProjectStatus, string> = {
  active: 'Folyamatban',
  planned: 'Tervezés',
  completed: 'Lezárva',
  archived: 'Archivált',
};
export const roles = { owner: 'Tulajdonos', admin: 'Adminisztrátor', member: 'Csapattag' };
