-- Flow MVP: single workspace per account, team-scoped PostgreSQL data.
-- Run once in a new Supabase project via the SQL editor or `supabase db push`.
begin;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 100),
 email text not null,
 job_title text not null default '',
 color text not null default '#e9ddd5'
);
create table public.teams (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 80),
 owner_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create table public.team_members (
 team_id uuid not null references public.teams(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','admin','member')),
 created_at timestamptz not null default now(),
 primary key(team_id,user_id), unique(user_id)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 description text not null default '',
 status text not null default 'active' check(status in ('active','planned','completed','archived')),
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 start_date date not null default current_date,
 due_date date not null check(due_date >= start_date),
 owner_id uuid,
 color text not null default 'peach' check(color in ('peach','sage','lavender','sand','blue')),
 icon text not null default 'folder' check(icon in ('folder','sparkles','palette','globe')),
 created_at timestamptz not null default now(),
 unique(id,team_id),
 foreign key(team_id,owner_id) references public.team_members(team_id,user_id)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 project_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 180),
 description text not null default '',
 status text not null default 'todo' check(status in ('todo','in_progress','review','done')),
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 due_date date not null,
 assignee_id uuid,
 created_at timestamptz not null default now(),
 unique(id,team_id),
 foreign key(project_id,team_id) references public.projects(id,team_id) on delete cascade,
 foreign key(team_id,assignee_id) references public.team_members(team_id,user_id)
);
create table public.checklist (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 task_id uuid not null,
 text text not null check(length(trim(text)) between 1 and 500),
 completed boolean not null default false,
 foreign key(task_id,team_id) references public.tasks(id,team_id) on delete cascade
);
create table public.comments (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 task_id uuid not null,
 author_id uuid not null default auth.uid(),
 body text not null check(length(trim(body)) between 1 and 5000),
 created_at timestamptz not null default now(),
 foreign key(task_id,team_id) references public.tasks(id,team_id) on delete cascade,
 foreign key(team_id,author_id) references public.team_members(team_id,user_id)
);
create table public.attachments (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 task_id uuid not null,
 name text not null check(length(name) between 1 and 255),
 size bigint not null check(size >= 0 and size <= 10485760),
 path text not null unique,
 uploaded_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 foreign key(task_id,team_id) references public.tasks(id,team_id) on delete cascade,
 foreign key(team_id,uploaded_by) references public.team_members(team_id,user_id),
 check (split_part(path,'/',1)=team_id::text and split_part(path,'/',2)=task_id::text)
);
create table public.activity (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 actor_id uuid not null references public.profiles(id),
 message text not null,
 created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,
 task_id uuid,
 kind text not null check(kind in ('assignment','mention','comment','deadline','overdue')),
 read boolean not null default false,
 dedupe_key text unique,
 created_at timestamptz not null default now(),
 foreign key(task_id,team_id) references public.tasks(id,team_id) on delete cascade
);
create table public.invitations (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 email text not null check(email = lower(trim(email)) and email like '%@%.%'),
 role text not null default 'member' check(role in ('admin','member')),
 created_at timestamptz not null default now(),
 unique(team_id,email)
);
create index projects_team_idx on public.projects(team_id);
create index tasks_team_due_idx on public.tasks(team_id,due_date);
create index tasks_project_idx on public.tasks(project_id);
create index comments_task_idx on public.comments(team_id,task_id);
create index checklist_task_idx on public.checklist(team_id,task_id);
create index attachments_task_idx on public.attachments(team_id,task_id);
create index activity_team_time_idx on public.activity(team_id,created_at desc);
create index notifications_user_idx on public.notifications(user_id,team_id,created_at desc);
create index invitations_email_idx on public.invitations(email);

create function public.sync_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name,email) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Csapattag'),100),lower(coalesce(new.email,'')))
 on conflict(id) do update set email=excluded.email;
 return new;
end $$;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.sync_profile();
insert into public.profiles(id,name,email) select id,left(coalesce(nullif(trim(raw_user_meta_data->>'name'),''),'Csapattag'),100),lower(coalesce(email,'')) from auth.users on conflict(id) do nothing;

