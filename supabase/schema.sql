-- Run this in Supabase SQL Editor before migrate-to-supabase.js.
create table if not exists users (id bigint primary key, ten text not null unique, mat_khau_hash text not null, han_muc_ngay bigint not null default 150000, ngay_tao date not null);
create table if not exists categories (id bigint primary key, user_id bigint not null references users(id) on delete cascade, ten text not null, icon text not null default '🏷️', mau_sac text not null default '#FF4E8E', la_mac_dinh boolean not null default false, thu_tu integer not null default 0, ngay_tao timestamptz not null default now());
create table if not exists expenses (id bigint primary key, user_id bigint not null references users(id) on delete cascade, so_tien bigint not null, ghi_chu text, duong_dan_anh text, ngay_tao date not null, created_at timestamptz not null, la_mau boolean not null default false);
create table if not exists expense_categories (expense_id bigint not null references expenses(id) on delete cascade, category_id bigint not null references categories(id) on delete cascade, primary key (expense_id, category_id));
create table if not exists han_muc_history (id bigint primary key, user_id bigint not null references users(id) on delete cascade, han_muc_ngay bigint not null, ngay_hieu_luc date not null, created_at timestamptz not null);
alter table users enable row level security;
alter table categories enable row level security;
alter table expenses enable row level security;
alter table expense_categories enable row level security;
alter table han_muc_history enable row level security;
insert into storage.buckets (id, name, public) values ('expense-images', 'expense-images', true) on conflict (id) do nothing;
