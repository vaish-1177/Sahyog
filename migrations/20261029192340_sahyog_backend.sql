begin;
create schema if not exists sahyog_private;
revoke all on schema sahyog_private from public, anon, authenticated;
create table public.sahyog_members (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 name text not null default 'Member',
 role text not null default 'borrower' check(role in ('borrower','owner','admin')),
 certs text[] not null default '{}',
 created_at timestamptz not null default now()
);
create table public.sahyog_state (
 id integer primary key check(id=1),
 revision bigint not null default 0,
 data jsonb not null
);
alter table public.sahyog_members enable row level security;
alter table public.sahyog_state enable row level security;
revoke all on public.sahyog_members,public.sahyog_state from anon,authenticated;
grant all on public.sahyog_members,public.sahyog_state to service_role;
create function sahyog_private.create_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.sahyog_members(id,email,name,role)
 values(new.id,coalesce(new.email,''),left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Member'),80),
 case when new.raw_user_meta_data->>'requested_role'='owner' then 'owner' else 'borrower' end);
 return new;
end;
$$;
revoke all on function sahyog_private.create_member() from public,anon,authenticated;
create trigger sahyog_create_member after insert on auth.users for each row execute function sahyog_private.create_member();
insert into public.sahyog_members(id,email,name)
select id,coalesce(email,''),left(coalesce(raw_user_meta_data->>'name','Member'),80) from auth.users on conflict(id) do nothing;
insert into public.sahyog_state(id,data) values (1,'{"version":3,"revision":0,"session":null,"users":[],"resources":[],"bookings":[],"activity":[],"notifications":[],"incidents":[],"comments":[],"alerts":[],"favorites":{},"recent":{},"views":{},"policy":{"quota":20,"concurrent":3,"advance":30,"waitlist":true,"priority":"usage","noShow":"review"},"guide":false}'::jsonb);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('sahyog-evidence','sahyog-evidence',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy "Sahyog own upload" on storage.objects for insert to authenticated
with check(bucket_id='sahyog-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
