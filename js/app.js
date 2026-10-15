const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let proyectos = [], perfil = {}, estetica = {};

// Idioma: ?lang=en en la URL o la última elección del visitante
let idioma = new URLSearchParams(location.search).get('lang');
try { idioma = idioma || localStorage.getItem('idioma'); } catch {}
idioma = idioma === 'en' ? 'en' : 'es';
document.documentElement.lang = idioma;
const TEXTOS = {
  es: {proyectos: 'Proyectos', experiencia: 'Experiencia', certificados: 'Certificados', sobre: 'Sobre mí', cv: 'CV', contacto: 'Contacto',
    verProyectos: 'Ver proyectos', descargarCV: 'Descargar CV', expTitulo: 'Experiencia y formación', certTitulo: 'Certificados y títulos',
    software: 'Software y competencias', idiomas: 'Idiomas', curriculum: 'Currículum', abrirPDF: 'Abrir / descargar PDF', cargandoCV: 'Cargando CV…',
    volver: '← Volver a proyectos', area: 'Área', herramientas: 'Herramientas', verInforme: 'Ver informe completo (PDF)', informe: 'Informe completo',
    cargandoInforme: 'Cargando informe…', cargando: 'Cargando…', descargar: 'Descargar', ver: 'Ver', pronto: 'Próximamente.', imagen: 'imagen',
    asunto: 'Contacto desde tu portfolio', cvPDF: 'Descargar CV (PDF)', pdfError: 'No se pudo mostrar el documento aquí.', pdfAbrir: 'Abrilo en una pestaña nueva',
    pagina: 'Página', tituloPag: 'Estudiante avanzado de Ingeniería Mecánica', tema: 'Cambiar modo claro/oscuro'},
  en: {proyectos: 'Projects', experiencia: 'Experience', certificados: 'Certificates', sobre: 'About', cv: 'CV', contacto: 'Contact',
    verProyectos: 'View projects', descargarCV: 'Download CV', expTitulo: 'Experience and education', certTitulo: 'Certificates and diplomas',
    software: 'Software and skills', idiomas: 'Languages', curriculum: 'CV', abrirPDF: 'Open / download PDF', cargandoCV: 'Loading CV…',
    volver: '← Back to projects', area: 'Field', herramientas: 'Tools', verInforme: 'View full report (PDF)', informe: 'Full report',
    cargandoInforme: 'Loading report…', cargando: 'Loading…', descargar: 'Download', ver: 'View', pronto: 'Coming soon.', imagen: 'image',
    asunto: 'Contact from your portfolio', cvPDF: 'Download CV (PDF)', pdfError: 'The document could not be displayed here.', pdfAbrir: 'Open it in a new tab',
    pagina: 'Page', tituloPag: 'Advanced Mechanical Engineering Student', tema: 'Toggle light/dark mode'}
};
const t = k => TEXTOS[idioma][k] ?? TEXTOS.es[k] ?? k;

// Aplica la traducción (data/en.json) sobre los datos en español, campo por campo
function traducir(base, tr) {
  if (Array.isArray(base) && Array.isArray(tr) && base.length && typeof base[0] === 'object') return base.map((b, i) => tr[i] ? traducir(b, tr[i]) : b);
  if (base && typeof base === 'object' && !Array.isArray(base) && tr && typeof tr === 'object') {
    const r = {...base};
    for (const k in tr) r[k] = k in base ? traducir(base[k], tr[k]) : tr[k];
    return r;
  }
  return tr ?? base;
}

async function cargar() {
  const get = f => fetch(`data/${f}.json`, {cache: 'no-cache'}).then(r => r.json());
  [proyectos, perfil, estetica] = await Promise.all([get('proyectos'), get('perfil'), get('estetica')]);
  if (idioma === 'en') {
    const en = await get('en').catch(() => ({}));
    perfil = traducir(perfil, en.perfil || {});
    proyectos = proyectos.map(p => traducir(p, (en.proyectos || {})[p.id] || {}));
  }
  pintarInterfaz();
  pintarMarcas();
  contarVisitas();
  aplicarEstetica();
  pintarPerfil();
  pintarCertificados();
  if (perfil.cv) { $('#cv-descarga').href = perfil.cv; mostrarPDF(perfil.cv, $('#cv-paginas')); } else $('#curriculum').remove();
  pintarProyectos();
  ruta();
  animarPortada();
  requestAnimationFrame(() => document.body.classList.add('listo'));
}

