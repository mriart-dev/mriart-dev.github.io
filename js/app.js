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
  if (perfil.email) links.push(`<a class="btn" data-mail href="mailto:${esc(perfil.email)}?subject=${encodeURIComponent('Contacto desde tu portfolio')}">✉ Mail</a>`);
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
  const delPerfil = (perfil.certificaciones || []).map(c => {
    if (typeof c === 'string') c = {nombre: c};
    const claves = norm(c.clave || c.nombre).split('|').map(s => s.trim()).filter(Boolean);
    const f = archivos.find(f => !usados.has(f.name) && claves.some(k => norm(f.name).includes(k)));
    if (f) usados.add(f.name);
    const cuerpo = `<div class="ico">${f ? (/\.pdf$/i.test(f.name) ? 'PDF' : 'IMG') : '✓'}</div>
      <div><b>${esc(c.nombre)}</b><span>${esc(c.detalle || '')}${f ? (c.detalle ? ' · ' : '') + 'Ver documento' : ''}</span></div>`;
    return f ? `<a class="cert revelar" href="certificados/${encodeURIComponent(f.name)}" target="_blank" rel="noopener">${cuerpo}</a>`
             : `<div class="cert revelar">${cuerpo}</div>`;
  });
  const sueltos = archivos.filter(f => !usados.has(f.name)).map(f => `
    <a class="cert revelar" href="certificados/${encodeURIComponent(f.name)}" target="_blank" rel="noopener">
      <div class="ico">${/\.pdf$/i.test(f.name) ? 'PDF' : 'IMG'}</div>
      <div><b>${esc(nombre(f.name))}</b><span>Ver documento</span></div>
    </a>`);
  $('#certs').innerHTML = [...delPerfil, ...sueltos].join('') || '<p style="color:var(--sub)">Próximamente.</p>';
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

function aviso(texto) {
  let t = $('#aviso');
  if (!t) { t = document.createElement('div'); t.id = 'aviso'; document.body.appendChild(t); }
  t.textContent = texto; t.classList.add('ver');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('ver'), 2600);
}

let galeria = [], idx = 0;
function abrirVisor(imgs, i) { galeria = imgs; idx = i; $('#visor').hidden = false; mostrar(); }
function mostrar() { $('#visor img').src = galeria[idx]; }
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
    }
    if (!quieto) { t += .016; requestAnimationFrame(cuadro); }
  }
  cuadro();
}

cargar();
