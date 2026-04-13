-- ==========================================
-- MIGRACIÓN: MULTI-USER ACCESS VIA ACADEMY_ID
-- ==========================================

-- 1. Función optimizada para obtener el academy_id del usuario actual
-- Extraemos de la metadata del JWT para evitar consultas repetitivas a la tabla de perfiles
CREATE OR REPLACE FUNCTION public.get_my_academy_id() 
RETURNS uuid AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'academy_id')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Actualizar RLS en todas las tablas
-- Primero eliminamos políticas antiguas basadas en user_id

-- STUDENTS
DROP POLICY IF EXISTS "Students multitenancy" ON public.students;
DROP POLICY IF EXISTS "Students academy isolation" ON public.students;
CREATE POLICY "Students academy isolation" ON public.students
FOR ALL TO authenticated
USING (academy_id = get_my_academy_id())
WITH CHECK (academy_id = get_my_academy_id());

-- CLASSES
DROP POLICY IF EXISTS "Classes multitenancy" ON public.classes;
DROP POLICY IF EXISTS "Classes academy isolation" ON public.classes;
CREATE POLICY "Classes academy isolation" ON public.classes
FOR ALL TO authenticated
USING (academy_id = get_my_academy_id())
WITH CHECK (academy_id = get_my_academy_id());

-- PAYMENTS
DROP POLICY IF EXISTS "Payments multitenancy" ON public.payments;
DROP POLICY IF EXISTS "Payments academy isolation" ON public.payments;
CREATE POLICY "Payments academy isolation" ON public.payments
FOR ALL TO authenticated
USING (academy_id = get_my_academy_id())
WITH CHECK (academy_id = get_my_academy_id());

-- ENROLLMENTS
DROP POLICY IF EXISTS "Enrollments multitenancy" ON public.enrollments;
DROP POLICY IF EXISTS "Enrollments academy isolation" ON public.enrollments;
CREATE POLICY "Enrollments academy isolation" ON public.enrollments
FOR ALL TO authenticated
USING (academy_id = get_my_academy_id())
WITH CHECK (academy_id = get_my_academy_id());

-- CATEGORIES
DROP POLICY IF EXISTS "Categories multitenancy" ON public.categories;
DROP POLICY IF EXISTS "Categories academy isolation" ON public.categories;
CREATE POLICY "Categories academy isolation" ON public.categories
FOR ALL TO authenticated
USING (academy_id = get_my_academy_id())
WITH CHECK (academy_id = get_my_academy_id());

-- SETTINGS
DROP POLICY IF EXISTS "Settings multitenancy" ON public.settings;
DROP POLICY IF EXISTS "Settings academy isolation" ON public.settings;
CREATE POLICY "Settings academy isolation" ON public.settings
FOR ALL TO authenticated
USING (academy_id = get_my_academy_id())
WITH CHECK (academy_id = get_my_academy_id());

-- ATTENDANCE (Si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        DROP POLICY IF EXISTS "Attendance academy isolation" ON public.attendance;
        CREATE POLICY "Attendance academy isolation" ON public.attendance
        FOR ALL TO authenticated
        USING (academy_id = get_my_academy_id())
        WITH CHECK (academy_id = get_my_academy_id());
    END IF;
END $$;

-- EXPENSES (Si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        DROP POLICY IF EXISTS "Expenses academy isolation" ON public.expenses;
        CREATE POLICY "Expenses academy isolation" ON public.expenses
        FOR ALL TO authenticated
        USING (academy_id = get_my_academy_id())
        WITH CHECK (academy_id = get_my_academy_id());
    END IF;
END $$;