function pintarMarcas() {
  if ($('#marcas')) $('#marcas').innerHTML = (perfil.marcas || []).map(m => typeof m === 'string' ? {nombre: m} : m)
    .map(m => m.logo ? `<img src="${esc(m.logo)}" alt="${esc(m.nombre)}" title="${esc(m.nombre)}" loading="lazy"${m.alto ? ` style="height:${+m.alto}px"` : ''}>` : `<span>${esc(m.nombre)}</span>`).join('');
}

function pintarCifras() {
  const cifras = (perfil.cifras || []).map(c => c.auto === 'proyectos' ? {...c, valor: proyectos.length} : c);
  $('#cifras').innerHTML = cifras.map(c => `<div><b data-num="${+c.valor || 0}">${esc(c.prefijo || '')}${c.valor}${esc(c.sufijo || '')}</b><span>${esc(c.texto)}</span></div>`).join('');
  if ($('#marcas')) $('#marcas').innerHTML = (perfil.marcas || []).map(m => typeof m === 'string' ? {nombre: m} : m)
    .map(m => m.logo ? `<img src="${esc(m.logo)}" alt="${esc(m.nombre)}" title="${esc(m.nombre)}" loading="lazy"${m.alto ? ` style="height:${+m.alto}px"` : ''}>` : `<span>${esc(m.nombre)}</span>`).join('');
  // Los números cuentan desde cero cuando aparecen en pantalla
  const ioC = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; ioC.unobserve(e.target);
    const b = e.target, fin = +b.dataset.num, c = cifras[[...b.parentElement.parentElement.children].indexOf(b.parentElement)];
    if (!fin || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now(), dur = 1200;
    const paso = now => { const x = Math.min(1, (now - t0) / dur), v = Math.round(fin * (1 - Math.pow(1 - x, 3)));
      b.textContent = `${c.prefijo || ''}${v}${c.sufijo || ''}`; if (x < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }), {threshold: .6});
  document.querySelectorAll('#cifras b[data-num]').forEach(b => ioC.observe(b));
}

function pintarInterfaz() {
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
  $('#tema').setAttribute('aria-label', t('tema'));
  const b = $('#idioma');
  b.textContent = idioma === 'en' ? 'ES' : 'EN';
  b.setAttribute('aria-label', idioma === 'en' ? 'Ver en español' : 'View in English');
  b.onclick = () => {
    try { localStorage.setItem('idioma', idioma === 'en' ? 'es' : 'en'); } catch {}
    const u = new URL(location.href);
    u.searchParams.set('lang', idioma === 'en' ? 'es' : 'en');
    location.href = u.toString();
  };
}

// Contador de visitas privado (GoatCounter); se activa al completar "goatcounter" en estetica.json
function contarVisitas() {
  if (!estetica.goatcounter || /^(localhost|127\.)/.test(location.hostname)) return;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${estetica.goatcounter}.goatcounter.com/count`;
  document.body.appendChild(s);
}

function aplicarEstetica() {
  const r = document.documentElement.style;
  r.setProperty('--acento', estetica.acento || '#4f7cac');
  r.setProperty('--intens', estetica.intensidad_animacion ?? 1);
  const fuente = estetica.tipografia || 'Inter';
  r.setProperty('--fuente', `'${fuente}'`);
  $('#font-link').href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fuente)}:wght@300;400;500;600;700&display=swap`;
  let tema = null;
  try { tema = localStorage.getItem('tema'); } catch {}
  setTema(tema || (estetica.tema_inicial === 'claro' ? 'claro' : 'oscuro'));
}

function setTema(t) {
  const d = document.documentElement;
  d.dataset.tema = t;
  d.style.setProperty('--bg', t === 'claro' ? (estetica.fondo_claro || '#f5f5f2') : (estetica.fondo_oscuro || '#0e1116'));
}
$('#tema').onclick = () => {
  const t = document.documentElement.dataset.tema === 'claro' ? 'oscuro' : 'claro';
  setTema(t);
  try { localStorage.setItem('tema', t); } catch {}
};

