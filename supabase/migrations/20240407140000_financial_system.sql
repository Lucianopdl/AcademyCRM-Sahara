-- SQL Migration: Financial Automation & Plans
-- ==========================================

-- 1. Table for defined plans (Subscription models)
create table if not exists public.plans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid default auth.uid() references auth.users(id),
    name text not null,
    description text,
    amount numeric(10, 2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Link students to plans (A student can have multiple plans/classes)
create table if not exists public.student_plans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid default auth.uid() references auth.users(id),
    student_id uuid references public.students(id) on delete cascade not null,
    plan_id uuid references public.plans(id) on delete cascade not null,
    enrollment_date date default current_date,
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, plan_id)
);

-- 3. Monthly Fees (Expected payments/Invoices)
-- Each record represents a month the student should pay.
create table if not exists public.fees (
    id uuid default gen_random_uuid() primary key,
    user_id uuid default auth.uid() references auth.users(id),
    student_id uuid references public.students(id) on delete cascade not null,
    month int check (month between 1 and 12),
    year int,
    total_amount numeric(10, 2) not null,
    paid_amount numeric(10, 2) default 0,
    status text default 'pending' check (status in ('pending', 'partial', 'paid', 'canceled')),
    due_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, month, year)
);

-- 4. Update Payments to link with Fees
alter table public.payments add column if not exists fee_id uuid references public.fees(id) on delete set null;

-- 5. Enable RLS
alter table public.plans enable row level security;
alter table public.student_plans enable row level security;
alter table public.fees enable row level security;

-- 6. Policies (Multitenancy)
create policy "Plans multitenancy" on public.plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Student Plans multitenancy" on public.student_plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Fees multitenancy" on public.fees for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. Trigger to auto-update fee status when payment is recorded
create or replace function public.update_fee_status_on_payment()
returns trigger as $$
begin
    if (new.fee_id is not null) then
        update public.fees 
        set 
            paid_amount = (select coalesce(sum(amount), 0) from public.payments where fee_id = new.fee_id),
            status = case 
                        when (select coalesce(sum(amount), 0) from public.payments where fee_id = new.fee_id) >= total_amount then 'paid'
                        when (select coalesce(sum(amount), 0) from public.payments where fee_id = new.fee_id) > 0 then 'partial'
                        else 'pending' 
                     end
        where id = new.fee_id;
    end if;
    return new;
end;
$$ language plpgsql security definer;

create trigger on_payment_update_fee
after insert or update of amount or delete on public.payments
for each row execute function public.update_fee_status_on_payment();
