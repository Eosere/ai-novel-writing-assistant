-- =====================================================================
-- AI NOVEL WRITING ASSISTANT DATABASE SCHEMA
-- Compatible with Supabase PostgreSQL
-- =====================================================================

-- Enable UUID Extension if not already present
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE (Numeric ID + Pass Hash Auth System)
create table if not exists public.users (
    id uuid default gen_random_uuid() primary key,
    numeric_id varchar(12) unique not null,
    password_hash text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_login timestamp with time zone default timezone('utc'::text, now())
);

-- 2. WRITINGS (Documents Table)
create table if not exists public.writings (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    title varchar(255) default '未命名草稿' not null,
    content text default '' not null,
    word_count integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    auto_saved_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. FORESHADOWINGS (Foreshadowing / Plot Plant Tracker)
create table if not exists public.foreshadowings (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    writing_id uuid references public.writings(id) on delete cascade not null,
    clue_title varchar(255) not null,
    content text not null,
    planted_at_position varchar(255) default '未知章节' not null,
    is_resolved boolean default false not null,
    resolved_at_position varchar(255),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. WRITING_LOGS (User Audit / Training Progress Logs)
create table if not exists public.writing_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    writing_id uuid references public.writings(id) on delete set null,
    action_type varchar(50) not null, -- 'create_draft', 'ai_analysis', 'resolve_foreshadow'
    details text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================================
create index if not exists idx_users_numeric_id on public.users(numeric_id);
create index if not exists idx_writings_user_id on public.writings(user_id);
create index if not exists idx_foreshadowings_writing_id on public.foreshadowings(writing_id);
create index if not exists idx_foreshadowings_user_id on public.foreshadowings(user_id);
create index if not exists idx_writing_logs_user_id on public.writing_logs(user_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.writings enable row level security;
alter table public.foreshadowings enable row level security;
alter table public.writing_logs enable row level security;

-- USERS Table Policies
create policy "Users can read their own profile"
    on public.users for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.users for update
    using (auth.uid() = id);

-- WRITINGS Table Policies
create policy "Users can read their own writings"
    on public.writings for select
    using (auth.uid() = user_id);

create policy "Users can create their own writings"
    on public.writings for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own writings"
    on public.writings for update
    using (auth.uid() = user_id);

create policy "Users can delete their own writings"
    on public.writings for delete
    using (auth.uid() = user_id);

-- FORESHADOWINGS Table Policies
create policy "Users can view their own foreshadowings"
    on public.foreshadowings for select
    using (auth.uid() = user_id);

create policy "Users can insert their own foreshadowings"
    on public.foreshadowings for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own foreshadowings"
    on public.foreshadowings for update
    using (auth.uid() = user_id);

create policy "Users can delete their own foreshadowings"
    on public.foreshadowings for delete
    using (auth.uid() = user_id);

-- WRITING LOGS Table Policies
create policy "Users can view their own logs"
    on public.writing_logs for select
    using (auth.uid() = user_id);

create policy "Users can insert their own logs"
    on public.writing_logs for insert
    with check (auth.uid() = user_id);