function pintarPerfil() {
  document.querySelectorAll('[data-nombre]').forEach(e => e.textContent = perfil.nombre);
  document.querySelectorAll('[data-titulo]').forEach(e => e.textContent = perfil.titulo);
  document.querySelectorAll('[data-bajada]').forEach(e => e.textContent = perfil.bajada);
  document.querySelectorAll('[data-universidad]').forEach(e => e.textContent = perfil.universidad);
  if ($('#timeline')) $('#timeline').innerHTML = (perfil.experiencia || []).map((e, i) => `
    <li class="revelar"><span class="fecha">${esc(e.fecha)}</span><h3>${esc(e.titulo)}</h3>
    <div class="lugar">${esc(e.lugar)}</div>${e.detalle ? `<p>${esc(e.detalle)}</p>` : ''}
    ${(e.fotos || []).length ? `<div class="exp-fotos">${e.fotos.map((f, k) => `<img src="${esc(f)}" alt="${esc(e.titulo)}" data-exp="${i}" data-k="${k}" loading="lazy">`).join('')}</div>` : ''}</li>`).join('');
  $('#timeline')?.querySelectorAll('.exp-fotos img').forEach(im => im.onclick = () => abrirVisor(perfil.experiencia[+im.dataset.exp].fotos, +im.dataset.k));
  $('#idiomas').innerHTML = (perfil.idiomas || []).map(i => `<li>${esc(i)}</li>`).join('');
  $('#habilidades').innerHTML = (perfil.habilidades || []).map(h => `<li>${esc(h)}</li>`).join('');
  document.querySelectorAll('[data-foto]').forEach(e => { if (perfil.foto) { e.src = perfil.foto; e.hidden = false; } });
  const links = [];
  if (perfil.email) links.push(`<a class="btn" data-mail href="mailto:${esc(perfil.email)}?subject=${encodeURIComponent(t('asunto'))}">✉ ${esc(perfil.email)}</a>`);
  if (perfil.linkedin) links.push(`<a class="btn ghost" href="${esc(perfil.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
  if (perfil.telefono) links.push(`<a class="btn ghost" href="https://wa.me/${perfil.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp ${esc(perfil.telefono)}</a>`);
  $('#links-contacto').innerHTML = links.join('') || `<p style="color:var(--sub)">${t('pronto')}</p>`;
  // Abre un mail nuevo a la dirección. Si en la compu no hay programa de correo configurado
  // (la página no pierde el foco), abre la redacción de Gmail en una pestaña nueva.
  document.querySelectorAll('[data-mail]').forEach(a => a.addEventListener('click', () => {
    if (matchMedia('(pointer: coarse)').matches) return;
    let salio = false;
    const marcar = () => { salio = true; };
    addEventListener('blur', marcar, {once: true});
    setTimeout(() => {
      removeEventListener('blur', marcar);
      if (!salio && document.hasFocus()) open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(perfil.email)}&su=${encodeURIComponent(t('asunto'))}`, '_blank', 'noopener');
    }, 900);
  }));
  // El CV aparece solo si el archivo existe en el repositorio
  if (perfil.cv) fetch(perfil.cv, {method: 'HEAD'}).then(r => {
    if (!r.ok) return;
    $('#btn-cv').href = perfil.cv; $('#btn-cv').hidden = false;
    $('#links-contacto').insertAdjacentHTML('beforeend', `<a class="btn ghost" href="${esc(perfil.cv)}" target="_blank" rel="noopener">${t('cvPDF')}</a>`);
  }).catch(() => {});
  $('#anio').textContent = new Date().getFullYear();
}

// Lista los archivos de la carpeta certificados/ del repositorio (se actualiza sola al subir archivos)
async function pintarCertificados() {
  const nombre = f => decodeURIComponent(f).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  let archivos = [];
  // La lista sale del perfil (campo "archivo" de cada certificado): no depende de GitHub, funciona con el repositorio privado
  archivos = (perfil.certificaciones || []).filter(c => c && c.archivo).map(c => ({type: 'file', name: c.archivo}));
  // Cada certificado del perfil se enlaza al archivo cuyo nombre contenga alguna de sus "claves"
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const usados = new Set();
  const esPdf = n => /\.pdf$/i.test(n);
  const tarjeta = (titulo, detalle, f) => f
    ? `<button class="cert con-doc revelar" data-doc="certificados/${encodeURIComponent(f.name)}" data-titulo="${esc(titulo)}">
        <div class="thumb">${esPdf(f.name) ? `<canvas data-pdf="certificados/${encodeURIComponent(f.name)}"></canvas>` : `<img src="certificados/${encodeURIComponent(f.name)}" alt="" loading="lazy">`}<span class="ver">${t('ver')}</span></div>
        <div class="txt"><b>${esc(titulo)}</b><span>${esc(detalle || '')}</span></div>
      </button>`
    : `<div class="cert revelar"><div class="ico">✓</div><div><b>${esc(titulo)}</b><span>${esc(detalle || '')}</span></div></div>`;
  const delPerfil = (perfil.certificaciones || []).map(c => {
    if (typeof c === 'string') c = {nombre: c};
    const claves = norm(c.clave || c.nombre).split('|').map(s => s.trim()).filter(Boolean);
    // Primero por nombre exacto de archivo; si no hay, por palabras clave
    const f = archivos.find(f => c.archivo && f.name === c.archivo)
      || (c.archivo ? null : archivos.find(f => !usados.has(f.name) && claves.some(k => norm(f.name).includes(k))));
    if (f) usados.add(f.name);
    return tarjeta(c.nombre, c.detalle, f);
  });
  const sueltos = archivos.filter(f => !usados.has(f.name)).map(f => tarjeta(nombre(f.name), '', f));
  // Primero los que tienen documento, después el resto
  const todos = [...delPerfil, ...sueltos].sort((x, y) => y.startsWith('<button') - x.startsWith('<button'));
  $('#certs').innerHTML = todos.join('') || `<p style="color:var(--sub)">${t('pronto')}</p>`;
  $('#certs').querySelectorAll('[data-doc]').forEach(b => b.onclick = () => abrirDoc(b.dataset.doc, b.dataset.titulo));
  $('#certs').querySelectorAll('canvas[data-pdf]').forEach(miniaturaPDF);
  observar();
}

function videoEnTarjetas() {
  if (!matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('.tarjeta[data-video]').forEach(a => {
    const caja = a.querySelector('.img');
    a.addEventListener('mouseenter', () => {
      let v = caja.querySelector('video');
      if (!v) { v = document.createElement('video'); Object.assign(v, {src: a.dataset.video, muted: true, loop: true, playsInline: true}); caja.appendChild(v); }
      v.currentTime = 0; v.play().catch(() => {}); caja.classList.add('con-video');
    });
    a.addEventListener('mouseleave', () => { caja.classList.remove('con-video'); caja.querySelector('video')?.pause(); });
  });
}

function pintarProyectos() {
  $('#grilla').innerHTML = proyectos.map(p => `
    <a class="tarjeta revelar" href="#/proyecto/${esc(p.id)}"${p.video_tarjeta ? ` data-video="${esc(p.video_tarjeta)}"` : ''}>
      <div class="img" style="--fondo:url('${esc(new URL(p.portada || p.imagenes?.[0], location.href).href)}')"><img src="${esc(p.portada || p.imagenes?.[0])}" alt="${esc(p.titulo)}" loading="lazy"${p.portada_escala ? ` style="--escala:${+p.portada_escala}"` : ''}></div>
      <div class="info">
        <span class="meta">${esc(p.area)}</span>
        <h3>${esc(p.titulo)}</h3>
        <p>${esc(p.resumen)}</p>
        <ul class="chips">${(p.herramientas || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>
    </a>`).join('');
  videoEnTarjetas();
  observar();
}

function ruta() {
  const h = location.hash.replace(/^#\/?/, '');
  const det = $('#detalle'), ini = $('#inicio');
  if (h.startsWith('proyecto/')) {
    const p = proyectos.find(x => x.id === h.split('/')[1]);
    if (p) {
      ini.hidden = true; det.hidden = false;
      document.querySelectorAll('.tarjeta .img').forEach(c => c.style.viewTransitionName = '');
      det.innerHTML = `
        <a class="volver" href="#/proyectos">${t('volver')}</a>
        <span class="meta">${esc(p.area)}</span>
        <h1>${esc(p.titulo)}</h1>
        ${p.contexto ? `<p class="contexto">${esc(p.contexto)}</p>` : ''}
        <div class="det-grid">
          <div>${String(p.descripcion || '').split(/\n\s*\n/).map(t => `<p>${esc(t)}</p>`).join('')}</div>
          <dl class="ficha">
            <dt>${t('area')}</dt><dd>${esc(p.area)}</dd>
            
            <dt>${t('herramientas')}</dt><dd><ul class="chips" style="margin-top:6px">${(p.herramientas || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul></dd>
            ${p.documento ? `<a class="btn" href="${esc(p.documento)}" target="_blank" rel="noopener">${t('verInforme')}</a>` : ''}
          </dl>
        </div>
        ${(p.destacados || []).length ? `<div class="destacados">${p.destacados.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
        <div class="galeria">${medios(p).map((m, i) => m.tipo === 'video'
          ? `<video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ''} title="${esc(m.titulo || '')}" data-i="${i}" muted loop playsinline autoplay preload="metadata" disablepictureinpicture></video>`
          : `<img src="${esc(m.src)}" alt="${esc(p.titulo)} — ${t('imagen')} ${i + 1}" data-i="${i}" loading="lazy">`).join('')}</div>`;
      if (p.documento && p.mostrar_documento) {
        det.insertAdjacentHTML('beforeend', `
          <section class="lector">
            <div class="lector-cab"><h3>${t('informe')}</h3>
              <a class="btn ghost" href="${esc(p.documento)}" target="_blank" rel="noopener">${t('abrirPDF')}</a></div>
            <div class="paginas" id="paginas"><p class="cargando">${t('cargandoInforme')}</p></div>
          </section>`);
        mostrarPDF(p.documento, $('#paginas'));
      }
      const gal = det.querySelector('.galeria');
      const piezas = [...gal.children];
      piezas.forEach(el => el.onclick = () => abrirVisor(medios(p), +el.dataset.i));
      const listo = el => el.tagName === 'VIDEO' ? (el.readyState >= 1 ? 0 : new Promise(r => { el.onloadedmetadata = el.onerror = r; })) : (el.complete ? 0 : new Promise(r => { el.onload = el.onerror = r; }));
      Promise.all(piezas.map(listo)).then(() => {
        justificar(gal);
        piezas.forEach((el, k) => { el.classList.add('cascada'); el.style.transitionDelay = `${(k % 6) * 70}ms`; });
        const ioG = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); ioG.unobserve(e.target); } }), {threshold: .1});
        piezas.forEach(el => ioG.observe(el));
      });
      const ioVid = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()), {threshold: .3});
      gal.querySelectorAll('video').forEach(v => { v.muted = true; ioVid.observe(v); });
      document.title = `${p.titulo} — ${perfil.nombre}`;
      scrollTo(0, 0);
      return;
    }
  }
  det.hidden = true; ini.hidden = false;
  document.title = `${perfil.nombre} — ${t('tituloPag')}`;
  const sec = document.getElementById(h);
  if (sec) sec.scrollIntoView({behavior: 'smooth'});
}
// El nombre de arriba a la izquierda vuelve siempre al inicio
$('.logo').addEventListener('click', e => {
  e.preventDefault();
  if (location.hash && location.hash !== '#/') history.pushState(null, '', location.pathname + location.search);
  ruta();
  scrollTo({top: 0, behavior: 'smooth'});
});

