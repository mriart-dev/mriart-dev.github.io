const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let proyectos = [], perfil = {}, estetica = {};

async function cargar() {
  const get = f => fetch(`data/${f}.json`, {cache: 'no-cache'}).then(r => r.json());
  [proyectos, perfil, estetica] = await Promise.all([get('proyectos'), get('perfil'), get('estetica')]);
  aplicarEstetica();
  pintarPerfil();
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
  $('#certificaciones').innerHTML = (perfil.certificaciones || []).map(i => `<li>${esc(i)}</li>`).join('');
  $('#habilidades').innerHTML = (perfil.habilidades || []).map(h => `<li>${esc(h)}</li>`).join('');
  document.querySelectorAll('[data-foto]').forEach(e => { if (perfil.foto) { e.src = perfil.foto; e.hidden = false; } });
  const links = [];
  if (perfil.email) links.push(`<a class="btn" href="mailto:${esc(perfil.email)}">${esc(perfil.email)}</a>`);
  if (perfil.linkedin) links.push(`<a class="btn ghost" href="${esc(perfil.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
  if (perfil.telefono) links.push(`<a class="btn ghost" href="https://wa.me/${perfil.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp ${esc(perfil.telefono)}</a>`);
  $('#links-contacto').innerHTML = links.join('') || '<p style="color:var(--sub)">Próximamente.</p>';
  // El CV aparece solo si el archivo existe en el repositorio
  if (perfil.cv) fetch(perfil.cv, {method: 'HEAD'}).then(r => {
    if (!r.ok) return;
    $('#btn-cv').href = perfil.cv; $('#btn-cv').hidden = false;
    $('#links-contacto').insertAdjacentHTML('beforeend', `<a class="btn ghost" href="${esc(perfil.cv)}" target="_blank" rel="noopener">Descargar CV (PDF)</a>`);
  }).catch(() => {});
  $('#anio').textContent = new Date().getFullYear();
}

function pintarProyectos(filtro) {
  const areas = ['Todos', ...new Set(proyectos.map(p => p.area).filter(Boolean))];
  $('#filtros').innerHTML = areas.length > 2 ? areas.map(a => `<button class="${a === filtro ? 'activo' : ''}">${esc(a)}</button>`).join('') : '';
  $('#filtros').querySelectorAll('button').forEach(b => b.onclick = () => pintarProyectos(b.textContent));
  $('#grilla').innerHTML = proyectos.filter(p => filtro === 'Todos' || p.area === filtro).map(p => `
    <a class="tarjeta revelar" href="#/proyecto/${esc(p.id)}">
      <div class="img"><img src="${esc(p.portada || p.imagenes?.[0])}" alt="${esc(p.titulo)}" loading="lazy"></div>
      <div class="info">
        <span class="meta">${esc(p.area)} · ${esc(p.anio)}</span>
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
        <span class="meta">${esc(p.area)} · ${esc(p.anio)}</span>
        <h1>${esc(p.titulo)}</h1>
        ${p.contexto ? `<p class="contexto">${esc(p.contexto)}</p>` : ''}
        <div class="det-grid">
          <div>${String(p.descripcion || '').split(/\n\s*\n/).map(t => `<p>${esc(t)}</p>`).join('')}</div>
          <dl class="ficha">
            <dt>Área</dt><dd>${esc(p.area)}</dd>
            <dt>Año</dt><dd>${esc(p.anio)}</dd>
            <dt>Herramientas</dt><dd><ul class="chips" style="margin-top:6px">${(p.herramientas || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul></dd>
            ${p.documento ? `<a class="btn" href="${esc(p.documento)}" target="_blank" rel="noopener">Ver informe completo (PDF)</a>` : ''}
          </dl>
        </div>
        ${(p.destacados || []).length ? `<div class="destacados">${p.destacados.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
        <div class="galeria">${(p.imagenes || []).map((src, i) => `<img src="${esc(src)}" alt="${esc(p.titulo)} — imagen ${i + 1}" data-i="${i}" loading="lazy">`).join('')}</div>`;
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

// Portada: estructura tubular en wireframe que gira y sigue al mouse
function animarPortada() {
  const modo = estetica.animacion_portada || 'estructura';
  const cv = $('#lienzo'), ctx = cv.getContext('2d');
  if (modo === 'ninguna') { cv.remove(); return; }
  const k = Math.max(0, Math.min(2, estetica.intensidad_animacion ?? 1));
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, mx = 0, my = 0;
  const ajustar = () => { const d = devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  ajustar(); addEventListener('resize', ajustar);
  addEventListener('mousemove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });

  // Nodos de un chasis simplificado: anillos (secciones) a lo largo del eje x
  const secciones = [[-2.2, .5, .35], [-1.4, .8, .6], [-.4, 1, 1.1], [.6, 1, 1.15], [1.5, .9, .9], [2.2, .8, .7]];
  const N = [], A = [];
  secciones.forEach(([x, w, h], i) => {
    const b = N.length;
    N.push([x, -w, 0], [x, w, 0], [x, w, h], [x, -w, h]);
    for (let j = 0; j < 4; j++) A.push([b + j, b + (j + 1) % 4]);
    if (i) {
      const a = b - 4;
      for (let j = 0; j < 4; j++) A.push([a + j, b + j]);
      A.push([a, b + 1], [a + 3, b + 2], [a + 1, b + 2], [a, b + 3]);
    }
  });
  const acento = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#4f7cac';
  let t = 0;
  function cuadro() {
    ctx.clearRect(0, 0, W, H);
    const s = Math.min(W, H) * (W > 800 ? .15 : .2), cx = W * (W > 800 ? .68 : .5), cy = H * .55;
    if (modo === 'grilla') {
      ctx.strokeStyle = acento + '22'; ctx.lineWidth = 1;
      const p = 40, off = (t * 20 * k) % p;
      for (let x = -off; x < W; x += p) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = -off; y < H; y += p) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    } else {
      const ry = t * .25 * k + mx * .8, rx = -.35 + my * .4;
      const P = N.map(([x, y, z]) => {
        z -= .5;
        let X = x * Math.cos(ry) - y * Math.sin(ry), Y = x * Math.sin(ry) + y * Math.cos(ry);
        let Z = z * Math.cos(rx) - Y * Math.sin(rx); Y = z * Math.sin(rx) + Y * Math.cos(rx);
        const f = 5 / (5 + Y);
        return [cx + X * s * f, cy - Z * s * f, f];
      });
      ctx.lineWidth = 1.2;
      A.forEach(([a, b]) => {
        const al = Math.round(Math.min(1, (P[a][2] + P[b][2]) / 2 - .55) * 200);
        ctx.strokeStyle = acento + Math.max(30, Math.min(220, al)).toString(16).padStart(2, '0');
        ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke();
      });
      ctx.fillStyle = acento;
      P.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); });
    }
    if (!quieto) { t += .016; requestAnimationFrame(cuadro); }
  }
  cuadro();
}

cargar();
