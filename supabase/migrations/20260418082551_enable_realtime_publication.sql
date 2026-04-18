-- Add tables that the area dashboard and director overview subscribe to.
ALTER PUBLICATION supabase_realtime ADD TABLE public.turnos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.areas;