addEventListener('hashchange', () => {
  const sale = location.hash.startsWith('#/proyecto/') !== !$('#detalle').hidden;
  if (sale && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(ruta);
  else ruta();
});
// Cuenta en GoatCounter cada proyecto abierto (la página cambia de sección sin recargar)
addEventListener('hashchange', () => {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('proyecto/') && window.goatcounter?.count) goatcounter.count({path: '/' + h, title: document.title});
});

// Lector de PDF dentro de la página (PDF.js funciona también en celulares)
const PDFJS = 'js/vendor/'; // PDF.js 3.11.174
let pdfjsListo;
function cargarPdfJs() {
  return pdfjsListo ??= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(pdfjsLib); };
    s.onerror = mal;
    document.head.appendChild(s);
  });
}
async function mostrarPDF(url, cont) {
  try {
    const lib = await cargarPdfJs();
    const pdf = await lib.getDocument(url).promise;
    cont.innerHTML = '';
    const ancho = Math.min(Math.max(cont.clientWidth, 640) - 16, 860) * Math.min(devicePixelRatio || 1, 2);
    const io2 = new IntersectionObserver(es => es.forEach(async e => {
      if (!e.isIntersecting || e.target.dataset.hecho) return;
      e.target.dataset.hecho = 1;
      const pag = await pdf.getPage(+e.target.dataset.n);
      const vp0 = pag.getViewport({scale: 1}), vp = pag.getViewport({scale: ancho / vp0.width});
      e.target.width = vp.width; e.target.height = vp.height;
      pag.render({canvasContext: e.target.getContext('2d'), viewport: vp});
    }), {root: cont, rootMargin: '800px 0px'});
    const vp1 = (await pdf.getPage(1)).getViewport({scale: 1});
    for (let n = 1; n <= pdf.numPages; n++) {
      const c = document.createElement('canvas');
      c.dataset.n = n; c.width = vp1.width; c.height = vp1.height;
      c.setAttribute('aria-label', `${t('pagina')} ${n}`);
      cont.appendChild(c); io2.observe(c);
    }
  } catch {
    cont.innerHTML = `<p class="cargando">${t('pdfError')} <a href="${esc(url)}" target="_blank" rel="noopener" style="color:var(--acento)">${t('pdfAbrir')}</a>.</p>`;
  }
}

