-- ------------------------------------------------------------
-- Comunitat NexSocial · 11 — Pagaments mensuals
--
-- Activitats amb model "mensual" (ex. anglès, 15 €/mes): un pagament per
-- persona i mes. Cobraments i Seguiment mostren qui ha pagat cada mes.
-- Un registre per (reserva, mes): no es pot cobrar dues vegades el mateix mes.
-- Cada cobrament i cada anul·lació queda a l'auditoria (qui i quan).
--
-- El preu intern de les tarifes "a consultar" (preu_intern_cents) viu dins
-- del JSON de tarifes: no cal columna nova.
-- Requereix 00–10. És idempotent.
-- ------------------------------------------------------------

create table if not exists comunitat.pagaments_mes (
  id           bigserial primary key,
  reserva_id   text not null references comunitat.reserves(id) on delete cascade,
  mes          text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  import_cents integer not null check (import_cents >= 0),
  metode       text not null check (metode in ('efectiu','bizum','transferencia','targeta','altres')),
  nota         text,
  pagat_at     timestamptz not null default now(),
  per          text not null,
  unique (reserva_id, mes)
);
create index if not exists idx_pagaments_mes_mes on comunitat.pagaments_mes (mes);
alter table comunitat.pagaments_mes enable row level security;

drop trigger if exists trg_auditoria_pagaments_mes on comunitat.pagaments_mes;
create trigger trg_auditoria_pagaments_mes
  after insert or update or delete on comunitat.pagaments_mes
  for each row execute function comunitat.fn_auditoria();

-- Registrar el pagament d'un mes
create or replace function comunitat.admin_pagament_mes(
  p_reserva text,
  p_mes     text,
  p_import  integer,
  p_metode  text,
  p_actor   text,
  p_nota    text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_p comunitat.pagaments_mes%rowtype;
begin
  if not exists (select 1 from comunitat.reserves
                 where id = p_reserva and esborrat_at is null and status not in ('cancelled')) then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_activa');
  end if;
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'pagament del mes ' || p_mes, true);
  insert into comunitat.pagaments_mes (reserva_id, mes, import_cents, metode, nota, per)
  values (p_reserva, p_mes, p_import, p_metode, nullif(trim(coalesce(p_nota, '')), ''), coalesce(p_actor, 'admin'))
  returning * into v_p;
  return jsonb_build_object('ok', true, 'pagament', to_jsonb(v_p));
exception
  when unique_violation then return jsonb_build_object('ok', false, 'error', 'ja_pagat');
  when check_violation  then return jsonb_build_object('ok', false, 'error', 'dades_no_valides');
end $$;

-- Anul·lar un pagament mal registrat (queda el motiu a l'auditoria)
create or replace function comunitat.admin_anular_pagament_mes(
  p_reserva text,
  p_mes     text,
  p_actor   text,
  p_motiu   text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_n integer;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'anul·lació del pagament de ' || p_mes || coalesce(': ' || nullif(trim(p_motiu), ''), ''), true);
  delete from comunitat.pagaments_mes where reserva_id = p_reserva and mes = p_mes;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'error', 'no_pagat'); end if;
  return jsonb_build_object('ok', true);
end $$;

grant all on comunitat.pagaments_mes to service_role;
grant usage, select on sequence comunitat.pagaments_mes_id_seq to service_role;
revoke all on comunitat.pagaments_mes from anon, authenticated;
revoke execute on function comunitat.admin_pagament_mes(text,text,integer,text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_pagament_mes(text,text,integer,text,text,text) to service_role;
revoke execute on function comunitat.admin_anular_pagament_mes(text,text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_anular_pagament_mes(text,text,text,text) to service_role;

-- Comprovació
select count(*) as pagaments_mensuals from comunitat.pagaments_mes;

-- Que l'API (PostgREST) vegi de seguida les funcions noves
notify pgrst, 'reload schema';
