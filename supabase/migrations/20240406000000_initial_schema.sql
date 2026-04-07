-- Initial Schema for Academia CRM

-- 1. Categories
create table if not exists public.categories (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Classes
create table if not exists public.classes (
    id uuid default gen_random_uuid() primary key,
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    teacher_name text,
    schedule text,
    level text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Students
create table if not exists public.students (
    id uuid default gen_random_uuid() primary key,
    full_name text not null,
    email text unique,
    phone text,
    birth_date date,
    status text default 'active' check (status in ('active', 'inactive', 'on_hold')),
    photo_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    enrollment_date date default current_date
);

-- 4. Enrollments (Many-to-Many between Students and Classes)
create table if not exists public.enrollments (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    class_id uuid references public.classes(id) on delete cascade not null,
    enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, class_id)
);

-- 5. Payments (Fees)
create table if not exists public.payments (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    amount numeric(10, 2) not null,
    payment_date timestamp with time zone default timezone('utc'::text, now()) not null,
    period_month int check (period_month between 1 and 12),
    period_year int,
    payment_method text check (payment_method in ('cash', 'transfer', 'card', 'other')),
    receipt_number text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.categories enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.payments enable row level security;

-- Simple Policies (Placeholder: Allow all for authenticated users)
-- In a real scenario, we would refine these based on user roles.
create policy "Allow all for authenticated users" on public.categories for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on public.classes for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on public.students for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on public.enrollments for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on public.payments for all using (auth.role() = 'authenticated');