async function miniaturaPDF(cv) {
  try {
    const lib = await cargarPdfJs();
    const pag = await (await lib.getDocument(cv.dataset.pdf).promise).getPage(1);
    const vp = pag.getViewport({scale: 520 / pag.getViewport({scale: 1}).width});
    cv.width = vp.width; cv.height = vp.height;
    await pag.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise;
  } catch {}
}

// Visor de documentos (PDF o imagen) a pantalla completa
function abrirDoc(url, titulo) {
  let v = $('#docvisor');
  if (!v) {
    v = document.createElement('div'); v.id = 'docvisor';
    v.innerHTML = `<div class="dv-caja" role="dialog" aria-modal="true">
      <div class="dv-cab"><b></b><div><a class="btn ghost" target="_blank" rel="noopener">${t('descargar')}</a><button class="dv-x" aria-label="Cerrar">×</button></div></div>
      <div class="dv-cuerpo paginas"></div></div>`;
    document.body.appendChild(v);
    const cerrar = () => { v.classList.remove('abierto'); document.body.style.overflow = ''; };
    v.querySelector('.dv-x').onclick = cerrar;
    v.onclick = e => { if (e.target === v) cerrar(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && v.classList.contains('abierto')) cerrar(); });
  }
  v.querySelector('.dv-cab b').textContent = titulo;
  v.querySelector('.dv-cab a').href = url;
  const cuerpo = v.querySelector('.dv-cuerpo');
  document.body.style.overflow = 'hidden';
  v.classList.add('abierto');
  if (/\.pdf$/i.test(url)) { cuerpo.innerHTML = `<p class="cargando">${t('cargando')}</p>`; mostrarPDF(url, cuerpo); }
  else cuerpo.innerHTML = `<img src="${url}" alt="${esc(titulo)}">`;
}

