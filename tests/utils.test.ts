import { describe, expect, it } from 'vitest';
import { createDemo } from '../src/lib/demo';
import { activeTasks, dateKey, isOverdue, offsetDate, progress } from '../src/lib/utils';
describe('dashboard calculations', () => {
  it('counts today, overdue, completed and archived project tasks correctly', () => {
    const d = createDemo();
    expect(d.tasks.filter((t) => t.due_date === dateKey() && t.status !== 'done')).toHaveLength(4);
    expect(d.tasks.filter(isOverdue)).toHaveLength(2);
    expect(d.tasks.filter((t) => t.status === 'done')).toHaveLength(11);
    const p = d.projects[0];
    expect(progress(p, d.tasks)).toBe(67);
    p.status = 'archived';
    expect(activeTasks(d.projects, d.tasks).some((t) => t.project_id === p.id)).toBe(false);
  });
  it('never treats completed tasks as overdue and handles empty projects', () => {
    const d = createDemo();
    expect(isOverdue({ ...d.tasks[0], status: 'done', due_date: offsetDate(-2) })).toBe(false);
    expect(progress(d.projects[3], [])).toBe(0);
  });
});
