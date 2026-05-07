-- Add productivity fields to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- Add fields to subtasks
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Validate priority values via trigger (avoid CHECK constraint issues)
CREATE OR REPLACE FUNCTION public.validate_task_priority()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.priority NOT IN ('baixa','media','alta') THEN
    RAISE EXCEPTION 'invalid priority: %', NEW.priority;
  END IF;
  IF NEW.status NOT IN ('pendente','fazendo','feita') THEN
    RAISE EXCEPTION 'invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_task_priority ON public.tasks;
CREATE TRIGGER trg_validate_task_priority
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_task_priority();

-- Allow 'pulado' on schedule_items (validate via trigger)
CREATE OR REPLACE FUNCTION public.validate_schedule_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pendente','fazendo','feita','pulado') THEN
    RAISE EXCEPTION 'invalid schedule status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_schedule_status ON public.schedule_items;
CREATE TRIGGER trg_validate_schedule_status
BEFORE INSERT OR UPDATE ON public.schedule_items
FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_status();