// Galería justificada: filas de igual altura que llenan el ancho; cada foto mantiene su proporción
function justificar(gal) {
  if (!gal || !gal.isConnected) return;
  const ancho = el => el.naturalWidth || el.videoWidth, altoN = el => el.naturalHeight || el.videoHeight;
  const imgs = [...gal.children].filter(el => ancho(el));
  const W = gal.clientWidth, gap = 12, objetivo = W < 600 ? 230 : 380;
  const r = im => ancho(im) / altoN(im);
  const alto = fila => (W - gap * (fila.length - 1)) / fila.reduce((a, im) => a + r(im), 0);
  // Arma filas que se acercan a la altura objetivo
  const filas = [];
  let fila = [];
  imgs.forEach(im => { fila.push(im); if (alto(fila) <= objetivo) { filas.push(fila); fila = []; } });
  // Si sobran fotos al final, se suman a la fila anterior (si no queda demasiado baja) para no dejar una fila incompleta
  if (fila.length) {
    const prev = filas.pop() || [];
    const todas = [...prev, ...fila];
    // Prueba todas las formas de repartir las últimas fotos en una o dos filas completas y elige la más pareja
    let mejor = [todas], peor = Math.abs(alto(todas) - objetivo);
    for (let k = 1; k < todas.length; k++) {
      const a = todas.slice(0, k), b = todas.slice(k);
      const d = Math.max(Math.abs(alto(a) - objetivo), Math.abs(alto(b) - objetivo));
      if (d < peor) { peor = d; mejor = [a, b]; }
    }
    // Si ni así se logra una fila razonable, la última queda a la altura objetivo sin estirarse
    if (alto(mejor[mejor.length - 1]) > objetivo * 1.6) { mejor = prev.length ? [prev, fila] : [fila]; fila.ultima = true; }
    filas.push(...mejor);
  }
  gal.style.display = 'block';
  filas.forEach((f, n) => {
    const h = f.ultima ? Math.min(alto(f), filas.length === 1 && f.length === 1 ? objetivo * 2.2 : objetivo) : alto(f);
    f.forEach((im, k) => {
      const delay = im.style.transitionDelay;
      im.style.cssText = `transition-delay:${delay};width:${Math.floor(r(im) * h)}px;height:${Math.floor(h)}px;margin:0 ${k < f.length - 1 ? gap : 0}px ${gap}px 0;display:inline-block;vertical-align:top;object-fit:cover`;
    });
  });
}
addEventListener('resize', () => justificar(document.querySelector('#detalle:not([hidden]) .galeria')));

