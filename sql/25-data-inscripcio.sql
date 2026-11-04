-- 25 · Data d'inscripció de cada persona a cada activitat
--   Les noves la reben sola (avui). Les que ja hi havia queden en blanc
--   (es poden posar des del Seguiment). Els mesos i sessions anteriors a
--   la data surten com "No correspon" i "—" automàticament.
alter table comunitat.reserves add column if not exists data_inscripcio date;

create or replace function comunitat.fn_reserva_data_inscripcio()
returns trigger language plpgsql as $fn$
begin
  if new.data_inscripcio is null then
    new.data_inscripcio := (now() at time zone 'Europe/Madrid')::date;
  end if;
  return new;
end $fn$;

drop trigger if exists trg_reserva_data_inscripcio on comunitat.reserves;
create trigger trg_reserva_data_inscripcio before insert on comunitat.reserves
  for each row execute function comunitat.fn_reserva_data_inscripcio();

create or replace function comunitat.admin_data_inscripcio(p_id text, p_data date, p_actor text)
returns jsonb language plpgsql security definer set search_path = comunitat, public as $fn$
declare v comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  update comunitat.reserves set data_inscripcio = p_data
   where id = p_id and esborrat_at is null
  returning * into v;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v));
end $fn$;

revoke execute on function comunitat.admin_data_inscripcio(text, date, text) from public, anon, authenticated;
grant  execute on function comunitat.admin_data_inscripcio(text, date, text) to service_role;
