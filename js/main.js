/* main.js — Comunitat NexSocial · nucli
   ────────────────────────────────────────
   i18n CA/ES, nav, footer, helpers globals. */

/* ── Traduccions ──────────────────────────────────────────── */
const i18n = {
  ca: {
    'nav.inici':       'Inici',
    'nav.agenda':      'Agenda',
    'nav.reserves':    'Reserves',
    'nav.recursos':    'Recursos',
    'nav.passatemps':  'Passatemps',
    'nav.web':         'NexSocial',

    'hero.title':      'Comunitat NexSocial',
    'hero.tagline':    'Sumem recursos per un Acompanyament Sociovital de proximitat i proactiu.',
    'hero.sub':        'Activitats, trobades i recursos per seguir fent vida.',

    'qb.agenda':       'Agenda',
    'qb.agenda.desc':  'Mira què fem aquest mes',
    'qb.reserves':     'Reserves',
    'qb.reserves.desc':"Apunta't a tallers, activitats i esdeveniments",
    'qb.recursos':     'Recursos',
    'qb.recursos.desc':'Guies, vídeos i passatemps per al dia a dia',

    'agenda.title':    'Agenda',
    'agenda.sub':      'Tot el que farem, ordenat per data. Clica una activitat per veure-la i apuntar-te.',
    'agenda.empty':    "De moment no hi ha res programat. Torna aviat!",
    'agenda.mes':      'Aquest mes',

    'reserves.title':  'Reserves',
    'reserves.sub':    "Tria una categoria i apunta't a la que t'interessi.",
    'reserves.tab.esdev':    'Esdeveniments',
    'reserves.tab.tallers':  'Tallers',
    'reserves.tab.mensual':  'Activitats mensuals',
    'reserves.empty.esdev':  'No hi ha esdeveniments programats ara mateix.',
    'reserves.empty.tallers':'No hi ha tallers oberts a inscripció ara mateix.',
    'reserves.empty.mensual':"No hi ha activitats mensuals programades ara mateix.",

    'ev.reservar':     'Reservar plaça',
    'ev.veure':        'Veure detalls',
    'ev.gratis':       'Gratuït',
    'ev.places':       'places disponibles',
    'ev.ultimes':      'Últimes places!',
    'ev.esgotat':      'Ple',
    'ev.data':         'Data',
    'ev.hora':         'Hora',
    'ev.lloc':         'Lloc',
    'ev.entitat':      'Organitza',
    'ev.durada':       'Durada',
    'ev.preu':         'Preu',
    'ev.desc':         'Descripció',
    'ev.como_llegar':  'Com arribar-hi',
    'ev.abrir_mapa':   'Obrir a Google Maps',
    'ev.tornar':       '← Tornar',
    'ev.no_trobat':    "No hem trobat aquesta activitat.",

    'form.title':      'Reservar plaça',
    'form.sub':        "Només et cal el nom i el telèfon. Res de comptes ni contrasenyes.",
    'form.step1':      "Tria el nombre de places i continua.",
    'form.continuar':  'Continuar',
    'form.nom':        'Nom i cognoms',
    'form.tel':        'Telèfon',
    'form.email':      "Correu (opcional)",
    'form.email_ck':   "Correu electrònic",
    'form.places':     'Nombre de places',
    'form.places_single': 'plaça',
    'form.notes':      'Vols dir-nos alguna cosa? (opcional)',
    'form.legal':      'En reservar acceptes que et contactem per confirmar la plaça. Consulta la <a href="/legal.html" style="color:var(--forest)">política de privacitat</a>.',
    'form.enviar':     'Confirmar la reserva',
    'form.enviant':    'Enviant…',
    'form.total':      'Total:',
    'form.error':      "Hi ha algun camp sense omplir. Revisa'l, si us plau.",
    'form.error_tel':  "El telèfon ha de ser vàlid (9 xifres).",
    'form.error_srv':  "No hem pogut enviar la reserva. Torna a provar-ho o truca'ns.",

    'phone.text':      "Prefereixes reservar per telèfon? Truca'ns:",
    'phone.hours':     'De dilluns a divendres, 10 a 18h',

    'conf.title':      'Reserva confirmada!',
    'conf.desc':       "Ja t'hem apuntat. Rebràs una trucada nostra per confirmar la plaça.",
    'conf.ref':        'Número de reserva:',
    'conf.back':       "Tornar a l'agenda",

    'checkout.title':    'Les teves dades',
    'checkout.eyebrow':  'COMPLETA LA RESERVA',
    'checkout.back':     '← Tornar al detall',
    'checkout.resum':    'Resum de la reserva',
    'checkout.pay_card': 'Pagar amb targeta',
    'checkout.reserve_wa': 'Reservar per WhatsApp',
    'checkout.stripe_soon': "El pagament amb targeta estarà disponible molt aviat. Mentrestant, completa la reserva per WhatsApp i te la confirmarem al moment.",
    'checkout.legal_note': "En continuar acceptes les condicions. La reserva es confirma per WhatsApp.",
    'checkout.expired':  "La selecció ha caducat. Torna a triar les places.",

    'recursos.title':  'Recursos i consells',
    'recursos.sub':    "Guies senzilles, vídeos i idees per al dia a dia. Si necessites ajuda, truca'ns.",
    'recursos.pas':    'Passatemps',
    'recursos.pas.sub':'Jocs per activar la ment. Aviat en tindrem molts més!',
    'recursos.pas.soon':'Estem preparant aquesta secció. Aviat trobaràs jocs de memòria, buscar les diferències, sopa de lletres i altres passatemps pensats per divertir-se i mantenir la ment desperta.',

    'pas.intro':       'Marca les respostes amb el ratolí o el dit. Quan vulguis comprovar-ho, obre «Veure la solució». No hi ha temps límit ni puntuació: fes-ho al teu ritme.',
    'pas.print':       'També pots imprimir aquesta pàgina i fer els passatemps amb bolígraf, com una fitxa de paper.',
    'pas.sol':         'Veure la solució',
    'pas.more':        'Anirem afegint més passatemps cada mes. Si tens una idea o un refrany que t\'agradaria veure aquí, digues-nos-ho per WhatsApp!',
    'pas.level.suau':  'Suau',
    'pas.level.mitja': 'Una mica més',
    'pas.level.repte': 'Repte',
    'pas.cat.paraules':'Paraules i llenguatge',
    'pas.cat.atencio': 'Atenció i observació',
    'pas.cat.numeros': 'Números i lògica',
    'pas.cat.records': 'Records i cultura',
    'pas.cat.vida':    'Vida quotidiana',
    'pas.h1':          'Passatemps',
    'pas.h1sub':       'Jocs per passar una bona estona i mantenir la ment desperta. Sense presses ni puntuacions.',
    'pas.how1':        'Toca les respostes amb el dit o el ratolí.',
    'pas.how2':        'Quan vulguis, obre «Veure la solució».',
    'pas.how3':        'També pots imprimir-ho i fer-ho amb bolígraf.',
    'pas.printbtn':    'Imprimir aquests passatemps',
    'pas.cat.difs':    'Busca les diferències',
    'pas.cat.sopa':    'Sopa de lletres',
    'pas.dif.q':       'Aquestes dues fotos de la platja de Badalona tenen 5 diferències. Les trobes totes?',
    'pas.dif.a':       'Foto 1',
    'pas.dif.b':       'Foto 2 (amb 5 canvis)',
    'pas.dif.sol':     'Les 5 diferències són: 1) el para-sol de la dreta canvia la combinació de colors, 2) apareix un cubell vermell al costat de la dona asseguda a la tovallola, 3) falta un dels banyistes que hi havia a l\'aigua, a l\'esquerra, 4) apareix una gavina sobre la sorra, prop de les roques, i 5) hi ha una tovallola blava penjada de la barana del pantalà, prop de l\'estructura blava.',
    'pas.sopa.q':      'Troba aquestes 5 paraules amagades: MAR · SOL · PA · CASA · FLOR',
    'pas.sopa.sol':    'MAR és a la primera fila. SOL a la segona fila (dreta). CASA a la tercera fila. PA a la columna esquerra i també a la segona columna. FLOR a l\'última fila.',
    'recursos.pas.promo':'Jocs per activar la ment, fets a mida. Troba l\'intrús, refranys, sopa de lletres i molt més.',
    'recursos.pas.cta': 'Anar als passatemps →',

    'pas.p1.q':   'Quina paraula no pertany al grup?',
    'pas.p1.a':   'Poma', 'pas.p1.b': 'Pera', 'pas.p1.c': 'Plàtan', 'pas.p1.d': 'Cadira',
    'pas.p1.sol': 'La resposta és «Cadira»: les altres tres són fruites.',

    'pas.p2.q':   'Quina paraula no pertany al grup?',
    'pas.p2.a':   'Badalona', 'pas.p2.b': 'Barcelona', 'pas.p2.c': 'Girona', 'pas.p2.d': 'Guitarra',
    'pas.p2.sol': 'La resposta és «Guitarra»: les altres tres són ciutats catalanes.',

    'pas.p3.q':   'Com acaba aquest refrany? «Qui matina...»',
    'pas.p3.a':   'fa forat', 'pas.p3.b': 'fa el cafè', 'pas.p3.c': 'Déu l\'ajuda',
    'pas.p3.sol': 'La resposta és «Déu l\'ajuda»: qui es lleva d\'hora té més bona sort.',

    'pas.p4.q':   'Com acaba aquest refrany? «A poc a poc...»',
    'pas.p4.a':   'i bona lletra', 'pas.p4.b': 'i sempre tard', 'pas.p4.c': 'i mai arribes',
    'pas.p4.sol': 'La resposta és «i bona lletra»: fer les coses amb calma surten millor.',

    'pas.p5.q':   'Marca totes les paraules relacionades amb el mar',
    'pas.p5.a':   'Onada', 'pas.p5.b': 'Vaixell', 'pas.p5.c': 'Cadira', 'pas.p5.d': 'Platja', 'pas.p5.e': 'Forn', 'pas.p5.f': 'Peix',
    'pas.p5.sol': 'Onada, Vaixell, Platja i Peix són del mar. Cadira i Forn no hi tenen relació.',

    'pas.p6.q':   'Marca les paraules que comencen per la lletra M',
    'pas.p6.a':   'Mar', 'pas.p6.b': 'Taula', 'pas.p6.c': 'Muntanya', 'pas.p6.d': 'Cotxe', 'pas.p6.e': 'Meló', 'pas.p6.f': 'Porta',
    'pas.p6.sol': 'Mar, Muntanya i Meló comencen per M.',

    'pas.p7.q':   'Completa la sèrie: 2, 4, 6, 8, ...?',
    'pas.p7.sol': 'La resposta és 10: els números van de 2 en 2.',

    'pas.p8.q':   'Compres pa (1,20 €) i llet (0,95 €). Quant pagues en total?',
    'pas.p8.sol': 'La resposta és 2,15 €.',

    'pas.p9.q':   'Quina d\'aquestes cançons és de Joan Manuel Serrat?',
    'pas.p9.a':   'Paraules d\'amor', 'pas.p9.b': 'Made in Spain', 'pas.p9.c': 'La Barcelona',
    'pas.p9.sol': 'La resposta és «Paraules d\'amor».',

    'pas.p10.q':   'Quin d\'aquests balls és tradicional català?',
    'pas.p10.a':   'Sardana', 'pas.p10.b': 'Tango', 'pas.p10.c': 'Vals',
    'pas.p10.sol': 'La resposta és «Sardana».',

    'pas.p11.q':   'Marca el que necessites per fer una truita de patates',
    'pas.p11.a':   'Ous', 'pas.p11.b': 'Patates', 'pas.p11.c': 'Oli', 'pas.p11.d': 'Sabó', 'pas.p11.e': 'Sal', 'pas.p11.f': 'Cotxe',
    'pas.p11.sol': 'Ous, Patates, Oli i Sal. El Sabó i el Cotxe no hi tenen res a veure.',

    'pas.p12.q':   'Quin d\'aquests passos fas primer quan et lleves al matí?',
    'pas.p12.a':   'Rentar-se la cara', 'pas.p12.b': 'Sortir de casa', 'pas.p12.c': 'Dinar',
    'pas.p12.sol': 'La resposta és «Rentar-se la cara».',

    'footer.desc':     'Sumem recursos per un Acompanyament Sociovital de proximitat i proactiu. Un projecte de NexSocial SCCL a Badalona.',
    'footer.enllaços': 'Enllaços',
    'footer.contacte': 'Contacte',
    'footer.privacy':  'Privacitat',
    'footer.legal':    'Avís legal',
    'footer.accessibilitat': 'Accessibilitat',
    'footer.copy':     '© 2026 NexSocial SCCL · NIF F-27641133 · Badalona',
    'footer.inscrits': 'Inscrits en',
    'footer.iniciativa': 'Una iniciativa de',
  },
  es: {
    'nav.inici':       'Inicio',
    'nav.agenda':      'Agenda',
    'nav.reserves':    'Reservas',
    'nav.recursos':    'Recursos',
    'nav.passatemps':  'Pasatiempos',
    'nav.web':         'NexSocial',

    'hero.title':      'Comunitat NexSocial',
    'hero.tagline':    'Sumamos recursos para un Acompañamiento Sociovital de proximidad y proactivo.',
    'hero.sub':        'Actividades, encuentros y recursos para seguir haciendo vida.',

    'qb.agenda':       'Agenda',
    'qb.agenda.desc':  'Mira lo que hacemos este mes',
    'qb.reserves':     'Reservas',
    'qb.reserves.desc':'Apúntate a talleres, actividades y eventos',
    'qb.recursos':     'Recursos',
    'qb.recursos.desc':'Guías, vídeos y pasatiempos para el día a día',

    'agenda.title':    'Agenda',
    'agenda.sub':      'Todo lo que haremos, ordenado por fecha. Haz clic en una actividad para verla y apuntarte.',
    'agenda.empty':    'Por ahora no hay nada programado. ¡Vuelve pronto!',
    'agenda.mes':      'Este mes',

    'reserves.title':  'Reservas',
    'reserves.sub':    'Elige una categoría y apúntate a la que te interese.',
    'reserves.tab.esdev':    'Eventos',
    'reserves.tab.tallers':  'Talleres',
    'reserves.tab.mensual':  'Actividades mensuales',
    'reserves.empty.esdev':  'No hay eventos programados ahora mismo.',
    'reserves.empty.tallers':'No hay talleres abiertos a inscripción ahora mismo.',
    'reserves.empty.mensual':'No hay actividades mensuales programadas ahora mismo.',

    'ev.reservar':     'Reservar plaza',
    'ev.veure':        'Ver detalles',
    'ev.gratis':       'Gratuito',
    'ev.places':       'plazas disponibles',
    'ev.ultimes':      '¡Últimas plazas!',
    'ev.esgotat':      'Completo',
    'ev.data':         'Fecha',
    'ev.hora':         'Hora',
    'ev.lloc':         'Lugar',
    'ev.entitat':      'Organiza',
    'ev.durada':       'Duración',
    'ev.preu':         'Precio',
    'ev.desc':         'Descripción',
    'ev.como_llegar':  'Cómo llegar',
    'ev.abrir_mapa':   'Abrir en Google Maps',
    'ev.tornar':       '← Volver',
    'ev.no_trobat':    'No hemos encontrado esta actividad.',

    'form.title':      'Reservar plaza',
    'form.sub':        'Solo necesitas el nombre y el teléfono. Nada de cuentas ni contraseñas.',
    'form.step1':      'Elige el número de plazas y continúa.',
    'form.continuar':  'Continuar',
    'form.nom':        'Nombre y apellidos',
    'form.tel':        'Teléfono',
    'form.email':      'Correo (opcional)',
    'form.email_ck':   'Correo electrónico',
    'form.places':     'Número de plazas',
    'form.places_single': 'plaza',
    'form.notes':      '¿Quieres decirnos algo? (opcional)',
    'form.legal':      'Al reservar aceptas que te contactemos para confirmar la plaza. Consulta la <a href="/legal.html" style="color:var(--forest)">política de privacidad</a>.',
    'form.enviar':     'Confirmar la reserva',
    'form.enviant':    'Enviando…',
    'form.total':      'Total:',
    'form.error':      'Hay algún campo sin rellenar. Revísalo, por favor.',
    'form.error_tel':  'El teléfono debe ser válido (9 cifras).',
    'form.error_srv':  'No hemos podido enviar la reserva. Vuelve a intentarlo o llámanos.',

    'phone.text':      '¿Prefieres reservar por teléfono? Llámanos:',
    'phone.hours':     'De lunes a viernes, 10 a 18h',

    'conf.title':      '¡Reserva confirmada!',
    'conf.desc':       'Ya te hemos apuntado. Recibirás una llamada nuestra para confirmar la plaza.',
    'conf.ref':        'Número de reserva:',
    'conf.back':       'Volver a la agenda',

    'checkout.title':    'Tus datos',
    'checkout.eyebrow':  'COMPLETA LA RESERVA',
    'checkout.back':     '← Volver al detalle',
    'checkout.resum':    'Resumen de la reserva',
    'checkout.pay_card': 'Pagar con tarjeta',
    'checkout.reserve_wa': 'Reservar por WhatsApp',
    'checkout.stripe_soon': 'El pago con tarjeta estará disponible muy pronto. Mientras tanto, completa la reserva por WhatsApp y te la confirmamos al momento.',
    'checkout.legal_note': 'Al continuar aceptas las condiciones. La reserva se confirma por WhatsApp.',
    'checkout.expired':  'La selección ha caducado. Vuelve a elegir las plazas.',

    'recursos.title':  'Recursos y consejos',
    'recursos.sub':    'Guías sencillas, vídeos e ideas para el día a día. Si necesitas ayuda, llámanos.',
    'recursos.pas':    'Pasatiempos',
    'recursos.pas.sub':'Juegos para activar la mente. ¡Pronto tendremos muchos más!',
    'recursos.pas.soon':'Estamos preparando esta sección. Pronto encontrarás juegos de memoria, buscar las diferencias, sopa de letras y otros pasatiempos pensados para divertirse y mantener la mente despierta.',

    'pas.intro':       'Marca las respuestas con el ratón o el dedo. Cuando quieras comprobarlo, abre «Ver la solución». No hay tiempo límite ni puntuación: hazlo a tu ritmo.',
    'pas.print':       'También puedes imprimir esta página y hacer los pasatiempos con bolígrafo, como una ficha de papel.',
    'pas.sol':         'Ver la solución',
    'pas.more':        'Iremos añadiendo más pasatiempos cada mes. Si tienes una idea o un refrán que te gustaría ver aquí, ¡dínoslo por WhatsApp!',
    'pas.level.suau':  'Suave',
    'pas.level.mitja': 'Un poco más',
    'pas.level.repte': 'Reto',
    'pas.cat.paraules':'Palabras y lenguaje',
    'pas.cat.atencio': 'Atención y observación',
    'pas.cat.numeros': 'Números y lógica',
    'pas.cat.records': 'Recuerdos y cultura',
    'pas.cat.vida':    'Vida cotidiana',
    'pas.h1':          'Pasatiempos',
    'pas.h1sub':       'Juegos para pasar un buen rato y mantener la mente despierta. Sin prisas ni puntuaciones.',
    'pas.how1':        'Toca las respuestas con el dedo o el ratón.',
    'pas.how2':        'Cuando quieras, abre «Ver la solución».',
    'pas.how3':        'También puedes imprimirlo y hacerlo con bolígrafo.',
    'pas.printbtn':    'Imprimir estos pasatiempos',
    'pas.cat.difs':    'Busca las diferencias',
    'pas.cat.sopa':    'Sopa de letras',
    'pas.dif.q':       'Estas dos fotos de la playa de Badalona tienen 5 diferencias. ¿Las encuentras todas?',
    'pas.dif.a':       'Foto 1',
    'pas.dif.b':       'Foto 2 (con 5 cambios)',
    'pas.dif.sol':     'Las 5 diferencias son: 1) la sombrilla de la derecha cambia la combinación de colores, 2) aparece un cubo rojo junto a la mujer sentada en la toalla, 3) falta uno de los bañistas que había en el agua, a la izquierda, 4) aparece una gaviota sobre la arena, cerca de las rocas, y 5) hay una toalla azul colgada de la barandilla del pantalán, cerca de la estructura azul.',
    'pas.sopa.q':      'Encuentra estas 5 palabras escondidas: MAR · SOL · PA · CASA · FLOR',
    'pas.sopa.sol':    'MAR está en la primera fila. SOL en la segunda fila (derecha). CASA en la tercera fila. PA en la columna izquierda y también en la segunda columna. FLOR en la última fila.',
    'recursos.pas.promo':'Juegos para activar la mente, hechos a medida. Encuentra el intruso, refranes, sopa de letras y mucho más.',
    'recursos.pas.cta': 'Ir a los pasatiempos →',

    'pas.p1.q':   '¿Qué palabra no pertenece al grupo?',
    'pas.p1.a':   'Manzana', 'pas.p1.b': 'Pera', 'pas.p1.c': 'Plátano', 'pas.p1.d': 'Silla',
    'pas.p1.sol': 'La respuesta es «Silla»: las otras tres son frutas.',

    'pas.p2.q':   '¿Qué palabra no pertenece al grupo?',
    'pas.p2.a':   'Badalona', 'pas.p2.b': 'Barcelona', 'pas.p2.c': 'Girona', 'pas.p2.d': 'Guitarra',
    'pas.p2.sol': 'La respuesta es «Guitarra»: las otras tres son ciudades catalanas.',

    'pas.p3.q':   '¿Cómo termina este refrán? «Al que madruga...»',
    'pas.p3.a':   'le pesa el sueño', 'pas.p3.b': 'le gusta el café', 'pas.p3.c': 'Dios le ayuda',
    'pas.p3.sol': 'La respuesta es «Dios le ayuda»: quien se levanta pronto tiene más suerte.',

    'pas.p4.q':   '¿Cómo termina este refrán? «Vísteme despacio...»',
    'pas.p4.a':   'que tengo prisa', 'pas.p4.b': 'que llego tarde', 'pas.p4.c': 'que no llego',
    'pas.p4.sol': 'La respuesta es «que tengo prisa»: hacer las cosas con calma sale mejor.',

    'pas.p5.q':   'Marca todas las palabras relacionadas con el mar',
    'pas.p5.a':   'Ola', 'pas.p5.b': 'Barco', 'pas.p5.c': 'Silla', 'pas.p5.d': 'Playa', 'pas.p5.e': 'Horno', 'pas.p5.f': 'Pez',
    'pas.p5.sol': 'Ola, Barco, Playa y Pez son del mar. Silla y Horno no tienen relación.',

    'pas.p6.q':   'Marca las palabras que empiezan por la letra M',
    'pas.p6.a':   'Mar', 'pas.p6.b': 'Mesa', 'pas.p6.c': 'Montaña', 'pas.p6.d': 'Coche', 'pas.p6.e': 'Melón', 'pas.p6.f': 'Puerta',
    'pas.p6.sol': 'Mar, Montaña y Melón empiezan por M.',

    'pas.p7.q':   'Completa la serie: 2, 4, 6, 8, ...?',
    'pas.p7.sol': 'La respuesta es 10: los números van de 2 en 2.',

    'pas.p8.q':   'Compras pan (1,20 €) y leche (0,95 €). ¿Cuánto pagas en total?',
    'pas.p8.sol': 'La respuesta es 2,15 €.',

    'pas.p9.q':   '¿Cuál de estas canciones es de Joan Manuel Serrat?',
    'pas.p9.a':   'Paraules d\'amor', 'pas.p9.b': 'Made in Spain', 'pas.p9.c': 'La Barcelona',
    'pas.p9.sol': 'La respuesta es «Paraules d\'amor».',

    'pas.p10.q':   '¿Cuál de estos bailes es tradicional catalán?',
    'pas.p10.a':   'Sardana', 'pas.p10.b': 'Tango', 'pas.p10.c': 'Vals',
    'pas.p10.sol': 'La respuesta es «Sardana».',

    'pas.p11.q':   'Marca lo que necesitas para hacer una tortilla de patatas',
    'pas.p11.a':   'Huevos', 'pas.p11.b': 'Patatas', 'pas.p11.c': 'Aceite', 'pas.p11.d': 'Jabón', 'pas.p11.e': 'Sal', 'pas.p11.f': 'Coche',
    'pas.p11.sol': 'Huevos, Patatas, Aceite y Sal. El Jabón y el Coche no tienen nada que ver.',

    'pas.p12.q':   '¿Qué paso haces primero al levantarte por la mañana?',
    'pas.p12.a':   'Lavarse la cara', 'pas.p12.b': 'Salir de casa', 'pas.p12.c': 'Comer',
    'pas.p12.sol': 'La respuesta es «Lavarse la cara».',

    'footer.desc':     'Sumamos recursos para un Acompañamiento Sociovital de proximidad y proactivo. Un proyecto de NexSocial SCCL en Badalona.',
    'footer.enllaços': 'Enlaces',
    'footer.contacte': 'Contacto',
    'footer.privacy':  'Privacidad',
    'footer.legal':    'Aviso legal',
    'footer.accessibilitat': 'Accesibilidad',
    'footer.copy':     '© 2026 NexSocial SCCL · NIF F-27641133 · Badalona',
    'footer.inscrits': 'Inscritos en',
    'footer.iniciativa': 'Una iniciativa de',
  }
};

