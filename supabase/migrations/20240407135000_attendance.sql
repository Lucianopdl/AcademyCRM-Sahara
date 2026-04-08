-- 6. Attendance
create table if not exists public.attendance (
    id uuid default gen_random_uuid() primary key,
    user_id uuid default auth.uid() references auth.users(id),
    student_id uuid references public.students(id) on delete cascade not null,
    class_id uuid references public.classes(id) on delete cascade not null,
    date date not null default current_date,
    status text not null check (status in ('present', 'absent', 'late', 'justified')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, class_id, date)
);

-- Enable RLS
alter table public.attendance enable row level security;

-- Policies
drop policy if exists "Attendance multitenancy" on public.attendance;
create policy "Attendance multitenancy" on public.attendance 
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
