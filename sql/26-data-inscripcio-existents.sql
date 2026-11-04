-- 26 · Data d'inscripció de les inscripcions que ja hi havia (una sola vegada)
--   = primer dia amb una marca d'assistència real (ha vingut, falta o justificada;
--     les marques "— encara no inscrit/a" no compten);
--   si no en té cap, el dia que es va donar d'alta al panell o a la web.
--   Només omple les que estan en blanc: no trepitja res.
update comunitat.reserves r
   set data_inscripcio = coalesce(
         (select min(a.data) from comunitat.assistencia a
           where a.reserva_id = r.id and coalesce(a.motiu, '') <> 'no_inscrit'),
         (r.created_at at time zone 'Europe/Madrid')::date)
 where r.data_inscripcio is null and r.esborrat_at is null;

select count(*) filter (where data_inscripcio is not null) as amb_data,
       count(*) filter (where data_inscripcio is null)     as sense_data
  from comunitat.reserves where esborrat_at is null;