const MAIN_SITE = 'https://nexsocial.org';
const PHONE = '660 435 871';       
const PHONE_TEL = '660435871';
const WHATSAPP = '34660435871';    

/* ── Getter idioma ────────────────────────────────────────── */
function getLang() {
  return localStorage.getItem('nx-lang') || 'ca';
}
function setLang(lang) {
  if (!['ca', 'es'].includes(lang)) return;
  localStorage.setItem('nx-lang', lang);
  document.documentElement.lang = lang;
  location.reload();
}
function T(key) {
  return (i18n[getLang()] || i18n.ca)[key] || key;
}
function L(obj) {
  if (!obj) return '';
  const lang = getLang();
  return obj[lang] || obj.ca || obj.es || '';
}

/* ── HTML NAV ─────────────────────────────────────────────── */
function buildNav() {
  const lang = getLang();
  const path = location.pathname;
  const isActive = (p) => path === p || path.endsWith(p) ? 'active' : '';
  return `
<nav class="nav" aria-label="Menú principal">
  <div class="nav-inner">
    <a href="/" class="nav-logo" aria-label="Comunitat NexSocial · Inici">
      <img src="/assets/logo-comunitat.png" alt="Comunitat NexSocial" class="nav-logo-img" width="648" height="200">
    </a>
    <div class="nav-links">
      <a class="nav-link ${isActive('/') || isActive('/index.html')}" href="/"${(isActive('/') || isActive('/index.html')) ? ' aria-current="page"' : ''}>${T('nav.inici')}</a>
      <a class="nav-link ${isActive('/agenda.html')}" href="/agenda.html"${isActive('/agenda.html') ? ' aria-current="page"' : ''}>${T('nav.agenda')}</a>
      <a class="nav-link ${isActive('/reserves.html')}" href="/reserves.html"${isActive('/reserves.html') ? ' aria-current="page"' : ''}>${T('nav.reserves')}</a>
      <a class="nav-link ${isActive('/recursos.html')}" href="/recursos.html"${isActive('/recursos.html') ? ' aria-current="page"' : ''}>${T('nav.recursos')}</a>
      <a class="nav-link ${isActive('/passatemps.html')}" href="/passatemps.html"${isActive('/passatemps.html') ? ' aria-current="page"' : ''}>${T('nav.passatemps')}</a>
    </div>
    <div class="lang-sw" role="group" aria-label="Idioma">
      <button class="lang-btn ${lang==='ca'?'active':''}" data-lang="ca" aria-label="Català">CA</button>
      <button class="lang-btn ${lang==='es'?'active':''}" data-lang="es" aria-label="Castellano">ES</button>
    </div>
  </div>
</nav>`;
}

