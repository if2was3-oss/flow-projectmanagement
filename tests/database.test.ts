import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const ids = {
  alice: '00000000-0000-4000-8000-000000000001',
  bob: '00000000-0000-4000-8000-000000000002',
  carol: '00000000-0000-4000-8000-000000000003',
  eve: '00000000-0000-4000-8000-000000000004',
};
let db: PGlite, teamA: string, teamB: string, projectA: string, projectB: string, taskA: string;
async function asUser<T>(id: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(
    `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`,
  );
  try {
    const result = await fn();
    await db.exec('commit');
    return result;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}
async function query(sql: string, params: unknown[] = []) {
  return (await db.query<Record<string, any>>(sql, params)).rows;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create schema storage;grant usage on schema public,auth,storage to authenticated,anon;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
 alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;`);
  await db.exec(readFileSync('supabase/migrations/202610160001_flow.sql', 'utf8'));
  for (const [name, id] of Object.entries(ids)) {
    await query(
      'insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,$4)',
      [
        id,
        `${name}@flow.test`,
        JSON.stringify({ name }),
        name === 'eve' ? null : new Date().toISOString(),
      ],
    );
  }
  teamA = await asUser(
    ids.alice,
    async () => (await query("select public.create_team('A csapat') id"))[0].id,
  );
  teamB = await asUser(
    ids.bob,
    async () => (await query("select public.create_team('B csapat') id"))[0].id,
  );
  await asUser(ids.alice, () =>
    query("insert into invitations(team_id,email) values($1,'carol@flow.test')", [teamA]),
  );
  await asUser(ids.carol, () => query('select accept_team_invitations()'));
  projectA = await asUser(
    ids.alice,
    async () =>
      (
        await query(
          "insert into projects(team_id,name,due_date,owner_id) values($1,'A projekt',current_date+10,$2) returning id",
          [teamA, ids.alice],
        )
      )[0].id,
  );
  projectB = await asUser(
    ids.bob,
    async () =>
      (
        await query(
          "insert into projects(team_id,name,due_date) values($1,'B projekt',current_date+10) returning id",
          [teamB],
        )
      )[0].id,
  );
  taskA = await asUser(
    ids.alice,
    async () =>
      (
        await query(
          "insert into tasks(team_id,project_id,title,due_date,assignee_id) values($1,$2,'Közös feladat',current_date,$3) returning id",
          [teamA, projectA, ids.carol],
        )
      )[0].id,
  );
});
afterAll(async () => {
  await db?.close();
});
describe('PostgreSQL team isolation and privileges', () => {
  it('runs the complete migration and creates profiles from auth users', async () => {
    const rows = await asUser(ids.alice, () => query('select id from profiles order by id'));
    expect(rows.map((r) => r.id)).toEqual([ids.alice, ids.carol]);
  });
  it('isolates project reads across workspaces', async () => {
    const rows = await asUser(ids.bob, () => query('select id from projects'));
    expect(rows.map((r) => r.id)).toEqual([projectB]);
  });
  it('rejects inserting into another team', async () => {
    await expect(
      asUser(ids.bob, () =>
        query(
          "insert into projects(team_id,name,due_date) values($1,'Illetéktelen',current_date)",
          [teamA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
  it('prevents edits to another team', async () => {
    const rows = await asUser(ids.bob, () =>
      query("update tasks set title='Illetéktelen' where id=$1 returning id", [taskA]),
    );
    expect(rows).toHaveLength(0);
  });
  it('rejects cross-team assignees and project links', async () => {
    await expect(
      asUser(ids.alice, () =>
        query('update tasks set assignee_id=$1 where id=$2', [ids.bob, taskA]),
      ),
    ).rejects.toThrow(/foreign key/i);
    await expect(
      asUser(ids.alice, () =>
        query('update tasks set project_id=$1 where id=$2', [projectB, taskA]),
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it('allows shared task editing within a team', async () => {
    await asUser(ids.carol, () => query("update tasks set status='review' where id=$1", [taskA]));
    const rows = await asUser(ids.alice, () =>
      query('select status from tasks where id=$1', [taskA]),
    );
    expect(rows[0].status).toBe('review');
  });
  it('prevents role escalation and identity changes', async () => {
    await expect(
      asUser(ids.carol, () =>
        query("update team_members set role='owner' where user_id=$1", [ids.carol]),
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(ids.carol, () =>
        query("select change_member_role($1,$2,'admin')", [teamA, ids.carol]),
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(ids.alice, () => query('update tasks set team_id=$1 where id=$2', [teamB, taskA])),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(ids.carol, () =>
        query("update profiles set email='alice@flow.test' where id=$1", [ids.carol]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
  it('prevents regular members inviting or creating multiple workspaces', async () => {
    await expect(
      asUser(ids.carol, () =>
        query("insert into invitations(team_id,email) values($1,'other@flow.test')", [teamA]),
      ),
    ).rejects.toThrow(/row-level security/i);
    await expect(asUser(ids.carol, () => query("select create_team('Másik')"))).rejects.toThrow(
      /already has a workspace/i,
    );
  });
  it('accepts invitations only for verified matching identities', async () => {
    await asUser(ids.alice, () =>
      query("insert into invitations(team_id,email) values($1,'eve@flow.test')", [teamA]),
    );
    await asUser(ids.eve, () => query('select accept_team_invitations()'));
    expect(await asUser(ids.eve, () => query('select * from team_members'))).toHaveLength(0);
    await query('update auth.users set email_confirmed_at=now() where id=$1', [ids.eve]);
    await asUser(ids.eve, () => query('select accept_team_invitations()'));
    expect(
      (
        await asUser(ids.eve, () =>
          query('select role from team_members where user_id=$1', [ids.eve]),
        )
      )[0].role,
    ).toBe('member');
  });
  it('allows only the owner to change member roles', async () => {
    await asUser(ids.alice, () =>
      query("select change_member_role($1,$2,'admin')", [teamA, ids.carol]),
    );
    expect(
      (
        await asUser(ids.carol, () =>
          query('select role from team_members where user_id=$1', [ids.carol]),
        )
      )[0].role,
    ).toBe('admin');
  });
  it('creates assignment and mention notifications for their recipient only', async () => {
    await asUser(ids.alice, () =>
      query(
        "insert into comments(team_id,task_id,author_id,body) values($1,$2,$3,'Szia @carol@flow.test, nézd meg!')",
        [teamA, taskA, ids.alice],
      ),
    );
    const rows = await asUser(ids.carol, () =>
      query('select kind from notifications where task_id=$1', [taskA]),
    );
    expect(rows.map((r) => r.kind)).toContain('assignment');
    expect(rows.map((r) => r.kind)).toContain('mention');
    expect(await asUser(ids.bob, () => query('select * from notifications'))).toHaveLength(0);
    await expect(
      asUser(ids.bob, () =>
        query("insert into comments(team_id,task_id,author_id,body) values($1,$2,$3,'Hamis')", [
          teamA,
          taskA,
          ids.alice,
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
  it('deduplicates deadline notifications and permits marking them read', async () => {
    await asUser(ids.carol, () => query('select refresh_deadline_notifications($1)', [teamA]));
    await asUser(ids.carol, () => query('select refresh_deadline_notifications($1)', [teamA]));
    const rows = await asUser(ids.carol, () =>
      query("select id from notifications where kind='deadline'"),
    );
    expect(rows).toHaveLength(1);
    await asUser(ids.carol, () =>
      query('update notifications set read=true where id=$1', [rows[0].id]),
    );
    expect(
      (
        await asUser(ids.carol, () =>
          query('select read from notifications where id=$1', [rows[0].id]),
        )
      )[0].read,
    ).toBe(true);
    await expect(
      asUser(ids.carol, () =>
        query('update notifications set user_id=$1 where id=$2', [ids.bob, rows[0].id]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
  it('protects private storage paths with team membership', async () => {
    const path = `${teamA}/${taskA}/test/brief.txt`;
    await asUser(ids.alice, () =>
      query("insert into storage.objects(bucket_id,name,owner_id) values('attachments',$1,$2)", [
        path,
        ids.alice,
      ]),
    );
    expect(await asUser(ids.carol, () => query('select * from storage.objects'))).toHaveLength(1);
    expect(await asUser(ids.bob, () => query('select * from storage.objects'))).toHaveLength(0);
    await expect(
      asUser(ids.bob, () =>
        query("insert into storage.objects(bucket_id,name,owner_id) values('attachments',$1,$2)", [
          path,
          ids.bob,
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
  it('denies anonymous reads and workspace creation', async () => {
    await db.exec('begin; set local role anon;');
    try {
      await expect(query('select * from projects')).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec('rollback');
    }
    await db.exec('begin; set local role anon;');
    try {
      await expect(query("select create_team('Névtelen')")).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec('rollback');
    }
  });
});
