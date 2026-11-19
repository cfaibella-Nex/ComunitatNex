-- 29 · Can Canyadó: cartells propis de NexSocial als dos tallers (només si no en tenen)
--      i "Mòbil al teu ritme" setmanal (ja ho era; es reafirma per si s'ha tocat al panell).
update comunitat.events set cartell = '/assets/cartells/cccanyado-mobil.jpg'
 where id = 'taller-mobil-cancanyado' and cartell is null;
update comunitat.events set cartell = '/assets/cartells/cccanyado-memoria.jpg'
 where id = 'taller-memoria-cancanyado' and cartell is null;
update comunitat.events set recurrencia = 'setmanal'
 where id in ('taller-mobil-cancanyado', 'taller-memoria-cancanyado') and recurrencia <> 'setmanal';

select id, titol->>'ca' as titol, recurrencia, model, cartell
  from comunitat.events
 where id in ('taller-mobil-cancanyado', 'taller-memoria-cancanyado') order by hora;
