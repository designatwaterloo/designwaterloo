-- Validate changed social links at the database boundary, including direct API writes.
-- Existing legacy values may be retained until edited.
begin;
create or replace function public.validate_member_social_links()
returns trigger language plpgsql set search_path = '' as $$
declare
  field text;
  value text;
  allowed text;
begin
  foreach field in array array['linkedin','instagram','github','twitter'] loop
    value := to_jsonb(new)->>field;
    if tg_op = 'UPDATE' then
      if value is not distinct from (to_jsonb(old)->>field) then continue; end if;
    end if;
    if value is null or value = '' then continue; end if;
    allowed := case field
      when 'linkedin' then '^https://(www\.)?linkedin\.com/in/[A-Za-z0-9%_-]+/?$'
      when 'instagram' then '^https://(www\.)?instagram\.com/[A-Za-z0-9_][A-Za-z0-9_.]{0,29}/?$'
      when 'github' then '^https://(www\.)?github\.com/[A-Za-z0-9][A-Za-z0-9-]{0,38}/?$'
      when 'twitter' then '^https://(www\.)?(x|twitter)\.com/[A-Za-z0-9_]{1,15}/?$'
    end;
    if value !~* allowed then
      raise exception 'Use a valid % profile URL.', field using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists validate_member_social_links on public.members;
create trigger validate_member_social_links before insert or update of linkedin,instagram,github,twitter on public.members
for each row execute function public.validate_member_social_links();
notify pgrst, 'reload schema';
commit;
