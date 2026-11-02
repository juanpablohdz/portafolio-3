/* =====================================================================
   Laboratorios interactivos de Conocimiento (sin librerías externas)
   Cada <div class="kb-lab" data-widget="..."> se convierte en un widget.
   ===================================================================== */
(function () {
  'use strict';

  var C = {
    azul: '#1E6FD9', morado: '#9B3FD9', verde: '#13A86A', naranja: '#E8772E', rojo: '#D64545',
    gris: '#C3C8D1', grisT: '#6b7280', tinta: '#1f2430', fondo: '#ffffff', rejilla: '#eef1f6'
  };
  var CLASES = [C.azul, C.naranja, C.verde];

  /* ---------- utilidades ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function fmt(v, d) { return Number(v).toLocaleString('es-MX', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function rnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function lienzo(box, alto) {
    var cv = el('canvas', 'kb-lab-canvas'); box.appendChild(cv);
    var o = { cv: cv, ctx: cv.getContext('2d'), W: 0, H: alto, dibujar: function () {} };
    function ajustar() {
      var w = Math.max(260, cv.parentElement.clientWidth), h = Math.min(alto, Math.round(w * 0.72));
      var dpr = window.devicePixelRatio || 1;
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); o.W = w; o.H = h; o.dibujar();
    }
    window.addEventListener('resize', ajustar);
    o.ajustar = ajustar;
    return o;
  }
  function controles(box) { var c = el('div', 'kb-lab-controls'); box.appendChild(c); return c; }
  function salida(box) { var s = el('div', 'kb-lab-out'); box.appendChild(s); return s; }
  function slider(cont, etiqueta, min, max, paso, val, formato, alCambiar) {
    var w = el('label', 'kb-ctrl'); var t = el('span', 'kb-ctrl-lbl');
    var i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = paso; i.value = val;
    var v = el('span', 'kb-ctrl-val');
    function upd() { v.textContent = formato ? formato(+i.value) : i.value; alCambiar(+i.value); }
    i.addEventListener('input', upd);
    t.textContent = etiqueta; w.appendChild(t); w.appendChild(i); w.appendChild(v); cont.appendChild(w);
    v.textContent = formato ? formato(+i.value) : i.value;
    return i;
  }
  function boton(cont, texto, fn, cls) { var b = el('button', 'kb-btn ' + (cls || ''), texto); b.type = 'button'; b.addEventListener('click', fn); cont.appendChild(b); return b; }
  function grupo(cont, opciones, inicial, fn) {
    var g = el('div', 'kb-seg'); var bs = [];
    opciones.forEach(function (op) {
      var b = boton(g, op[1], function () { bs.forEach(function (x) { x.classList.remove('activo'); }); b.classList.add('activo'); fn(op[0]); });
      if (op[0] === inicial) b.classList.add('activo'); bs.push(b);
    });
    cont.appendChild(g); return g;
  }
  /* Ejes de un plano con dominio [x0,x1]×[y0,y1] */
  function plano(o, x0, x1, y0, y1, pad) {
    pad = pad || { l: 46, r: 14, t: 14, b: 32 };
    var p = {
      sx: function (x) { return pad.l + (x - x0) / (x1 - x0) * (o.W - pad.l - pad.r); },
      sy: function (y) { return o.H - pad.b - (y - y0) / (y1 - y0) * (o.H - pad.t - pad.b); },
      ix: function (px) { return x0 + (px - pad.l) / (o.W - pad.l - pad.r) * (x1 - x0); },
      iy: function (py) { return y0 + (o.H - pad.b - py) / (o.H - pad.t - pad.b) * (y1 - y0); },
      pad: pad
    };
    p.ejes = function (tx, ty, nx, ny) {
      var c = o.ctx; c.save(); c.font = '11px Inter, system-ui, sans-serif'; c.fillStyle = C.grisT; c.strokeStyle = C.rejilla; c.lineWidth = 1;
      nx = nx || 6; ny = ny || 5;
      for (var i = 0; i <= nx; i++) { var x = x0 + (x1 - x0) * i / nx, X = p.sx(x); c.beginPath(); c.moveTo(X, pad.t); c.lineTo(X, o.H - pad.b); c.stroke(); c.textAlign = 'center'; c.fillText(tx ? tx(x) : fmt(x, 1), X, o.H - pad.b + 16); }
      for (var j = 0; j <= ny; j++) { var y = y0 + (y1 - y0) * j / ny, Y = p.sy(y); c.beginPath(); c.moveTo(pad.l, Y); c.lineTo(o.W - pad.r, Y); c.stroke(); c.textAlign = 'right'; c.fillText(ty ? ty(y) : fmt(y, 1), pad.l - 6, Y + 4); }
      c.restore();
    };
    return p;
  }
  function limpiar(o) { o.ctx.clearRect(0, 0, o.W, o.H); o.ctx.fillStyle = C.fondo; o.ctx.fillRect(0, 0, o.W, o.H); }
  function punto(c, x, y, r, color, borde) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); if (borde) { c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); } }
  function texto(c, t, x, y, color, tam, alin, peso) { c.save(); c.font = (peso || '600') + ' ' + (tam || 12) + 'px Inter, system-ui, sans-serif'; c.fillStyle = color || C.tinta; c.textAlign = alin || 'left'; c.fillText(t, x, y); c.restore(); }
  function posRaton(o, ev) { var r = o.cv.getBoundingClientRect(); var t = ev.touches ? ev.touches[0] : ev; return { x: t.clientX - r.left, y: t.clientY - r.top }; }

  /* ===================================================================
     1) Descenso del gradiente
     =================================================================== */
  function wGradiente(box) {
    var o = lienzo(box, 360), ct = controles(box), out = salida(box);
    var f = function (w) { return (w - 1) * (w - 1) + 1; }, df = function (w) { return 2 * (w - 1); };
    var lr = 0.15, w0 = -2.5, hist = [], timer = null;
    function reiniciar() { hist = [w0]; parar(); o.dibujar(); }
    function paso() { var w = hist[hist.length - 1]; var n = w - lr * df(w); if (Math.abs(n) > 1e3) { parar(); return; } hist.push(n); o.dibujar(); if (hist.length > 60) parar(); }
    function parar() { if (timer) { clearInterval(timer); timer = null; bPlay.textContent = '▶ Reproducir'; } }
    o.dibujar = function () {
      limpiar(o); var p = plano(o, -4, 6, 0, 24); p.ejes(function (x) { return fmt(x, 0); }, function (y) { return fmt(y, 0); }, 10, 4);
      var c = o.ctx; c.beginPath(); for (var x = -4; x <= 6; x += 0.05) { var X = p.sx(x), Y = p.sy(f(x)); x === -4 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.strokeStyle = C.azul; c.lineWidth = 2.6; c.stroke();
      punto(c, p.sx(1), p.sy(1), 6, C.verde, true); texto(c, 'mínimo', p.sx(1), p.sy(1) - 12, C.verde, 11, 'center');
      c.setLineDash([4, 4]); c.strokeStyle = C.naranja; c.lineWidth = 1.4; c.beginPath();
      hist.forEach(function (w, i) { var X = p.sx(Math.max(-4, Math.min(6, w))), Y = p.sy(Math.min(24, f(w))); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); c.setLineDash([]);
      hist.forEach(function (w, i) { if (Math.abs(w) < 6 && f(w) < 22) punto(c, p.sx(w), p.sy(f(w)), i === hist.length - 1 ? 8 : 4, i === hist.length - 1 ? C.naranja : 'rgba(232,119,46,.45)', i === hist.length - 1); });
      var w = hist[hist.length - 1];
      if (Math.abs(w) < 6 && f(w) < 22) { var m = df(w); c.strokeStyle = C.tinta; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.sx(w - 1), p.sy(f(w) - m)); c.lineTo(p.sx(w + 1), p.sy(f(w) + m)); c.stroke(); }
      var diverge = Math.abs(w - 1) > Math.abs(hist[0] - 1) + 0.01 && hist.length > 2;
      out.innerHTML = '<b>Iteración:</b> ' + (hist.length - 1) + ' &nbsp; <b>w:</b> ' + fmt(w, 3) + ' &nbsp; <b>error:</b> ' + fmt(f(w), 3) + ' &nbsp; <b>pendiente:</b> ' + fmt(df(w), 3) +
        (diverge ? '<br><span class="kb-alerta">La tasa de aprendizaje es demasiado grande: cada paso se pasa del mínimo y el error crece.</span>' :
          (Math.abs(w - 1) < 0.01 ? '<br><span class="kb-ok">Llegó al mínimo: la pendiente es prácticamente cero.</span>' : ''));
    };
    slider(ct, 'Tasa de aprendizaje η', 0.02, 1.1, 0.01, lr, function (v) { return fmt(v, 2); }, function (v) { lr = v; reiniciar(); });
    slider(ct, 'Punto de inicio w₀', -3, 5, 0.1, w0, function (v) { return fmt(v, 1); }, function (v) { w0 = v; reiniciar(); });
    boton(ct, 'Paso', paso);
    var bPlay = boton(ct, '▶ Reproducir', function () { if (timer) { parar(); return; } bPlay.textContent = '❚❚ Pausa'; timer = setInterval(paso, 450); }, 'kb-btn-pri');
    boton(ct, 'Reiniciar', reiniciar);
    hist = [w0]; o.ajustar();
  }

  /* ===================================================================
     2) Derivada como pendiente
     =================================================================== */
  function wDerivada(box) {
    var o = lienzo(box, 340), ct = controles(box), out = salida(box);
    var f = function (x) { return 0.1 * x * x * x - x; }, df = function (x) { return 0.3 * x * x - 1; }, x0 = -3;
    o.dibujar = function () {
      limpiar(o); var p = plano(o, -4.5, 4.5, -5, 5); p.ejes(null, null, 9, 5); var c = o.ctx;
      c.beginPath(); for (var x = -4.5; x <= 4.5; x += 0.05) { var X = p.sx(x), Y = p.sy(f(x)); x === -4.5 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.strokeStyle = C.azul; c.lineWidth = 2.6; c.stroke();
      var m = df(x0), col = Math.abs(m) < 0.08 ? C.verde : (m > 0 ? C.naranja : C.morado);
      c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(p.sx(x0 - 1.6), p.sy(f(x0) - 1.6 * m)); c.lineTo(p.sx(x0 + 1.6), p.sy(f(x0) + 1.6 * m)); c.stroke();
      punto(c, p.sx(x0), p.sy(f(x0)), 7, col, true);
      [-Math.sqrt(10 / 3), Math.sqrt(10 / 3)].forEach(function (e, i) { punto(c, p.sx(e), p.sy(f(e)), 4, C.verde); texto(c, i ? 'mínimo local' : 'máximo local', p.sx(e), p.sy(f(e)) + (i ? 18 : -10), C.verde, 10.5, 'center'); });
      var estado = Math.abs(m) < 0.08 ? 'la pendiente es cero: <b>máximo o mínimo</b>.' : (m > 0 ? 'la pendiente es positiva: la función <b>sube</b>.' : 'la pendiente es negativa: la función <b>baja</b>.');
      out.innerHTML = '<b>x =</b> ' + fmt(x0, 2) + ' &nbsp; <b>f(x) =</b> ' + fmt(f(x0), 2) + ' &nbsp; <b>f′(x) =</b> ' + fmt(m, 2) + '<br>En este punto ' + estado;
    };
    slider(ct, 'Mueve el punto x', -4.2, 4.2, 0.02, x0, function (v) { return fmt(v, 2); }, function (v) { x0 = v; o.dibujar(); });
    o.ajustar();
  }

  /* ===================================================================
     3) Punto de equilibrio
     =================================================================== */
  function wEquilibrio(box) {
    var o = lienzo(box, 340), ct = controles(box), out = salida(box);
    var P = 120, CF = 40000, CV = 70, Q = 1200;
    o.dibujar = function () {
      limpiar(o); var ymax = Math.max(P * Q, CF + CV * Q) * 1.05;
      var p = plano(o, 0, Q, 0, ymax, { l: 58, r: 14, t: 14, b: 32 }); p.ejes(function (x) { return fmt(x, 0); }, function (y) { return fmt(y / 1000, 0) + 'k'; }, 6, 5);
      var c = o.ctx, qe = P > CV ? CF / (P - CV) : null;
      if (qe && qe < Q) {
        c.fillStyle = 'rgba(214,69,69,.10)'; c.beginPath(); c.moveTo(p.sx(0), p.sy(0)); c.lineTo(p.sx(qe), p.sy(P * qe)); c.lineTo(p.sx(0), p.sy(CF)); c.fill();
        c.fillStyle = 'rgba(19,168,106,.12)'; c.beginPath(); c.moveTo(p.sx(qe), p.sy(P * qe)); c.lineTo(p.sx(Q), p.sy(P * Q)); c.lineTo(p.sx(Q), p.sy(CF + CV * Q)); c.fill();
      }
      c.lineWidth = 2.6; c.strokeStyle = C.azul; c.beginPath(); c.moveTo(p.sx(0), p.sy(0)); c.lineTo(p.sx(Q), p.sy(P * Q)); c.stroke();
      c.strokeStyle = C.naranja; c.beginPath(); c.moveTo(p.sx(0), p.sy(CF)); c.lineTo(p.sx(Q), p.sy(CF + CV * Q)); c.stroke();
      texto(c, 'Ingreso', p.sx(Q) - 4, p.sy(P * Q) - 6, C.azul, 11, 'right'); texto(c, 'Costo', p.sx(Q) - 4, p.sy(CF + CV * Q) + 16, C.naranja, 11, 'right');
      if (qe && qe < Q) { punto(c, p.sx(qe), p.sy(P * qe), 7, C.tinta, true); texto(c, fmt(qe, 0) + ' u.', p.sx(qe) + 10, p.sy(P * qe) + 4, C.tinta, 12); }
      var g = P * Q - (CF + CV * Q);
      out.innerHTML = qe ? ('<b>Punto de equilibrio:</b> ' + fmt(qe, 0) + ' unidades (margen por unidad: $' + fmt(P - CV) + '). ' + '<b>Ganancia con ' + fmt(Q) + ' unidades:</b> <span class="' + (g >= 0 ? 'kb-ok' : 'kb-alerta') + '">$' + fmt(g) + '</span>')
        : '<span class="kb-alerta">El precio no cubre el costo variable: cada unidad vendida pierde dinero y nunca se alcanza el equilibrio.</span>';
    };
    slider(ct, 'Precio por unidad', 40, 250, 1, P, function (v) { return '$' + fmt(v); }, function (v) { P = v; o.dibujar(); });
    slider(ct, 'Costo fijo', 0, 120000, 1000, CF, function (v) { return '$' + fmt(v); }, function (v) { CF = v; o.dibujar(); });
    slider(ct, 'Costo variable por unidad', 10, 200, 1, CV, function (v) { return '$' + fmt(v); }, function (v) { CV = v; o.dibujar(); });
    o.ajustar();
  }

  /* ===================================================================
     4) Similitud coseno (arrastra los vectores)
     =================================================================== */
  function wCoseno(box) {
    var o = lienzo(box, 340), out = salida(box);
    var A = [3, 1], B = [1.2, 2.6], drag = null, p;
    o.dibujar = function () {
      limpiar(o); p = plano(o, -4, 4, -3, 3); p.ejes(function (x) { return fmt(x, 0); }, function (y) { return fmt(y, 0); }, 8, 6); var c = o.ctx;
      [[A, C.azul, 'A'], [B, C.naranja, 'B']].forEach(function (v) {
        var X = p.sx(v[0][0]), Y = p.sy(v[0][1]), X0 = p.sx(0), Y0 = p.sy(0), ang = Math.atan2(Y - Y0, X - X0);
        c.strokeStyle = v[1]; c.lineWidth = 3; c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X, Y); c.stroke();
        c.fillStyle = v[1]; c.beginPath(); c.moveTo(X, Y); c.lineTo(X - 12 * Math.cos(ang - .4), Y - 12 * Math.sin(ang - .4)); c.lineTo(X - 12 * Math.cos(ang + .4), Y - 12 * Math.sin(ang + .4)); c.fill();
        punto(c, X, Y, 9, 'rgba(255,255,255,.01)'); c.lineWidth = 2; c.strokeStyle = v[1]; c.beginPath(); c.arc(X, Y, 9, 0, Math.PI * 2); c.stroke();
        texto(c, v[2], X + 12, Y - 8, v[1], 14);
      });
      var dot = A[0] * B[0] + A[1] * B[1], na = Math.hypot(A[0], A[1]), nb = Math.hypot(B[0], B[1]), cos = dot / (na * nb || 1), grados = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
      var a1 = Math.atan2(-A[1], A[0]), a2 = Math.atan2(-B[1], B[0]);
      c.strokeStyle = C.morado; c.lineWidth = 1.5; c.beginPath(); c.arc(p.sx(0), p.sy(0), 34, Math.min(a1, a2), Math.max(a1, a2), Math.abs(a1 - a2) > Math.PI); c.stroke();
      var lect = cos > 0.9 ? 'muy parecidos' : cos > 0.5 ? 'parecidos' : cos > -0.1 ? 'casi sin relación' : 'opuestos';
      out.innerHTML = '<b>Ángulo:</b> ' + fmt(grados, 1) + '° &nbsp; <b>Similitud coseno:</b> ' + fmt(cos, 3) + ' → los vectores son <b>' + lect + '</b>.<br><small>Arrastra la punta de las flechas. Así compara un recomendador dos clientes o un buscador dos textos.</small>';
    };
    function cerca(m) { var best = null, d = 22; [[A, 'A'], [B, 'B']].forEach(function (v) { var dd = Math.hypot(m.x - p.sx(v[0][0]), m.y - p.sy(v[0][1])); if (dd < d) { d = dd; best = v[0]; } }); return best; }
    function mover(ev) { if (!drag) return; ev.preventDefault(); var m = posRaton(o, ev); drag[0] = Math.max(-3.9, Math.min(3.9, p.ix(m.x))); drag[1] = Math.max(-2.9, Math.min(2.9, p.iy(m.y))); o.dibujar(); }
    o.cv.addEventListener('mousedown', function (ev) { drag = cerca(posRaton(o, ev)); });
    o.cv.addEventListener('touchstart', function (ev) { drag = cerca(posRaton(o, ev)); if (drag) ev.preventDefault(); }, { passive: false });
    window.addEventListener('mousemove', mover); o.cv.addEventListener('touchmove', mover, { passive: false });
    window.addEventListener('mouseup', function () { drag = null; }); window.addEventListener('touchend', function () { drag = null; });
    o.cv.style.cursor = 'grab';
    o.ajustar();
  }

  /* ===================================================================
     5) Funciones de activación
     =================================================================== */
  function wActivacion(box) {
    var o = lienzo(box, 300), ct = controles(box), out = salida(box);
    var fun = 'sigmoide', z = 1;
    var F = {
      sigmoide: [function (x) { return 1 / (1 + Math.exp(-x)); }, -0.2, 1.2, 'Convierte cualquier número en una probabilidad entre 0 y 1 (regresión logística, salida binaria).'],
      relu: [function (x) { return Math.max(0, x); }, -1, 6, 'Deja pasar los valores positivos y apaga los negativos. Es la activación más usada en capas ocultas porque entrena rápido.'],
      tanh: [function (x) { return Math.tanh(x); }, -1.2, 1.2, 'Como la sigmoide pero centrada en cero, entre −1 y 1. Común en redes recurrentes.'],
      escalon: [function (x) { return x >= 0 ? 1 : 0; }, -0.2, 1.2, 'La del perceptrón original: todo o nada. No sirve para backpropagation porque su derivada es cero.']
    };
    o.dibujar = function () {
      var f = F[fun]; limpiar(o); var p = plano(o, -6, 6, f[1], f[2]); p.ejes(function (x) { return fmt(x, 0); }, function (y) { return fmt(y, 1); }, 6, 4); var c = o.ctx;
      c.beginPath(); for (var x = -6; x <= 6; x += 0.02) { var X = p.sx(x), Y = p.sy(f[0](x)); x === -6 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.strokeStyle = C.morado; c.lineWidth = 2.8; c.stroke();
      c.setLineDash([4, 4]); c.strokeStyle = C.grisT; c.lineWidth = 1; c.beginPath(); c.moveTo(p.sx(z), p.sy(f[1])); c.lineTo(p.sx(z), p.sy(f[0](z))); c.lineTo(p.sx(-6), p.sy(f[0](z))); c.stroke(); c.setLineDash([]);
      punto(c, p.sx(z), p.sy(f[0](z)), 7, C.naranja, true);
      out.innerHTML = '<b>Entrada z =</b> ' + fmt(z, 2) + ' → <b>salida =</b> ' + fmt(f[0](z), 3) + '<br>' + f[3];
    };
    grupo(ct, [['sigmoide', 'Sigmoide'], ['relu', 'ReLU'], ['tanh', 'Tanh'], ['escalon', 'Escalón']], fun, function (v) { fun = v; o.dibujar(); });
    slider(ct, 'Entrada z (suma ponderada)', -6, 6, 0.05, z, function (v) { return fmt(v, 2); }, function (v) { z = v; o.dibujar(); });
    o.ajustar();
  }

  /* ===================================================================
     6) Sobreajuste: grado del polinomio
     =================================================================== */
  function ajustePoli(xs, ys, g) {
    var n = g + 1, A = [], b = [];
    for (var i = 0; i < n; i++) { A.push(new Array(n).fill(0)); b.push(0); }
    xs.forEach(function (x, k) { var pw = []; for (var i = 0; i < n; i++) pw.push(Math.pow(x, i)); for (var i2 = 0; i2 < n; i2++) { b[i2] += pw[i2] * ys[k]; for (var j = 0; j < n; j++) A[i2][j] += pw[i2] * pw[j]; } });
    for (var d = 0; d < n; d++) A[d][d] += 1e-9;
    for (var c = 0; c < n; c++) { var m = c; for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r; var t = A[c]; A[c] = A[m]; A[m] = t; var tb = b[c]; b[c] = b[m]; b[m] = tb;
      for (var r2 = c + 1; r2 < n; r2++) { var fct = A[r2][c] / A[c][c]; for (var k2 = c; k2 < n; k2++) A[r2][k2] -= fct * A[c][k2]; b[r2] -= fct * b[c]; } }
    var w = new Array(n).fill(0); for (var i3 = n - 1; i3 >= 0; i3--) { var s = b[i3]; for (var j3 = i3 + 1; j3 < n; j3++) s -= A[i3][j3] * w[j3]; w[i3] = s / A[i3][i3]; }
    return function (x) { var y = 0, p = 1; for (var i = 0; i < n; i++) { y += w[i] * p; p *= x; } return y; };
  }
  function wPolinomio(box) {
    var o = lienzo(box, 340), ct = controles(box), out = salida(box);
    var r = rnd(7), real = function (x) { return Math.sin(Math.PI * x); }, tr = [], te = [], g = 3;
    for (var i = 0; i < 14; i++) { var x = -1 + 2 * (i + r() * 0.8) / 14; tr.push([x, real(x) + gauss(r) * 0.22]); }
    for (var j = 0; j < 40; j++) { var x2 = -0.98 + 1.96 * r(); te.push([x2, real(x2) + gauss(r) * 0.22]); }
    o.dibujar = function () {
      var f = ajustePoli(tr.map(function (p) { return p[0]; }), tr.map(function (p) { return p[1]; }), g);
      function ecm(d) { return d.reduce(function (s, p) { var e = f(p[0]) - p[1]; return s + e * e; }, 0) / d.length; }
      var eTr = ecm(tr), eTe = ecm(te);
      limpiar(o); var p = plano(o, -1.05, 1.05, -2, 2); p.ejes(function (x) { return fmt(x, 1); }, function (y) { return fmt(y, 0); }, 6, 4); var c = o.ctx;
      c.setLineDash([5, 5]); c.strokeStyle = C.gris; c.lineWidth = 1.5; c.beginPath(); for (var x = -1.05; x <= 1.05; x += 0.01) { var X = p.sx(x), Y = p.sy(real(x)); x === -1.05 ? c.moveTo(X, Y) : c.lineTo(X, Y); } c.stroke(); c.setLineDash([]);
      te.forEach(function (q) { punto(c, p.sx(q[0]), p.sy(q[1]), 3.5, 'rgba(232,119,46,.55)'); });
      tr.forEach(function (q) { punto(c, p.sx(q[0]), p.sy(q[1]), 5, C.tinta, true); });
      var col = g <= 1 ? C.naranja : (g >= 9 ? C.rojo : C.verde);
      c.save(); c.beginPath(); c.rect(p.pad.l, p.pad.t, o.W - p.pad.l - p.pad.r, o.H - p.pad.t - p.pad.b); c.clip();
      c.strokeStyle = col; c.lineWidth = 2.8; c.beginPath(); for (var x3 = -1.05; x3 <= 1.05; x3 += 0.005) { var X3 = p.sx(x3), Y3 = p.sy(f(x3)); x3 === -1.05 ? c.moveTo(X3, Y3) : c.lineTo(X3, Y3); } c.stroke(); c.restore();
      var diag = g <= 1 ? '<span class="kb-alerta">Subajuste: el modelo es tan simple que falla en entrenamiento y en prueba.</span>' :
        (eTe > eTr * 2.5 ? '<span class="kb-alerta">Sobreajuste: casi no se equivoca con los puntos que vio, pero falla con los nuevos (naranjas).</span>' : '<span class="kb-ok">Buen equilibrio: el error en datos nuevos es parecido al de entrenamiento.</span>');
      out.innerHTML = '<b>Grado ' + g + '</b> &nbsp; <b>Error en entrenamiento:</b> ' + fmt(eTr, 3) + ' &nbsp; <b>Error en datos nuevos:</b> ' + fmt(eTe, 3) + '<br>' + diag +
        '<br><small>Puntos negros: datos de entrenamiento. Puntos naranjas: datos que el modelo nunca vio. Línea gris: el patrón real.</small>';
    };
    slider(ct, 'Complejidad (grado del polinomio)', 1, 12, 1, g, null, function (v) { g = v; o.dibujar(); });
    o.ajustar();
  }

  /* ===================================================================
     Datos 2D de ejemplo para clasificación
     =================================================================== */
  function nubes(seed, centros, n, sd) {
    var r = rnd(seed), d = [];
    centros.forEach(function (cc, k) { for (var i = 0; i < n; i++) d.push({ x: cc[0] + gauss(r) * sd, y: cc[1] + gauss(r) * sd, c: k }); });
    return d;
  }

  /* ===================================================================
     7) Perceptrón: entrena y mueve la frontera
     =================================================================== */
  function wPerceptron(box) {
    var o = lienzo(box, 360), ct = controles(box), out = salida(box);
    var datos = nubes(3, [[-1.2, -0.8], [1.1, 1]], 18, 0.65), w = [0.2, -1, 0.3], lr = 0.1, epoca = 0, timer = null, claseNueva = 0, p;
    function pred(q) { return w[0] * q.x + w[1] * q.y + w[2] >= 0 ? 1 : 0; }
    function epocaEntrenar() { var errores = 0; datos.forEach(function (q) { var e = q.c - pred(q); if (e !== 0) { errores++; w[0] += lr * e * q.x; w[1] += lr * e * q.y; w[2] += lr * e; } }); epoca++; o.dibujar(); if (errores === 0 || epoca > 60) parar(); }
    function parar() { if (timer) { clearInterval(timer); timer = null; bE.textContent = '▶ Entrenar'; } }
    o.dibujar = function () {
      limpiar(o); p = plano(o, -3, 3, -3, 3, { l: 14, r: 14, t: 14, b: 14 }); var c = o.ctx;
      for (var gx = 0; gx < o.W; gx += 8) for (var gy = 0; gy < o.H; gy += 8) { var q = { x: p.ix(gx + 4), y: p.iy(gy + 4) }; c.fillStyle = pred(q) ? 'rgba(232,119,46,.10)' : 'rgba(30,111,217,.10)'; c.fillRect(gx, gy, 8, 8); }
      if (Math.abs(w[1]) > 1e-6) { c.strokeStyle = C.tinta; c.lineWidth = 2.4; c.beginPath(); c.moveTo(p.sx(-3), p.sy((-w[2] - w[0] * -3) / w[1])); c.lineTo(p.sx(3), p.sy((-w[2] - w[0] * 3) / w[1])); c.stroke(); }
      var bien = 0; datos.forEach(function (q) { var ok = pred(q) === q.c; if (ok) bien++; punto(c, p.sx(q.x), p.sy(q.y), 6, CLASES[q.c], true); if (!ok) { c.strokeStyle = C.rojo; c.lineWidth = 2; c.beginPath(); c.arc(p.sx(q.x), p.sy(q.y), 10, 0, Math.PI * 2); c.stroke(); } });
      out.innerHTML = '<b>Época:</b> ' + epoca + ' &nbsp; <b>Pesos:</b> w₁ = ' + fmt(w[0], 2) + ', w₂ = ' + fmt(w[1], 2) + ', b = ' + fmt(w[2], 2) + ' &nbsp; <b>Aciertos:</b> ' + bien + ' / ' + datos.length +
        '<br><small>Cada error mueve la línea un poco (regla del perceptrón: w ← w + η·error·x). Haz clic en el lienzo para agregar puntos; los círculos rojos son los que todavía clasifica mal.</small>';
    };
    o.cv.addEventListener('click', function (ev) { var m = posRaton(o, ev); datos.push({ x: p.ix(m.x), y: p.iy(m.y), c: claseNueva }); o.dibujar(); });
    o.cv.style.cursor = 'crosshair';
    var bE = boton(ct, '▶ Entrenar', function () { if (timer) { parar(); return; } bE.textContent = '❚❚ Pausa'; timer = setInterval(epocaEntrenar, 500); }, 'kb-btn-pri');
    boton(ct, 'Una época', epocaEntrenar);
    boton(ct, 'Reiniciar pesos', function () { parar(); w = [0.2, -1, 0.3]; epoca = 0; o.dibujar(); });
    grupo(ct, [[0, '+ Clase azul'], [1, '+ Clase naranja']], 0, function (v) { claseNueva = v; });
    slider(ct, 'Tasa de aprendizaje η', 0.01, 1, 0.01, lr, function (v) { return fmt(v, 2); }, function (v) { lr = v; });
    o.ajustar();
  }

  /* ===================================================================
     8) KNN
     =================================================================== */
  function wKnn(box) {
    var o = lienzo(box, 360), ct = controles(box), out = salida(box);
    var datos = nubes(11, [[-1.2, 1], [1.3, 0.8], [0, -1.3]], 16, 0.75), k = 5, qp = { x: 0.1, y: 0.2 }, mapa = false, p;
    function vecinos(q) { return datos.map(function (d) { return { d: d, dist: Math.hypot(d.x - q.x, d.y - q.y) }; }).sort(function (a, b) { return a.dist - b.dist; }).slice(0, k); }
    function voto(vs) { var cnt = [0, 0, 0]; vs.forEach(function (v) { cnt[v.d.c]++; }); var m = 0; for (var i = 1; i < 3; i++) if (cnt[i] > cnt[m]) m = i; return { c: m, cnt: cnt }; }
    o.dibujar = function () {
      limpiar(o); p = plano(o, -3, 3, -3, 3, { l: 14, r: 14, t: 14, b: 14 }); var c = o.ctx;
      if (mapa) for (var gx = 0; gx < o.W; gx += 10) for (var gy = 0; gy < o.H; gy += 10) { var v = voto(vecinos({ x: p.ix(gx + 5), y: p.iy(gy + 5) })).c; c.fillStyle = ['rgba(30,111,217,.13)', 'rgba(232,119,46,.13)', 'rgba(19,168,106,.13)'][v]; c.fillRect(gx, gy, 10, 10); }
      var vs = vecinos(qp), r = voto(vs);
      vs.forEach(function (v) { c.strokeStyle = 'rgba(31,36,48,.35)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(p.sx(qp.x), p.sy(qp.y)); c.lineTo(p.sx(v.d.x), p.sy(v.d.y)); c.stroke(); });
      c.strokeStyle = 'rgba(31,36,48,.25)'; c.setLineDash([4, 4]); c.beginPath(); c.arc(p.sx(qp.x), p.sy(qp.y), Math.abs(p.sx(vs[vs.length - 1].dist) - p.sx(0)), 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      datos.forEach(function (d) { punto(c, p.sx(d.x), p.sy(d.y), 5.5, CLASES[d.c], true); });
      c.save(); c.translate(p.sx(qp.x), p.sy(qp.y)); c.rotate(Math.PI / 4); c.fillStyle = CLASES[r.c]; c.fillRect(-9, -9, 18, 18); c.lineWidth = 2.5; c.strokeStyle = C.tinta; c.strokeRect(-9, -9, 18, 18); c.restore();
      var nombres = ['azul', 'naranja', 'verde'];
      out.innerHTML = '<b>k = ' + k + '</b> &nbsp; Votos: <span style="color:' + C.azul + '">azul ' + r.cnt[0] + '</span> · <span style="color:' + C.naranja + '">naranja ' + r.cnt[1] + '</span> · <span style="color:' + C.verde + '">verde ' + r.cnt[2] + '</span> → el nuevo punto se clasifica como <b>' + nombres[r.c] + '</b>.' +
        '<br><small>Haz clic en cualquier lugar para mover el punto nuevo (rombo). Con k pequeño la frontera es nerviosa; con k grande se suaviza.</small>';
    };
    o.cv.addEventListener('click', function (ev) { var m = posRaton(o, ev); qp = { x: p.ix(m.x), y: p.iy(m.y) }; o.dibujar(); }); o.cv.style.cursor = 'crosshair';
    slider(ct, 'Número de vecinos k', 1, 25, 1, k, null, function (v) { k = v; o.dibujar(); });
    boton(ct, 'Mostrar / ocultar mapa de decisión', function () { mapa = !mapa; o.dibujar(); });
    o.ajustar();
  }

  /* ===================================================================
     9) K-means paso a paso
     =================================================================== */
  function wKmeans(box) {
    var o = lienzo(box, 360), ct = controles(box), out = salida(box);
    var datos = nubes(21, [[-1.5, 1.2], [1.4, 1.3], [0.2, -1.4], [-1.6, -1.2]], 22, 0.55).map(function (d) { return { x: d.x, y: d.y, c: -1 }; });
    var k = 3, cent = [], iter = 0, fase = 'asignar', timer = null, p, sem = 5;
    function iniciar() { var r = rnd(sem++); cent = []; for (var i = 0; i < k; i++) { var d = datos[Math.floor(r() * datos.length)]; cent.push({ x: d.x + 0.01 * i, y: d.y }); } datos.forEach(function (d) { d.c = -1; }); iter = 0; fase = 'asignar'; parar(); o.dibujar(); }
    function paso() {
      if (fase === 'asignar') { var cambio = false; datos.forEach(function (d) { var b = 0, bd = 1e9; cent.forEach(function (c, i) { var dd = Math.hypot(d.x - c.x, d.y - c.y); if (dd < bd) { bd = dd; b = i; } }); if (d.c !== b) cambio = true; d.c = b; }); fase = 'mover'; if (!cambio && iter > 0) { parar(); fase = 'fin'; } }
      else if (fase === 'mover') { cent.forEach(function (c, i) { var s = datos.filter(function (d) { return d.c === i; }); if (s.length) { c.x = s.reduce(function (a, d) { return a + d.x; }, 0) / s.length; c.y = s.reduce(function (a, d) { return a + d.y; }, 0) / s.length; } }); fase = 'asignar'; iter++; }
      o.dibujar();
    }
    function parar() { if (timer) { clearInterval(timer); timer = null; bP.textContent = '▶ Reproducir'; } }
    var col = [C.azul, C.naranja, C.verde, C.morado, '#C9A100', '#0FA3B1'];
    o.dibujar = function () {
      limpiar(o); p = plano(o, -3, 3, -3, 3, { l: 14, r: 14, t: 14, b: 14 }); var c = o.ctx;
      datos.forEach(function (d) { if (d.c >= 0) { c.strokeStyle = col[d.c] + '55'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.sx(d.x), p.sy(d.y)); c.lineTo(p.sx(cent[d.c].x), p.sy(cent[d.c].y)); c.stroke(); } });
      datos.forEach(function (d) { punto(c, p.sx(d.x), p.sy(d.y), 5, d.c >= 0 ? col[d.c] : C.gris, true); });
      cent.forEach(function (ce, i) { var X = p.sx(ce.x), Y = p.sy(ce.y); c.strokeStyle = C.tinta; c.lineWidth = 3; c.beginPath(); c.moveTo(X - 9, Y - 9); c.lineTo(X + 9, Y + 9); c.moveTo(X + 9, Y - 9); c.lineTo(X - 9, Y + 9); c.stroke(); c.strokeStyle = col[i]; c.lineWidth = 2; c.stroke(); });
      var inercia = datos.reduce(function (s, d) { return d.c < 0 ? s : s + Math.pow(Math.hypot(d.x - cent[d.c].x, d.y - cent[d.c].y), 2); }, 0);
      var msg = fase === 'fin' ? '<span class="kb-ok">Convergió: ningún punto cambió de grupo.</span>' : (fase === 'mover' ? 'Siguiente paso: cada centro (✕) se mueve al promedio de sus puntos.' : 'Siguiente paso: cada punto se asigna al centro más cercano.');
      out.innerHTML = '<b>Iteración:</b> ' + iter + ' &nbsp; <b>Grupos k:</b> ' + k + ' &nbsp; <b>Inercia (suma de distancias²):</b> ' + fmt(inercia, 1) + '<br>' + msg + '<br><small>Prueba k = 4: hay cuatro grupos reales en los datos. Cada “Reiniciar” elige centros iniciales distintos.</small>';
    };
    boton(ct, 'Paso', paso);
    var bP = boton(ct, '▶ Reproducir', function () { if (timer) { parar(); return; } bP.textContent = '❚❚ Pausa'; timer = setInterval(function () { if (fase === 'fin') { parar(); return; } paso(); }, 600); }, 'kb-btn-pri');
    boton(ct, 'Reiniciar', iniciar);
    slider(ct, 'Número de grupos k', 2, 6, 1, k, null, function (v) { k = v; iniciar(); });
    iniciar(); o.ajustar();
  }

  /* ===================================================================
     10) Árbol de decisión con profundidad variable
     =================================================================== */
  function wArbol(box) {
    var o = lienzo(box, 360), ct = controles(box), out = salida(box);
    var r = rnd(31), datos = [];
    for (var i = 0; i < 160; i++) { var x = -3 + 6 * r(), y = -3 + 6 * r(); var c = (y > 0.8 * Math.sin(1.3 * x) + 0.3 * x) ? 1 : 0; if (r() < 0.08) c = 1 - c; datos.push({ x: x, y: y, c: c }); }
    var prof = 2, arbol;
    function gini(s) { if (!s.length) return 0; var p1 = s.filter(function (d) { return d.c; }).length / s.length; return 1 - p1 * p1 - (1 - p1) * (1 - p1); }
    function construir(s, d) {
      var p1 = s.filter(function (q) { return q.c; }).length / (s.length || 1), hoja = { hoja: true, c: p1 >= 0.5 ? 1 : 0, n: s.length };
      if (d >= prof || s.length < 6 || p1 === 0 || p1 === 1) return hoja;
      var mejor = null;
      ['x', 'y'].forEach(function (v) { var vals = s.map(function (q) { return q[v]; }).sort(function (a, b) { return a - b; });
        for (var i = 3; i < vals.length - 3; i += 2) { var t = (vals[i] + vals[i + 1]) / 2, L = s.filter(function (q) { return q[v] <= t; }), R = s.filter(function (q) { return q[v] > t; });
          var g = (L.length * gini(L) + R.length * gini(R)) / s.length; if (!mejor || g < mejor.g) mejor = { g: g, v: v, t: t, L: L, R: R }; } });
      if (!mejor || mejor.g >= gini(s) - 1e-9) return hoja;
      return { v: mejor.v, t: mejor.t, izq: construir(mejor.L, d + 1), der: construir(mejor.R, d + 1) };
    }
    function pred(n, q) { while (!n.hoja) n = q[n.v] <= n.t ? n.izq : n.der; return n.c; }
    function hojas(n) { return n.hoja ? 1 : hojas(n.izq) + hojas(n.der); }
    function reglas(n, d) { if (n.hoja || d > 1) return ''; var nombre = n.v === 'x' ? 'ingreso' : 'antigüedad'; return '¿' + nombre + ' ≤ ' + fmt(n.t, 2) + '?'; }
    o.dibujar = function () {
      arbol = construir(datos, 0); limpiar(o); var p = plano(o, -3, 3, -3, 3, { l: 14, r: 14, t: 14, b: 14 }), c = o.ctx;
      for (var gx = 0; gx < o.W; gx += 6) for (var gy = 0; gy < o.H; gy += 6) { c.fillStyle = pred(arbol, { x: p.ix(gx + 3), y: p.iy(gy + 3) }) ? 'rgba(232,119,46,.16)' : 'rgba(30,111,217,.14)'; c.fillRect(gx, gy, 6, 6); }
      var bien = 0; datos.forEach(function (q) { if (pred(arbol, q) === q.c) bien++; punto(c, p.sx(q.x), p.sy(q.y), 4.5, CLASES[q.c], true); });
      var acc = bien / datos.length;
      out.innerHTML = '<b>Profundidad:</b> ' + prof + ' &nbsp; <b>Hojas (reglas finales):</b> ' + hojas(arbol) + ' &nbsp; <b>Aciertos en entrenamiento:</b> ' + fmt(acc * 100, 0) + '%' + (arbol.hoja ? '' : ' &nbsp; <b>Primera pregunta:</b> ' + reglas(arbol, 0)) +
        '<br>' + (prof >= 7 ? '<span class="kb-alerta">Con tanta profundidad el árbol hace cajitas alrededor de puntos sueltos: está memorizando el ruido.</span>' : (prof <= 1 ? 'Una sola pregunta divide el plano en dos: demasiado simple para esta frontera curva.' : 'Cada nivel agrega preguntas y la frontera escalonada se acerca a la forma real.')) +
        '<br><small>Cada corte es una pregunta del tipo “¿variable ≤ valor?”. Por eso las fronteras de un árbol siempre son rectángulos.</small>';
    };
    slider(ct, 'Profundidad máxima del árbol', 1, 9, 1, prof, null, function (v) { prof = v; o.dibujar(); });
    o.ajustar();
  }

  /* ===================================================================
     11) Umbral de decisión: matriz de confusión, métricas y ROC
     =================================================================== */
  function wUmbral(box) {
    var o = lienzo(box, 380), ct = controles(box), out = salida(box);
    var u = 0.5, sep = 1.6, neg = [], pos = [];
    function generar() { var r = rnd(9); neg = []; pos = []; for (var i = 0; i < 900; i++) neg.push(1 / (1 + Math.exp(-(gauss(r) - sep / 2)))); for (var j = 0; j < 100; j++) pos.push(1 / (1 + Math.exp(-(gauss(r) + sep / 2)))); }
    function conteos(t) { var VP = pos.filter(function (s) { return s >= t; }).length, FN = pos.length - VP, FP = neg.filter(function (s) { return s >= t; }).length, VN = neg.length - FP; return { VP: VP, FN: FN, FP: FP, VN: VN }; }
    o.dibujar = function () {
      limpiar(o); var c = o.ctx, ancho = o.W, izq = Math.round(ancho * 0.6);
      var p = { l: 40, r: ancho - izq + 18, t: 26, b: 32 };
      var pl = plano(o, 0, 1, 0, 1, p);
      var bins = 25, hn = new Array(bins).fill(0), hp = new Array(bins).fill(0);
      neg.forEach(function (s) { hn[Math.min(bins - 1, Math.floor(s * bins))]++; }); pos.forEach(function (s) { hp[Math.min(bins - 1, Math.floor(s * bins))]++; });
      var mx = Math.max.apply(null, hn.map(function (v) { return v / neg.length; }).concat(hp.map(function (v) { return v / pos.length; })));
      texto(c, 'Puntaje del modelo para cada cliente', p.l, 16, C.tinta, 12);
      for (var b = 0; b < bins; b++) {
        var x0 = pl.sx(b / bins), w = pl.sx((b + 1) / bins) - x0 - 1;
        var hN = hn[b] / neg.length / mx, hP = hp[b] / pos.length / mx;
        c.fillStyle = 'rgba(30,111,217,.55)'; c.fillRect(x0, pl.sy(hN), w, pl.sy(0) - pl.sy(hN));
        c.fillStyle = 'rgba(214,69,69,.55)'; c.fillRect(x0, pl.sy(hP), w, pl.sy(0) - pl.sy(hP));
      }
      c.strokeStyle = C.tinta; c.lineWidth = 2.5; c.beginPath(); c.moveTo(pl.sx(u), p.t); c.lineTo(pl.sx(u), o.H - p.b); c.stroke();
      texto(c, 'umbral', pl.sx(u) + 4, p.t + 12, C.tinta, 11);
      c.font = '11px Inter, system-ui'; c.fillStyle = C.grisT; c.textAlign = 'center'; [0, .25, .5, .75, 1].forEach(function (t) { c.fillText(fmt(t, 2), pl.sx(t), o.H - p.b + 16); });
      texto(c, '■ pagan (900)', p.l, o.H - 4, C.azul, 11); texto(c, '■ no pagan (100)', p.l + 100, o.H - 4, C.rojo, 11);
      // ROC
      var rx0 = izq + 14, rx1 = ancho - 16, ry0 = 26, ry1 = o.H - 32, rs = Math.min(rx1 - rx0, ry1 - ry0);
      var RX = function (v) { return rx0 + v * rs; }, RY = function (v) { return ry0 + rs - v * rs; };
      texto(c, 'Curva ROC', rx0, 16, C.tinta, 12);
      c.strokeStyle = C.rejilla; c.strokeRect(rx0, ry0, rs, rs); c.setLineDash([4, 4]); c.strokeStyle = C.gris; c.beginPath(); c.moveTo(RX(0), RY(0)); c.lineTo(RX(1), RY(1)); c.stroke(); c.setLineDash([]);
      c.strokeStyle = C.morado; c.lineWidth = 2.4; c.beginPath(); var auc = 0, prev = null;
      for (var t = 1.0001; t >= -0.0001; t -= 0.01) { var k = conteos(t), tpr = k.VP / pos.length, fpr = k.FP / neg.length; if (!prev) c.moveTo(RX(fpr), RY(tpr)); else { c.lineTo(RX(fpr), RY(tpr)); auc += (fpr - prev[0]) * (tpr + prev[1]) / 2; } prev = [fpr, tpr]; }
      c.stroke();
      var k2 = conteos(u); punto(c, RX(k2.FP / neg.length), RY(k2.VP / pos.length), 7, C.tinta, true);
      texto(c, 'FPR', RX(0.5), RY(0) + 16, C.grisT, 10.5, 'center', '400'); c.save(); c.translate(RX(0) - 8, RY(0.5)); c.rotate(-Math.PI / 2); texto(c, 'TPR (recall)', 0, 0, C.grisT, 10.5, 'center', '400'); c.restore();
      var prec = k2.VP / ((k2.VP + k2.FP) || 1), rec = k2.VP / pos.length, f1 = 2 * prec * rec / ((prec + rec) || 1), acc = (k2.VP + k2.VN) / 1000;
      out.innerHTML = '<div class="kb-cm"><div class="vp">VP<b>' + k2.VP + '</b><small>impagos detectados</small></div><div class="fn">FN<b>' + k2.FN + '</b><small>impagos que se escaparon</small></div><div class="fp">FP<b>' + k2.FP + '</b><small>buenos clientes rechazados</small></div><div class="vn">VN<b>' + k2.VN + '</b><small>buenos clientes aprobados</small></div></div>' +
        '<div class="kb-metricas"><span><b>Accuracy</b> ' + fmt(acc * 100, 1) + '%</span><span><b>Precision</b> ' + fmt(prec * 100, 1) + '%</span><span><b>Recall</b> ' + fmt(rec * 100, 1) + '%</span><span><b>F1</b> ' + fmt(f1, 3) + '</span><span><b>AUC</b> ' + fmt(auc, 3) + '</span></div>' +
        '<small>Ejemplo: modelo de impago con 1,000 clientes (100 no pagan). Mueve el umbral: si lo bajas detectas más impagos (recall ↑) pero rechazas más clientes buenos (precision ↓). La separación representa qué tan bueno es el modelo.</small>';
    };
    slider(ct, 'Umbral de decisión', 0.02, 0.98, 0.01, u, function (v) { return fmt(v, 2); }, function (v) { u = v; o.dibujar(); });
    slider(ct, 'Calidad del modelo (separación)', 0, 4, 0.1, sep, function (v) { return fmt(v, 1); }, function (v) { sep = v; generar(); o.dibujar(); });
    generar(); o.ajustar();
  }

  /* ===================================================================
     12) Red neuronal que se anima con el scroll (forward y backprop)
     =================================================================== */
  function wRedScroll(box) {
    var cv = box.querySelector('canvas.kb-scrolly-canvas'), ctx = cv.getContext('2d'), pasos = box.querySelectorAll('.kb-scrolly-paso'), estado = 0, t0 = performance.now();
    var capas = [3, 4, 4, 1], W = 0, H = 0;
    function ajustar() { var r = cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    window.addEventListener('resize', ajustar); ajustar();
    function pos(l, i) { var x = W * (0.14 + 0.72 * l / (capas.length - 1)), n = capas[l], y = H * (0.5 + (i - (n - 1) / 2) * Math.min(0.17, 0.7 / n)); return [x, y]; }
    var r = rnd(4), pesos = []; for (var l = 0; l < capas.length - 1; l++) { pesos.push([]); for (var i = 0; i < capas[l]; i++) { pesos[l].push([]); for (var j = 0; j < capas[l + 1]; j++) pesos[l][i].push(gauss(r)); } }
    function cuadro(now) {
      var t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
      var g = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.7); g.addColorStop(0, '#111a33'); g.addColorStop(1, '#05060B'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (var l = 0; l < capas.length - 1; l++) for (var i = 0; i < capas[l]; i++) for (var j = 0; j < capas[l + 1]; j++) {
        var a = pos(l, i), b = pos(l + 1, j), w = pesos[l][i][j], alfa = 0.18, ancho = 1;
        if (estado >= 1) { alfa = 0.25 + Math.min(0.6, Math.abs(w) * 0.35); ancho = 0.6 + Math.abs(w) * 1.6; }
        ctx.strokeStyle = estado >= 1 ? (w > 0 ? 'rgba(0,194,255,' + alfa + ')' : 'rgba(193,60,255,' + alfa + ')') : 'rgba(255,255,255,' + alfa + ')';
        ctx.lineWidth = ancho; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        if (estado === 2 || estado === 3) { var dir = estado === 2 ? 1 : -1, f = ((t * 0.6 + (i + j) * 0.13) % 1 + 1) % 1, k = dir > 0 ? f : 1 - f, px = a[0] + (b[0] - a[0]) * k, py = a[1] + (b[1] - a[1]) * k;
          ctx.fillStyle = estado === 2 ? '#19E36B' : '#F2E814'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
      for (var l2 = 0; l2 < capas.length; l2++) for (var i2 = 0; i2 < capas[l2]; i2++) {
        var p = pos(l2, i2), act = estado >= 2 ? 0.5 + 0.5 * Math.sin(t * 2 + l2 + i2) : 0.3;
        ctx.beginPath(); ctx.arc(p[0], p[1], 13, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,' + (0.08 + act * 0.25) + ')'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = l2 === 0 ? '#00C2FF' : (l2 === capas.length - 1 ? '#19E36B' : '#C13CFF'); ctx.stroke();
      }
      ctx.font = '600 12px Inter, system-ui'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textAlign = 'center';
      ['Entradas', 'Capa oculta', 'Capa oculta', 'Salida'].forEach(function (n, l3) { ctx.fillText(n, pos(l3, 0)[0], H * 0.1); });
      if (estado === 3) { var o = pos(3, 0); ctx.fillStyle = '#F2E814'; ctx.fillText('error', o[0], o[1] - 22); }
      if (estado === 0) { ['ingreso', 'deuda', 'atrasos'].forEach(function (n, i3) { var p3 = pos(0, i3); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(n, p3[0] - 20, p3[1] + 4); }); }
      if (estado >= 2) { var o2 = pos(3, 0); ctx.textAlign = 'left'; ctx.fillStyle = '#19E36B'; ctx.fillText('P(impago)', o2[0] - 34, o2[1] + 34); }
      requestAnimationFrame(cuadro);
    }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { estado = +e.target.getAttribute('data-paso'); pasos.forEach(function (p) { p.classList.toggle('activo', p === e.target); }); } }); }, { rootMargin: '-45% 0px -45% 0px' });
    pasos.forEach(function (p) { io.observe(p); });
    requestAnimationFrame(cuadro);
  }

  /* ---------- registro ---------- */
  var W = { gradiente: wGradiente, derivada: wDerivada, equilibrio: wEquilibrio, coseno: wCoseno, activacion: wActivacion, polinomio: wPolinomio,
            perceptron: wPerceptron, knn: wKnn, kmeans: wKmeans, arbol: wArbol, umbral: wUmbral, redscroll: wRedScroll };
  function iniciar() {
    document.querySelectorAll('[data-widget]').forEach(function (box) { var f = W[box.getAttribute('data-widget')]; if (f) { try { f(box); } catch (e) { console.error('Laboratorio', box.getAttribute('data-widget'), e); } } });
    /* Aparición suave al hacer scroll */
    var objetivos = document.querySelectorAll('.kb-item, .st-fig, .kb-lab, .st-card');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('kb-visible'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
      objetivos.forEach(function (t) { t.classList.add('kb-aparece'); io.observe(t); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
