create extension if not exists pgcrypto;

create table if not exists public.mandates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  title text not null,
  asset_type text,
  location text,
  description text,
  status text not null default 'active',
  created_at timestamp with time zone not null default now()
);
