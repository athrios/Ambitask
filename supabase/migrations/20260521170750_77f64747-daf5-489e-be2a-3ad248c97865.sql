CREATE OR REPLACE FUNCTION public.sync_task_to_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status)
     OR (NEW.done IS DISTINCT FROM OLD.done)
     OR (NEW.title IS DISTINCT FROM OLD.title) THEN
    UPDATE public.schedule_items
       SET status = CASE
                      WHEN NEW.status IN ('pendente','fazendo','aguardando','feita','cancelado')
                        THEN NEW.status
                      ELSE status
                    END,
           title  = NEW.title
     WHERE task_id = NEW.id
       AND (status IS DISTINCT FROM NEW.status OR title IS DISTINCT FROM NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_task_to_schedule ON public.tasks;
CREATE TRIGGER trg_sync_task_to_schedule
  AFTER UPDATE OF status, done, title ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_task_to_schedule();

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.schedule_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;