function aviso(texto) {
  let t = $('#aviso');
  if (!t) { t = document.createElement('div'); t.id = 'aviso'; document.body.appendChild(t); }
  t.textContent = texto; t.classList.add('ver');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('ver'), 2600);
}

// Fotos y videos de un proyecto, en un solo orden: primero los videos
function medios(p) {
  return [...(p.videos || []).map(v => ({tipo: 'video', ...v})), ...(p.imagenes || []).map(src => ({tipo: 'img', src}))];
}
let galeria = [], idx = 0;
function abrirVisor(lista, i) { galeria = lista.map(m => typeof m === 'string' ? {tipo: 'img', src: m} : m); idx = i; $('#visor').hidden = false; mostrar(); }
function mostrar() {
  const m = galeria[idx], im = $('#visor img'), vid = $('#visor video');
  $('#visor .contador').textContent = galeria.length > 1 ? `${idx + 1} / ${galeria.length}` : '';
  $('#visor .prev').hidden = $('#visor .next').hidden = galeria.length < 2;
  if (m.tipo === 'video') { im.hidden = true; vid.hidden = false; vid.src = m.src; vid.muted = true; vid.play().catch(() => {}); }
  else { vid.pause(); vid.hidden = true; vid.removeAttribute('src'); im.src = m.src; im.hidden = false; }
}
function cerrarVisor() { $('#visor').hidden = true; $('#visor video').pause(); }
// Deslizar con el dedo en el celular
{ let x0 = null;
  $('#visor').addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive: true});
  $('#visor').addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) $(dx < 0 ? '#visor .next' : '#visor .prev').click(); }); }
$('#visor .cerrar').onclick = cerrarVisor;
$('#visor .prev').onclick = e => { e.stopPropagation(); idx = (idx - 1 + galeria.length) % galeria.length; mostrar(); };
$('#visor .next').onclick = e => { e.stopPropagation(); idx = (idx + 1) % galeria.length; mostrar(); };
$('#visor').onclick = e => { if (e.target.id === 'visor') cerrarVisor(); };
addEventListener('keydown', e => {
  if ($('#visor').hidden) return;
  if (e.key === 'Escape') cerrarVisor();
  if (e.key === 'ArrowLeft') $('#visor .prev').click();
  if (e.key === 'ArrowRight') $('#visor .next').click();
});

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), {threshold: .12});
function observar() { document.querySelectorAll('.revelar:not(.visible)').forEach(el => io.observe(el)); }
observar();

