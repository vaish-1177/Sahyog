import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
test('setup SQL executes; trigger limits initial roles; browser roles cannot read or mutate private records',async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id serial,name text,bucket_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema public,auth,storage to authenticated,anon,service_role;grant execute on function auth.uid(),storage.foldername(text) to authenticated;
 grant insert,select on storage.objects to authenticated;grant usage on sequence storage.objects_id_seq to authenticated;`);
 await db.exec(fs.readFileSync('supabase/setup.sql','utf8'));
 const id='11111111-1111-4111-8111-111111111111';await db.query(`insert into auth.users values ($1,'test@example.com','{"name":"Test","requested_role":"admin"}')`,[id]);
 assert.equal((await db.query('select role from public.sahyog_members')).rows[0].role,'borrower');
 await db.exec('set role authenticated');
 for(const sql of ['select * from public.sahyog_state','select * from public.sahyog_members',"update public.sahyog_members set role='admin'"]){await assert.rejects(db.exec(sql),/permission denied/)}
 await db.exec(`select set_config('request.jwt.claim.sub','${id}',false)`);
 await db.query(`insert into storage.objects(name,bucket_id) values ($1,'sahyog-evidence')`,[id+'/photo.jpg']);
 await assert.rejects(db.exec("insert into storage.objects(name,bucket_id) values ('other/photo.jpg','sahyog-evidence')"),/row-level security/);
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await db.exec('reset role; set role service_role');assert.equal((await db.query('select * from public.sahyog_state')).rows.length,1);
 await db.exec('reset role');const first=await db.query('update public.sahyog_state set revision=1 where revision=0 returning id');const stale=await db.query('update public.sahyog_state set revision=2 where revision=0 returning id');assert.equal(first.rows.length,1);assert.equal(stale.rows.length,0);
 await db.close();
});
