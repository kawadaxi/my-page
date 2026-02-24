-- Supabase 初始化脚本（免费云端博客）

create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  title text not null default '我的 BLOG',
  tagline text not null default '思绪来得快去得也快，偶尔会在这里停留',
  about text not null default '你好，我是站长。这里是我的个人博客，主要记录技术、阅读和日常思考。',
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  published_date date not null default current_date,
  author text not null default '站长',
  excerpt text not null default '',
  content text not null,
  category text not null default '',
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.touch_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;
alter table public.posts enable row level security;

-- 公共读取
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
on public.site_settings
for select
using (true);

drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read"
on public.posts
for select
using (true);

-- 登录后可写（建议在 Supabase Auth 里关闭公开注册）
drop policy if exists "site_settings_auth_write" on public.site_settings;
create policy "site_settings_auth_write"
on public.site_settings
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "posts_auth_write" on public.posts;
create policy "posts_auth_write"
on public.posts
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Storage: 封面图 bucket
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post_images_public_read" on storage.objects;
create policy "post_images_public_read"
on storage.objects
for select
using (bucket_id = 'post-images');

drop policy if exists "post_images_auth_insert" on storage.objects;
create policy "post_images_auth_insert"
on storage.objects
for insert
with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

drop policy if exists "post_images_auth_update" on storage.objects;
create policy "post_images_auth_update"
on storage.objects
for update
using (bucket_id = 'post-images' and auth.role() = 'authenticated')
with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

drop policy if exists "post_images_auth_delete" on storage.objects;
create policy "post_images_auth_delete"
on storage.objects
for delete
using (bucket_id = 'post-images' and auth.role() = 'authenticated');