// Portada: malla de elementos finitos que se deforma alrededor del mouse
function animarPortada() {
  const modo = estetica.animacion_portada || 'malla';
  const cv = $('#lienzo'), ctx = cv.getContext('2d');
  if (modo === 'ninguna') { cv.remove(); return; }
  const k = Math.max(0, Math.min(2, estetica.intensidad_animacion ?? 1));
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const acento = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#2f5d8a';
  const hex = a => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  let W, H, cols, filas, paso, mx = null, my = null, t = 0;
  const ajustar = () => {
    const d = devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    paso = W > 800 ? 48 : 40; cols = Math.ceil(W / paso) + 2; filas = Math.ceil(H / (paso * .866)) + 2;
  };
  ajustar(); addEventListener('resize', ajustar);
  cv.parentElement.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  cv.parentElement.addEventListener('mouseleave', () => { mx = my = null; });

  function cuadro() {
    ctx.clearRect(0, 0, W, H);
    if (modo === 'grilla') {
      ctx.strokeStyle = acento + '22'; ctx.lineWidth = 1;
      const off = (t * 20 * k) % paso;
      for (let x = -off; x < W; x += paso) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = -off; y < H; y += paso) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    } else {
      // Sin mouse, una "carga" recorre la malla sola
      const px = mx ?? W * (.7 + .18 * Math.sin(t * .35)), py = my ?? H * (.5 + .25 * Math.sin(t * .5));
      const R = Math.min(W, H) * .28, A = 26 * k;
      const P = [], S = [];
      for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
        const x0 = (i - 1) * paso + (j % 2) * paso / 2, y0 = (j - 1) * paso * .866;
        const dx = x0 - px, dy = y0 - py, r = Math.hypot(dx, dy) || 1;
        const g = Math.exp(-(r * r) / (2 * R * R));
        const ola = Math.sin(x0 * .012 + t * .8) * Math.cos(y0 * .015 + t * .6) * 3 * k;
        P.push([x0 + dx / r * A * g + ola, y0 + dy / r * A * g + ola]);
        S.push(g);
      }
      const id = (i, j) => j * cols + i;
      // En pantallas anchas la malla se desvanece hacia el texto de la izquierda
      const fade = x => W > 800 ? Math.min(1, Math.max(0, (x / W - .3) / .3)) : .5;
      const linea = (a, b) => {
        const s = (S[a] + S[b]) / 2, f = fade((P[a][0] + P[b][0]) / 2);
        if (f <= 0) return;
        ctx.strokeStyle = acento + hex((.1 + .55 * s) * f);
        ctx.lineWidth = .8 + 1.2 * s;
        ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke();
      };
      for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
        const a = id(i, j);
        if (i + 1 < cols) linea(a, id(i + 1, j));
        if (j + 1 < filas) {
          const o = j % 2;
          if (i + o < cols) linea(a, id(i + o, j + 1));
          if (i + o - 1 >= 0) linea(a, id(i + o - 1, j + 1));
        }
      }
      for (let n = 0; n < P.length; n++) {
        const f = fade(P[n][0]);
        if (S[n] < .2 || f <= 0) continue;
        ctx.fillStyle = acento + hex(S[n] * f);
        ctx.beginPath(); ctx.arc(P[n][0], P[n][1], 1.5 + 1.5 * S[n], 0, 7); ctx.fill();
      }
      // Mira tipo CAD con coordenadas, solo con el mouse sobre la zona de la malla
      if (mx !== null && fade(mx) > .2) {
        const f = fade(mx);
        ctx.save();
        ctx.strokeStyle = acento + hex(.35 * f); ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.moveTo(W * .3, my); ctx.lineTo(W, my); ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle = acento + hex(.9 * f); ctx.lineWidth = 1.4;
        ctx.strokeRect(mx - 7, my - 7, 14, 14);
        ctx.fillStyle = acento + hex(.85 * f);
        ctx.font = '500 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(`X ${(mx / 2).toFixed(1)}  Y ${((H - my) / 2).toFixed(1)}`, mx + 14, my - 12);
        ctx.restore();
      }
    }
    if (!quieto) { t += .016; requestAnimationFrame(cuadro); }
  }
  cuadro();
}

// Barra de progreso de lectura
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  $('#progreso').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}, {passive: true});

cargar();