/* ── HTML FOOTER ──────────────────────────────────────────── */
function buildFooter() {
  return `
<footer class="footer">
  <div class="footer-inner">
    <div>
      <a class="footer-brand-logo" href="/" aria-label="Comunitat NexSocial · Inici">
        <img src="/assets/logo-comunitat.png" width="648" height="200" alt="Comunitat NexSocial">
      </a>
      <p>${T('footer.desc')}</p>
    </div>
    <div>
      <h4>${T('footer.enllaços')}</h4>
      <a href="/agenda.html">${T('nav.agenda')}</a>
      <a href="/reserves.html">${T('nav.reserves')}</a>
      <a href="/recursos.html">${T('nav.recursos')}</a>
      <a href="/passatemps.html">${T('nav.passatemps')}</a>
      <a href="${MAIN_SITE}">${T('nav.web')}</a>
    </div>
    <div>
      <h4>${T('footer.contacte')}</h4>
      <a href="tel:${PHONE_TEL}">📞 ${PHONE}</a>
      <a href="mailto:infonex@nexsocial.org">✉️ infonex@nexsocial.org</a>
      <a href="/legal.html">${T('footer.privacy')}</a>
      <a href="/accessibilitat.html">${T('footer.accessibilitat')}</a>
    </div>
    <div class="footer-brands">
      <div class="footer-brands-label">${T('footer.inscrits')}</div>
      <a class="footer-brand-link" href="https://salutpublica.gencat.cat/ca/agencia/plans-estrategics/pinsap/accions-eines-projectes-relacionats/actius-salut/cercador-actius-salut/" target="_blank" rel="noopener"
         title="Cercador d'Actius i salut de l'Agència de Salut Pública de Catalunya">
        <img class="is-plate" src="/assets/logos/aqui-si-actius-salut.png" width="416" height="185" loading="lazy"
             alt="Aquí sí! Actius i salut — PINSAP, Generalitat de Catalunya">
      </a>
      <div class="footer-brands-label">${T('footer.iniciativa')}</div>
      <a class="footer-brand-link" href="${MAIN_SITE}" target="_blank" rel="noopener"
         title="NexSocial SCCL — Cooperativa d'Acompanyament Sociovital">
        <img src="/assets/logo.png" width="636" height="195" loading="lazy"
             alt="NexSocial — Cooperativa d'Acompanyament Sociovital">
      </a>
    </div>
  </div>
  <div class="footer-copy">
    ${T('footer.copy')}
  </div>
</footer>`;
}

