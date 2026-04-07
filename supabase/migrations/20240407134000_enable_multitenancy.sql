-- ==========================================
-- SCRIPT DE MULTI-TENANCY (SaaS Isolation)
-- Correr en el Dashboard de Supabase -> SQL Editor
-- ==========================================

-- 1. Asegurar la columna user_id en todas las tablas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='user_id') THEN
        ALTER TABLE public.settings ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='user_id') THEN
        ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='user_id') THEN
        ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='user_id') THEN
        ALTER TABLE public.classes ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='user_id') THEN
        ALTER TABLE public.enrollments ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='user_id') THEN
        ALTER TABLE public.payments ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

-- 2. Activar Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas (Limpiar las anteriores si existen)
DROP POLICY IF EXISTS "Settings multitenancy" ON public.settings;
CREATE POLICY "Settings multitenancy" ON public.settings 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students multitenancy" ON public.students;
CREATE POLICY "Students multitenancy" ON public.students 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Categories multitenancy" ON public.categories;
CREATE POLICY "Categories multitenancy" ON public.categories 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Classes multitenancy" ON public.classes;
CREATE POLICY "Classes multitenancy" ON public.classes 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Payments multitenancy" ON public.payments;
CREATE POLICY "Payments multitenancy" ON public.payments 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enrollments multitenancy" ON public.enrollments;
CREATE POLICY "Enrollments multitenancy" ON public.enrollments 
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
