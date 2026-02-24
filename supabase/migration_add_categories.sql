-- 为后台自定义分类与文章分类功能新增字段

alter table public.site_settings
  add column if not exists categories jsonb not null default '[]'::jsonb;

alter table public.posts
  add column if not exists category text not null default '';