/* ── HTML BANNER TELÈFON ──────────────────────────────────── */
function phoneBannerHTML() {
  return `
<div class="phone-banner">
  <strong>${T('phone.text')}</strong>
  <a href="tel:${PHONE_TEL}">📞 ${PHONE}</a>
  <div class="muted" style="font-size: var(--fs-sm); margin-top: 4px;">${T('phone.hours')}</div>
</div>`;
}

/* ── Helpers de vista ─────────────────────────────────────── */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const lang = getLang() === 'ca' ? 'ca-ES' : 'es-ES';
    return new Intl.DateTimeFormat(lang, {
      day: 'numeric', month: 'long', year: 'numeric',
      ...opts
    }).format(d);
  } catch { return dateStr; }
}

function formatPrice(cents) {
  if (cents === 0 || cents == null) return T('ev.gratis');
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

function tipoLabel(tipo) {
  const map = {
    mensual: getLang() === 'ca' ? 'Activitat mensual' : 'Actividad mensual',
    taller:  getLang() === 'ca' ? 'Taller' : 'Taller',
    esdeveniment: getLang() === 'ca' ? 'Esdeveniment' : 'Evento'
  };
  return map[tipo] || tipo;
}

function tipoBadgeClass(tipo) {
  return tipo === 'taller' ? 'badge-taller' :
         tipo === 'esdeveniment' ? 'badge-esdev' :
         tipo === 'mensual' ? 'badge-mensual' : '';
}

function placesRestants(ev) {
  const cupo = ev.cupo || 0;
  const reservades = ev.reservades || 0;
  return Math.max(0, cupo - reservades);
}

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

/* ── Bind idioma ──────────────────────────────────────────── */
function bindLangSwitcher() {
  qsa('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}

/* ── Boot ─────────────────────────────────────────────────── */
function initShell() {
  document.documentElement.lang = getLang();
  const navP = qs('#nav-placeholder');
  const footP = qs('#footer-placeholder');
  if (navP) navP.innerHTML = buildNav();
  if (footP) footP.innerHTML = buildFooter();
  bindLangSwitcher();

  // Skip link
  if (!qs('.skip-link')) {
    const skip = document.createElement('a');
    skip.href = '#main';
    skip.className = 'skip-link';
    skip.textContent = getLang() === 'ca' ? 'Salta al contingut' : 'Saltar al contenido';
    document.body.prepend(skip);
  }
}

// Auto-init si es carrega directament
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShell);
} else {
  initShell();
}

// Exportar globals per altres scripts
window.NX = {
  T, L, getLang, setLang,
  esc, formatDate, formatPrice,
  tipoLabel, tipoBadgeClass, placesRestants,
  phoneBannerHTML,
  PHONE, PHONE_TEL, WHATSAPP,
  qs, qsa
};
