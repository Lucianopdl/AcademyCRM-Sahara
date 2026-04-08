-- SQL Migration: Expenses System
-- ============================

-- 1. Table for expense categories
create table if not exists public.expense_categories (
    id uuid default gen_random_uuid() primary key,
    user_id uuid default auth.uid() references auth.users(id),
    name text not null,
    color text default '#E67E22',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Table for expenses
create table if not exists public.expenses (
    id uuid default gen_random_uuid() primary key,
    user_id uuid default auth.uid() references auth.users(id),
    description text not null,
    amount numeric(10, 2) not null,
    date date default current_date not null,
    category_id uuid references public.expense_categories(id) on delete set null,
    payment_method text default 'cash',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

-- 4. Policies (Multitenancy)
create policy "Expense categories multitenancy" on public.expense_categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Expenses multitenancy" on public.expenses for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Insert some initial categories
-- Note: In a production real-time multi-tenant app, this might be handled by a trigger on user creation or a prompt in the UI.
-- For now we enable the user to create them.