create function public.is_team_member(p_team_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_members where team_id=p_team_id and user_id=auth.uid());
$$;
create function public.is_team_admin(p_team_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_members where team_id=p_team_id and user_id=auth.uid() and role in ('owner','admin'));
$$;
create function public.shares_team(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_user_id=auth.uid() or exists(select 1 from public.team_members a join public.team_members b on a.team_id=b.team_id where a.user_id=auth.uid() and b.user_id=p_user_id);
$$;
create function public.create_team(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare team uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Serialize workspace creation and invitation acceptance for the same account.
 perform 1 from public.profiles where id=auth.uid() for update;
 if exists(select 1 from public.team_members where user_id=auth.uid()) then raise exception 'An account already has a workspace'; end if;
 insert into public.teams(name,owner_id) values(trim(p_name),auth.uid()) returning id into team;
 insert into public.team_members(team_id,user_id,role) values(team,auth.uid(),'owner');
 return team;
end $$;
create function public.accept_team_invitations() returns void language plpgsql security definer set search_path='' as $$
declare invite public.invitations; user_email text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if exists(select 1 from public.team_members where user_id=auth.uid()) then return; end if;
 select lower(email) into user_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if user_email is null then return; end if;
 select * into invite from public.invitations where email=user_email order by created_at,id limit 1 for update;
 if found then
  insert into public.team_members(team_id,user_id,role) values(invite.team_id,auth.uid(),invite.role);
  delete from public.invitations where id=invite.id;
 end if;
end $$;
create function public.change_member_role(p_team_id uuid,p_user_id uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.team_members where team_id=p_team_id and user_id=auth.uid() and role='owner') then raise exception 'Permission denied' using errcode='42501'; end if;
 if p_role not in ('admin','member') then raise exception 'Invalid role'; end if;
 if p_user_id=auth.uid() then raise exception 'Cannot change owner role'; end if;
 update public.team_members set role=p_role where team_id=p_team_id and user_id=p_user_id and role<>'owner';
end $$;

-- Enable RLS on every application table; no anonymous access is granted.
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.checklist enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activity enable row level security;
alter table public.notifications enable row level security;
alter table public.invitations enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(public.shares_team(id));
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy teams_read on public.teams for select to authenticated using(public.is_team_member(id));
create policy teams_update on public.teams for update to authenticated using(public.is_team_admin(id)) with check(public.is_team_admin(id));
create policy members_read on public.team_members for select to authenticated using(public.is_team_member(team_id));
create policy projects_read on public.projects for select to authenticated using(public.is_team_member(team_id));
create policy projects_insert on public.projects for insert to authenticated with check(public.is_team_member(team_id));
create policy projects_update on public.projects for update to authenticated using(public.is_team_member(team_id)) with check(public.is_team_member(team_id));
create policy tasks_read on public.tasks for select to authenticated using(public.is_team_member(team_id));
create policy tasks_insert on public.tasks for insert to authenticated with check(public.is_team_member(team_id));
create policy tasks_update on public.tasks for update to authenticated using(public.is_team_member(team_id)) with check(public.is_team_member(team_id));
create policy checklist_team on public.checklist for all to authenticated using(public.is_team_member(team_id)) with check(public.is_team_member(team_id));
create policy comments_read on public.comments for select to authenticated using(public.is_team_member(team_id));
create policy comments_insert on public.comments for insert to authenticated with check(public.is_team_member(team_id) and author_id=auth.uid());
create policy comments_update on public.comments for update to authenticated using(public.is_team_member(team_id) and author_id=auth.uid()) with check(public.is_team_member(team_id) and author_id=auth.uid());
create policy comments_delete on public.comments for delete to authenticated using(public.is_team_member(team_id) and author_id=auth.uid());
create policy attachments_read on public.attachments for select to authenticated using(public.is_team_member(team_id));
create policy attachments_insert on public.attachments for insert to authenticated with check(public.is_team_member(team_id) and uploaded_by=auth.uid());
create policy activity_read on public.activity for select to authenticated using(public.is_team_member(team_id));
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid() and public.is_team_member(team_id));
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid() and public.is_team_member(team_id)) with check(user_id=auth.uid() and public.is_team_member(team_id));
create policy invitations_manage on public.invitations for all to authenticated using(public.is_team_admin(team_id)) with check(public.is_team_admin(team_id));

-- Explicit column grants prevent changing identities, team membership or ownership.
revoke all on public.profiles,public.teams,public.team_members,public.projects,public.tasks,public.checklist,public.comments,public.attachments,public.activity,public.notifications,public.invitations from anon,authenticated;
grant select on public.profiles,public.teams,public.team_members,public.projects,public.tasks,public.checklist,public.comments,public.attachments,public.activity,public.notifications,public.invitations to authenticated;
grant update(name,job_title,color) on public.profiles to authenticated;
grant update(name) on public.teams to authenticated;
grant insert on public.projects,public.tasks,public.checklist,public.comments,public.attachments,public.invitations to authenticated;
grant update(name,description,status,priority,start_date,due_date,owner_id,color,icon) on public.projects to authenticated;
grant update(project_id,title,description,status,priority,due_date,assignee_id) on public.tasks to authenticated;
grant update(text,completed) on public.checklist to authenticated;
grant update(body) on public.comments to authenticated;
grant update(read) on public.notifications to authenticated;
grant delete on public.checklist,public.comments,public.invitations to authenticated;

-- Activity and notifications are generated on the server, never trusted to clients.
create function public.record_project_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then
 insert into public.activity(team_id,actor_id,message) values(new.team_id,auth.uid(),case when TG_OP='INSERT' then 'létrehozta a projektet: ' else 'frissítette a projektet: ' end || new.name);
 end if;
 return new;
