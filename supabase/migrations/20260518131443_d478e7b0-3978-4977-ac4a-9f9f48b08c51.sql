
-- 1. Coluna de cor nos formulários
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'gray';

-- 2. Atualizar trigger para aceitar 'file'
CREATE OR REPLACE FUNCTION public.validate_form_field_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.field_type NOT IN ('short_text','long_text','select','multi_select','date','file') THEN
    RAISE EXCEPTION 'invalid field type: %', NEW.field_type;
  END IF;
  RETURN NEW;
END;
$function$;

-- garantir trigger
DROP TRIGGER IF EXISTS validate_form_field_type_trg ON public.form_fields;
CREATE TRIGGER validate_form_field_type_trg
  BEFORE INSERT OR UPDATE ON public.form_fields
  FOR EACH ROW EXECUTE FUNCTION public.validate_form_field_type();

-- 3. Bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Policies de storage para form-uploads
-- path: {owner_id}/{form_id}/{filename}
DROP POLICY IF EXISTS "form-uploads owner read" ON storage.objects;
CREATE POLICY "form-uploads owner read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'form-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "form-uploads owner delete" ON storage.objects;
CREATE POLICY "form-uploads owner delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'form-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "form-uploads public insert" ON storage.objects;
CREATE POLICY "form-uploads public insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-uploads'
  AND EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id::text = (storage.foldername(name))[2]
      AND f.user_id::text = (storage.foldername(name))[1]
      AND f.is_published = true
  )
);
