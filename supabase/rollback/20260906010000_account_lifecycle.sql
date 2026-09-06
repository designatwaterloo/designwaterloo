-- Roll back the app deployment before removing functions it calls. Does not remove account data.
drop function if exists public.save_my_profile(jsonb,jsonb,jsonb,boolean);
drop function if exists public.ensure_member();

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE auth_user_id = auth.uid() AND is_admin = true
  ) THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_approved := OLD.is_approved;
  END IF;
  RETURN NEW;
END;
$function$
;
drop trigger if exists members_prevent_escalation on public.members;
create trigger members_prevent_escalation before update on public.members for each row execute function public.prevent_privilege_escalation();
