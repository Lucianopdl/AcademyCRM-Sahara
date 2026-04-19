-- Create Teacher Folders table
CREATE TABLE IF NOT EXISTS public.teacher_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.teacher_folders(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Teacher Resources table
CREATE TABLE IF NOT EXISTS public.teacher_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'link')),
    url TEXT, -- For links
    storage_path TEXT, -- For files in storage
    folder_id UUID REFERENCES public.teacher_folders(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.teacher_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_resources ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_folders
CREATE POLICY "Teachers can manage their own folders" 
ON public.teacher_folders 
FOR ALL 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Policies for teacher_resources
CREATE POLICY "Teachers can manage their own resources" 
ON public.teacher_resources 
FOR ALL 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Políticas de Storage
-- IMPORTANTE: Crear el bucket 'teacher-materials' manualmente en el Dashboard de Supabase antes de aplicar.

-- 1. Teachers can upload their own materials
CREATE POLICY "Teachers can upload their own materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'teacher-materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Teachers can view their own materials
CREATE POLICY "Teachers can view their own materials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'teacher-materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Teachers can delete their own materials
CREATE POLICY "Teachers can delete their own materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'teacher-materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
