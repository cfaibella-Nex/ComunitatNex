-- 30 · "Una cadira més" (AVV Canyadó): passa a UN dijous al mes.
--   Sessions: 19/11 (feta) i 17/12. Les del 2027 s'afegeixen al Seguiment quan se sàpiguen.
--   La còpia feta amb "Duplicar" per posar el 17/12 s'esborra (si ningú s'hi ha apuntat) o s'arxiva.
begin;
select set_config('app.actor', 'sql-30', true);

update comunitat.events e set
  data              = date '2026-11-19',
  sessions_afegides = '["2026-11-19","2026-12-17"]'::jsonb,
  sessions_tretes   = '[]'::jsonb,
  data_label        = '{"ca":"Un dijous al mes","es":"Un jueves al mes"}'::jsonb,
  tarifes           = coalesce((select jsonb_agg(t || '{"detall":{"ca":"Un dijous al mes · 17:30 – 19:30","es":"Un jueves al mes · 17:30 – 19:30"}}'::jsonb)
                                  from jsonb_array_elements(e.tarifes) t), e.tarifes)
where e.id = 'una-cadira-mes-canyado';

-- Còpies de "Duplicar" (mateix títol, id nou)
delete from comunitat.events c
 where c.id <> 'una-cadira-mes-canyado' and c.titol->>'ca' ilike 'Una cadira més%'
   and not exists (select 1 from comunitat.reserves r where r.event_id = c.id);
update comunitat.events set estat = 'arxivat'
 where id <> 'una-cadira-mes-canyado' and titol->>'ca' ilike 'Una cadira més%' and estat <> 'arxivat';

-- Comprovació: ha de sortir només l'original (i, si de cas, còpies arxivades)
select id, titol->>'ca' as titol, estat, data, data_label->>'ca' as quan, sessions_afegides, sessions_tretes
  from comunitat.events
 where titol->>'ca' ilike 'Una cadira més%' order by id;

commit;
