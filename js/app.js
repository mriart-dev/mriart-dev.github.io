const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let proyectos = [], perfil = {}, estetica = {};

async function cargar() {
  const get = f => fetch(`data/${f}.json`, {cache: 'no-cache'}).then(r => r.json());
  [proyectos, perfil, estetica] = await Promise.all([get('proyectos'), get('perfil'), get('estetica')]);
  aplicarEstetica();
  pintarPerfil();
  pintarCertificados();
  pintarProyectos('Todos');
  ruta();
  animarPortada();
  requestAnimationFrame(() => document.body.classList.add('listo'));
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
  $('#timeline').innerHTML = (perfil.experiencia || []).map(e => `
    <li class="revelar"><span class="fecha">${esc(e.fecha)}</span><h3>${esc(e.titulo)}</h3>
    <div class="lugar">${esc(e.lugar)}</div>${e.detalle ? `<p>${esc(e.detalle)}</p>` : ''}</li>`).join('');
  $('#idiomas').innerHTML = (perfil.idiomas || []).map(i => `<li>${esc(i)}</li>`).join('');
  $('#habilidades').innerHTML = (perfil.habilidades || []).map(h => `<li>${esc(h)}</li>`).join('');
  document.querySelectorAll('[data-foto]').forEach(e => { if (perfil.foto) { e.src = perfil.foto; e.hidden = false; } });
  const links = [];
  if (perfil.email) links.push(`<a class="btn" data-mail href="mailto:${esc(perfil.email)}?subject=${encodeURIComponent('Contacto desde tu portfolio')}">✉ ${esc(perfil.email)}</a>`);
  if (perfil.linkedin) links.push(`<a class="btn ghost" href="${esc(perfil.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
  if (perfil.telefono) links.push(`<a class="btn ghost" href="https://wa.me/${perfil.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp ${esc(perfil.telefono)}</a>`);
  $('#links-contacto').innerHTML = links.join('') || '<p style="color:var(--sub)">Próximamente.</p>';
  // Abre un mail nuevo a la dirección. Si en la compu no hay programa de correo configurado
  // (la página no pierde el foco), abre la redacción de Gmail en una pestaña nueva.
  document.querySelectorAll('[data-mail]').forEach(a => a.addEventListener('click', () => {
    if (matchMedia('(pointer: coarse)').matches) return;
    let salio = false;
    const marcar = () => { salio = true; };
    addEventListener('blur', marcar, {once: true});
    setTimeout(() => {
      removeEventListener('blur', marcar);
      if (!salio && document.hasFocus()) open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(perfil.email)}&su=${encodeURIComponent('Contacto desde tu portfolio')}`, '_blank', 'noopener');
    }, 900);
  }));
  // El CV aparece solo si el archivo existe en el repositorio
  if (perfil.cv) fetch(perfil.cv, {method: 'HEAD'}).then(r => {
    if (!r.ok) return;
    $('#btn-cv').href = perfil.cv; $('#btn-cv').hidden = false;
    $('#links-contacto').insertAdjacentHTML('beforeend', `<a class="btn ghost" href="${esc(perfil.cv)}" target="_blank" rel="noopener">Descargar CV (PDF)</a>`);
  }).catch(() => {});
  $('#anio').textContent = new Date().getFullYear();
}

// Lista los archivos de la carpeta certificados/ del repositorio (se actualiza sola al subir archivos)
async function pintarCertificados() {
  const nombre = f => decodeURIComponent(f).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  let archivos = [];
  try {
    const r = await fetch('https://api.github.com/repos/mriart-dev/mriart-dev.github.io/contents/certificados');
    if (r.ok) archivos = (await r.json()).filter(f => f.type === 'file' && /\.(pdf|png|jpe?g|webp)$/i.test(f.name));
  } catch {}
  // Cada certificado del perfil se enlaza al archivo cuyo nombre contenga alguna de sus "claves"
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const usados = new Set();
  const esPdf = n => /\.pdf$/i.test(n);
  const tarjeta = (titulo, detalle, f) => f
    ? `<button class="cert con-doc revelar" data-doc="certificados/${encodeURIComponent(f.name)}" data-titulo="${esc(titulo)}">
        <div class="thumb">${esPdf(f.name) ? `<canvas data-pdf="certificados/${encodeURIComponent(f.name)}"></canvas>` : `<img src="certificados/${encodeURIComponent(f.name)}" alt="" loading="lazy">`}<span class="ver">Ver</span></div>
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
  $('#certs').innerHTML = todos.join('') || '<p style="color:var(--sub)">Próximamente.</p>';
  $('#certs').querySelectorAll('[data-doc]').forEach(b => b.onclick = () => abrirDoc(b.dataset.doc, b.dataset.titulo));
  $('#certs').querySelectorAll('canvas[data-pdf]').forEach(miniaturaPDF);
  observar();
}

function pintarProyectos(filtro) {
  const areas = ['Todos', ...new Set(proyectos.map(p => p.area).filter(Boolean))];
  $('#filtros').innerHTML = areas.length > 2 ? areas.map(a => `<button class="${a === filtro ? 'activo' : ''}">${esc(a)}</button>`).join('') : '';
  $('#filtros').querySelectorAll('button').forEach(b => b.onclick = () => pintarProyectos(b.textContent));
  $('#grilla').innerHTML = proyectos.filter(p => filtro === 'Todos' || p.area === filtro).map(p => `
    <a class="tarjeta revelar" href="#/proyecto/${esc(p.id)}">
      <div class="img"><img src="${esc(p.portada || p.imagenes?.[0])}" alt="${esc(p.titulo)}" loading="lazy"></div>
      <div class="info">
        <span class="meta">${esc([p.area, p.anio].filter(Boolean).join(' · '))}</span>
        <h3>${esc(p.titulo)}</h3>
        <p>${esc(p.resumen)}</p>
        <ul class="chips">${(p.herramientas || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>
    </a>`).join('');
  observar();
}

function ruta() {
  const h = location.hash.replace(/^#\/?/, '');
  const det = $('#detalle'), ini = $('#inicio');
  if (h.startsWith('proyecto/')) {
    const p = proyectos.find(x => x.id === h.split('/')[1]);
    if (p) {
      ini.hidden = true; det.hidden = false;
      det.innerHTML = `
        <a class="volver" href="#/proyectos">← Volver a proyectos</a>
        <span class="meta">${esc([p.area, p.anio].filter(Boolean).join(' · '))}</span>
        <h1>${esc(p.titulo)}</h1>
        ${p.contexto ? `<p class="contexto">${esc(p.contexto)}</p>` : ''}
        <div class="det-grid">
          <div>${String(p.descripcion || '').split(/\n\s*\n/).map(t => `<p>${esc(t)}</p>`).join('')}</div>
          <dl class="ficha">
            <dt>Área</dt><dd>${esc(p.area)}</dd>
            ${p.anio ? `<dt>Año</dt><dd>${esc(p.anio)}</dd>` : ''}
            <dt>Herramientas</dt><dd><ul class="chips" style="margin-top:6px">${(p.herramientas || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul></dd>
            ${p.documento ? `<a class="btn" href="${esc(p.documento)}" target="_blank" rel="noopener">Ver informe completo (PDF)</a>` : ''}
          </dl>
        </div>
        ${(p.destacados || []).length ? `<div class="destacados">${p.destacados.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
        <div class="galeria${(p.imagenes || []).length === 1 ? ' sola' : ''}">${(p.imagenes || []).map((src, i) => `<img src="${esc(src)}" alt="${esc(p.titulo)} — imagen ${i + 1}" data-i="${i}" loading="lazy">`).join('')}</div>`;
      if (p.documento && p.mostrar_documento) {
        det.insertAdjacentHTML('beforeend', `
          <section class="lector">
            <div class="lector-cab"><h3>Informe completo</h3>
              <a class="btn ghost" href="${esc(p.documento)}" target="_blank" rel="noopener">Abrir / descargar PDF</a></div>
            <div class="paginas" id="paginas"><p class="cargando">Cargando informe…</p></div>
          </section>`);
        mostrarPDF(p.documento, $('#paginas'));
      }
      det.querySelectorAll('.galeria img').forEach(img => img.onclick = () => abrirVisor(p.imagenes, +img.dataset.i));
      document.title = `${p.titulo} — ${perfil.nombre}`;
      scrollTo(0, 0);
      return;
    }
  }
  det.hidden = true; ini.hidden = false;
  document.title = `${perfil.nombre} — Ingeniería Mecánica`;
  const sec = document.getElementById(h);
  if (sec) sec.scrollIntoView({behavior: 'smooth'});
}
addEventListener('hashchange', ruta);

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
    const ancho = Math.min(cont.clientWidth - 16, 860) * Math.min(devicePixelRatio || 1, 2);
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
      c.setAttribute('aria-label', `Página ${n} del informe`);
      cont.appendChild(c); io2.observe(c);
    }
  } catch {
    cont.innerHTML = `<p class="cargando">No se pudo mostrar el informe aquí. <a href="${esc(url)}" target="_blank" rel="noopener" style="color:var(--acento)">Abrilo en una pestaña nueva</a>.</p>`;
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
      <div class="dv-cab"><b></b><div><a class="btn ghost" target="_blank" rel="noopener">Descargar</a><button class="dv-x" aria-label="Cerrar">×</button></div></div>
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
  if (/\.pdf$/i.test(url)) { cuerpo.innerHTML = '<p class="cargando">Cargando…</p>'; mostrarPDF(url, cuerpo); }
  else cuerpo.innerHTML = `<img src="${url}" alt="${esc(titulo)}">`;
}

function aviso(texto) {
  let t = $('#aviso');
  if (!t) { t = document.createElement('div'); t.id = 'aviso'; document.body.appendChild(t); }
  t.textContent = texto; t.classList.add('ver');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('ver'), 2600);
}

let galeria = [], idx = 0;
function abrirVisor(imgs, i) { galeria = imgs; idx = i; $('#visor').hidden = false; mostrar(); }
function mostrar() { const im = $('#visor img'); im.src = galeria[idx]; im.hidden = false; }
$('#visor .cerrar').onclick = () => $('#visor').hidden = true;
$('#visor .prev').onclick = e => { e.stopPropagation(); idx = (idx - 1 + galeria.length) % galeria.length; mostrar(); };
$('#visor .next').onclick = e => { e.stopPropagation(); idx = (idx + 1) % galeria.length; mostrar(); };
$('#visor').onclick = e => { if (e.target.id === 'visor') $('#visor').hidden = true; };
addEventListener('keydown', e => {
  if ($('#visor').hidden) return;
  if (e.key === 'Escape') $('#visor').hidden = true;
  if (e.key === 'ArrowLeft') $('#visor .prev').click();
  if (e.key === 'ArrowRight') $('#visor .next').click();
});

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), {threshold: .12});
function observar() { document.querySelectorAll('.revelar:not(.visible)').forEach(el => io.observe(el)); }
observar();

// Portada: líneas de corriente (flujo potencial alrededor de un cilindro) que esquivan el mouse
function animarPortada() {
  const modo = estetica.animacion_portada || 'flujo';
  const cv = $('#lienzo'), ctx = cv.getContext('2d');
  if (modo === 'ninguna') { cv.remove(); return; }
  const k = Math.max(0, Math.min(2, estetica.intensidad_animacion ?? 1));
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const acento = css.getPropertyValue('--acento').trim() || '#2f5d8a';
  let W, H, mx = null, my = null, t = 0, parts = [];
  const N = () => Math.round(Math.min(900, W * H / 1300) * (0.5 + k / 2));
  const nueva = (x) => ({x: x ?? Math.random() * W, y: Math.random() * H, vida: W / 1.2 + Math.random() * W * .6});
  const ajustar = () => {
    const d = devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    parts = Array.from({length: N()}, () => nueva());
  };
  ajustar(); addEventListener('resize', ajustar);
  cv.parentElement.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  cv.parentElement.addEventListener('mouseleave', () => { mx = my = null; });
  const fade = x => W > 800 ? Math.min(1, Math.max(0, (x / W - .32) / .28)) : .45;

  // Velocidad del flujo uniforme U alrededor de un cilindro de radio R centrado en (cx, cy)
  function vel(x, y, cx, cy, R) {
    const U = 1.6 * (0.6 + k / 2);
    const dx = x - cx, dy = y - cy, r2 = dx * dx + dy * dy, R2 = R * R;
    if (r2 < R2) return [U, 0];
    const r4 = r2 * r2;
    return [U * (1 - R2 * (dx * dx - dy * dy) / r4), -U * R2 * 2 * dx * dy / r4];
  }

  const LARGO = 28;
  function cuadro() {
    ctx.clearRect(0, 0, W, H);
    const cx = mx ?? W * (.68 + .1 * Math.sin(t * .3)), cy = my ?? H * (.5 + .2 * Math.sin(t * .45));
    const R = Math.min(W, H) * (W > 800 ? .12 : .16);
    ctx.lineCap = 'round';
    for (const p of parts) {
      const [u, v] = vel(p.x, p.y, cx, cy, R);
      p.x += u; p.y += v;
      (p.h ??= []).push(p.x, p.y);
      if (p.h.length > LARGO * 2) p.h.splice(0, 2);
      if (--p.vida < 0 || p.x > W + 5 || p.y < -5 || p.y > H + 5) { Object.assign(p, nueva(-Math.random() * 40)); p.h = []; continue; }
      if (p.h.length < 6) continue;
      // Más intenso donde el flujo se acelera al rodear el obstáculo
      const rapidez = Math.hypot(u, v) / (1.6 * (0.6 + k / 2));
      const a = fade(p.x) * Math.min(.85, .22 + .55 * Math.max(0, rapidez - .7)) * Math.min(1, p.h.length / (LARGO * 2));
      if (a < .03) continue;
      ctx.strokeStyle = acento + Math.round(a * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = .9 + .9 * Math.max(0, rapidez - 1);
      ctx.beginPath(); ctx.moveTo(p.h[0], p.h[1]);
      for (let i = 2; i < p.h.length; i += 2) ctx.lineTo(p.h[i], p.h[i + 1]);
      ctx.stroke();
    }
    if (!quieto) { t += .016; requestAnimationFrame(cuadro); }
  }
  if (quieto) for (let i = 0; i < 160; i++) cuadro(); else cuadro();
}

cargar();