end $$;
create trigger project_activity after insert or update on public.projects for each row execute function public.record_project_activity();
create function public.record_task_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then
 insert into public.activity(team_id,actor_id,message) values(new.team_id,auth.uid(),case when TG_OP='INSERT' then 'új feladatot hozott létre: ' when new.status='done' and old.status is distinct from new.status then 'befejezte: ' else 'frissítette a feladatot: ' end || new.title);
 end if;
 if new.assignee_id is not null and (TG_OP='INSERT' or new.assignee_id is distinct from old.assignee_id) then
 insert into public.notifications(team_id,user_id,title,task_id,kind) values(new.team_id,new.assignee_id,'Új feladatod: '||new.title,new.id,'assignment');
 end if;
 return new;
end $$;
create trigger task_activity after insert or update on public.tasks for each row execute function public.record_task_activity();
create function public.record_comment_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare task public.tasks; person record; actor_name text;
begin
 select * into task from public.tasks where id=new.task_id and team_id=new.team_id;
 select name into actor_name from public.profiles where id=new.author_id;
 insert into public.activity(team_id,actor_id,message) values(new.team_id,new.author_id,'hozzászólt: '||task.title);
 for person in select p.id,p.email from public.profiles p join public.team_members tm on tm.user_id=p.id where tm.team_id=new.team_id and p.id<>new.author_id loop
 if strpos(lower(new.body),'@'||lower(person.email))>0 then
 insert into public.notifications(team_id,user_id,title,task_id,kind) values(new.team_id,person.id,actor_name||' megemlített: '||task.title,task.id,'mention');
 elsif person.id=task.assignee_id or exists(select 1 from public.comments c where c.task_id=task.id and c.author_id=person.id) then
 insert into public.notifications(team_id,user_id,title,task_id,kind) values(new.team_id,person.id,actor_name||' hozzászólt: '||task.title,task.id,'comment');
 end if;
 end loop;
 return new;
end $$;
create trigger comment_activity after insert on public.comments for each row execute function public.record_comment_activity();
create function public.refresh_deadline_notifications(p_team_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_team_member(p_team_id) then raise exception 'Permission denied' using errcode='42501'; end if;
 insert into public.notifications(team_id,user_id,title,task_id,kind,dedupe_key)
 select t.team_id,t.assignee_id,case when t.due_date<(now() at time zone 'Europe/Budapest')::date then 'Lejárt határidő: ' else 'Közeleg a határidő: ' end||t.title,t.id,
 case when t.due_date<(now() at time zone 'Europe/Budapest')::date then 'overdue' else 'deadline' end,
 t.id::text||':'||t.assignee_id::text||':'||t.due_date::text||':'||case when t.due_date<(now() at time zone 'Europe/Budapest')::date then 'overdue' else 'deadline' end
 from public.tasks t join public.projects p on p.id=t.project_id where t.team_id=p_team_id and t.assignee_id=auth.uid() and t.status<>'done' and p.status<>'archived' and t.due_date<=(now() at time zone 'Europe/Budapest')::date+2
 on conflict(dedupe_key) do nothing;
end $$;

-- Private bucket. Clients receive expiring signed URLs only after RLS checks.
insert into storage.buckets(id,name,public,file_size_limit) values('attachments','attachments',false,10485760) on conflict(id) do nothing;
create function public.can_access_attachment(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tasks t join public.team_members m on m.team_id=t.team_id where m.user_id=auth.uid() and t.team_id::text=split_part(p_path,'/',1) and t.id::text=split_part(p_path,'/',2));
$$;
create policy flow_files_read on storage.objects for select to authenticated using(bucket_id='attachments' and public.can_access_attachment(name));
create policy flow_files_insert on storage.objects for insert to authenticated with check(bucket_id='attachments' and public.can_access_attachment(name));
-- Allow the uploader to clean up an upload if metadata insertion failed.
create policy flow_files_delete on storage.objects for delete to authenticated using(bucket_id='attachments' and owner_id=auth.uid()::text and public.can_access_attachment(name));

revoke all on function public.sync_profile(),public.record_project_activity(),public.record_task_activity(),public.record_comment_activity() from public,anon,authenticated;
revoke all on function public.is_team_member(uuid),public.is_team_admin(uuid),public.shares_team(uuid),public.create_team(text),public.accept_team_invitations(),public.change_member_role(uuid,uuid,text),public.refresh_deadline_notifications(uuid),public.can_access_attachment(text) from public,anon;
grant execute on function public.is_team_member(uuid),public.is_team_admin(uuid),public.shares_team(uuid),public.create_team(text),public.accept_team_invitations(),public.change_member_role(uuid,uuid,text),public.refresh_deadline_notifications(uuid),public.can_access_attachment(text) to authenticated;

-- Supabase Realtime uses RLS to scope subscriptions. Add only if the publication exists.
do $$ declare tab text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 foreach tab in array array['team_members','projects','tasks','checklist','comments','attachments','activity','notifications','invitations'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tab) then
 execute format('alter publication supabase_realtime add table public.%I',tab);
 end if;
 end loop;
 end if;
end $$;
commit;
