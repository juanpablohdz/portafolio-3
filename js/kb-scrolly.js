/* =====================================================================
   Escenas animadas con el scroll (scrollytelling) para Conocimiento.
   <div class="kb-scrolly" data-scene="nombre">
     <div class="kb-scrolly-stage"></div>
     <div class="kb-scrolly-pasos"> .kb-scrolly-paso × 4 </div>
   </div>
   El avance de la página (p = 0 … 4) controla cada dibujo de forma continua.
   ===================================================================== */
(function () {
  'use strict';
  var N = { cyan: '#00C2FF', mor: '#C13CFF', ver: '#19E36B', ama: '#F2E814', nar: '#FF8A3D', roj: '#FF5A5A',
            bl: 'rgba(255,255,255,.88)', ten: 'rgba(255,255,255,.45)', rej: 'rgba(255,255,255,.07)' };

  /* ---------- utilidades ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function seg(p, a, b) { return ease((p - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function fmt(v, d) { return Number(v).toLocaleString('es-MX', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function alfa(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  function tx(c, s, x, y, col, tam, al, peso) { c.font = (peso || 600) + ' ' + (tam || 12) + 'px Inter, system-ui, sans-serif'; c.fillStyle = col || N.bl; c.textAlign = al || 'left'; c.fillText(s, x, y); }
  function pt(c, x, y, r, col, borde) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); if (borde) { c.lineWidth = 1.5; c.strokeStyle = borde; c.stroke(); } }
  function linea(c, x1, y1, x2, y2, col, w, dash) { c.save(); if (dash) c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = w || 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore(); }
  function flecha(c, x0, y0, x1, y1, col, w) {
    linea(c, x0, y0, x1, y1, col, w || 3); var a = Math.atan2(y1 - y0, x1 - x0), L = 11;
    c.fillStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - L * Math.cos(a - 0.4), y1 - L * Math.sin(a - 0.4)); c.lineTo(x1 - L * Math.cos(a + 0.4), y1 - L * Math.sin(a + 0.4)); c.fill();
  }
  function curva(c, f, x0, x1, P, col, w, alfaV) {
    c.save(); c.globalAlpha = alfaV == null ? 1 : alfaV; c.beginPath(); var n = 160;
    for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n, X = P.sx(x), Y = P.sy(f(x)); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
    c.strokeStyle = col; c.lineWidth = w || 2.6; c.stroke(); c.restore();
  }
  function rombo(c, x, y, r, col) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = col; c.fillRect(-r, -r, 2 * r, 2 * r); c.lineWidth = 2; c.strokeStyle = '#fff'; c.strokeRect(-r, -r, 2 * r, 2 * r); c.restore(); }
  /* Panel de lectura: lineas = [[texto, color], …] */
  function panel(c, W, lineas, x, y) {
    if (!lineas.length) return; c.font = '600 12px Inter, system-ui, sans-serif';
    var w = 0; lineas.forEach(function (l) { w = Math.max(w, c.measureText(l[0]).width); }); w += 20;
    var h = lineas.length * 17 + 10; x = x == null ? W - w - 12 : x; y = y == null ? 12 : y;
    c.fillStyle = 'rgba(5,6,11,.78)'; c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1;
    if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.stroke(); } else { c.fillRect(x, y, w, h); }
    lineas.forEach(function (l, i) { tx(c, l[0], x + 10, y + 20 + i * 17, l[1] || N.bl, 12); });
  }
  function plano(W, H, x0, x1, y0, y1, pad) {
    pad = pad || { l: 46, r: 14, t: 16, b: 34 };
    var P = {
      pad: pad,
      sx: function (x) { return pad.l + (x - x0) / (x1 - x0) * (W - pad.l - pad.r); },
      sy: function (y) { return H - pad.b - (y - y0) / (y1 - y0) * (H - pad.t - pad.b); }
    };
    P.ejes = function (c, nx, ny, fx, fy, tituloX, tituloY) {
      c.save(); c.lineWidth = 1;
      for (var i = 0; i <= nx; i++) { var x = x0 + (x1 - x0) * i / nx, X = P.sx(x); linea(c, X, pad.t, X, H - pad.b, N.rej, 1); tx(c, fx(x), X, H - pad.b + 14, N.ten, 10, 'center', 400); }
      for (var j = 0; j <= ny; j++) { var y = y0 + (y1 - y0) * j / ny, Y = P.sy(y); linea(c, pad.l, Y, W - pad.r, Y, N.rej, 1); tx(c, fy(y), pad.l - 6, Y + 3, N.ten, 10, 'right', 400); }
      if (tituloX) tx(c, tituloX, W - pad.r, H - 6, N.ten, 10.5, 'right', 600);
      if (tituloY) tx(c, tituloY, pad.l + 4, pad.t + 10, N.ten, 10.5, 'left', 600);
      c.restore();
    };
    P.clip = function (c) { c.beginPath(); c.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b); c.clip(); };
    return P;
  }
  function nubes(seed, centros, n, sd) { var r = rnd(seed), d = []; centros.forEach(function (cc, k) { for (var i = 0; i < n; i++) d.push({ x: cc[0] + gauss(r) * sd[0], y: cc[1] + gauss(r) * sd[1], c: k }); }); return d; }
  function ajustePoli(xs, ys, g) {
    var n = g + 1, A = [], b = [], i, j, k;
    for (i = 0; i < n; i++) { A.push(new Array(n).fill(0)); b.push(0); }
    xs.forEach(function (x, q) { var pw = []; for (var i2 = 0; i2 < n; i2++) pw.push(Math.pow(x, i2)); for (var a = 0; a < n; a++) { b[a] += pw[a] * ys[q]; for (var bb = 0; bb < n; bb++) A[a][bb] += pw[a] * pw[bb]; } });
    for (i = 0; i < n; i++) A[i][i] += 1e-9;
    for (k = 0; k < n; k++) { var m = k; for (i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[m][k])) m = i; var t = A[k]; A[k] = A[m]; A[m] = t; t = b[k]; b[k] = b[m]; b[m] = t;
      for (i = k + 1; i < n; i++) { var f = A[i][k] / A[k][k]; for (j = k; j < n; j++) A[i][j] -= f * A[k][j]; b[i] -= f * b[k]; } }
    var w = new Array(n).fill(0); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * w[j]; w[i] = s / A[i][i]; }
    return function (x) { var y = 0, q = 1; for (var i3 = 0; i3 < n; i3++) { y += w[i3] * q; q *= x; } return y; };
  }

  var E = {};

  /* =================== 1. Similitud coseno: recomendador de películas =================== */
  E.coseno = function () {
    var A = [4.6, 1.1], L = [4.0, 1.7], S = [1.2, 4.4];
    function cos(u, v) { return (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1])); }
    return function (c, W, H, p) {
      var P = plano(W, H, 0, 5, 0, 5); P.ejes(c, 5, 5, function (x) { return fmt(x * 10); }, function (y) { return fmt(y * 10); }, 'películas de acción vistas', 'películas de comedia');
      var O = [P.sx(0), P.sy(0)];
      function vec(v, k, col, nom) { if (k <= 0.01) return; var X = P.sx(v[0] * k), Y = P.sy(v[1] * k); flecha(c, O[0], O[1], X, Y, col, 3); c.globalAlpha = k; tx(c, nom, X + 8, Y - 6, col, 13, 'left', 700); c.globalAlpha = 1; }
      function arco(u, v, k, col) { if (k <= 0.01) return; var a1 = Math.atan2(-u[1], u[0]), a2 = Math.atan2(-v[1], v[0]); c.save(); c.globalAlpha = k; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(O[0], O[1], 46, Math.min(a1, a2), Math.max(a1, a2)); c.stroke(); c.restore(); }
      var a = seg(p, 0.1, 0.8), l = seg(p, 1.1, 1.7), s = seg(p, 2.1, 2.7), r = seg(p, 3.05, 3.7);
      c.globalAlpha = p >= 3 ? 1 - 0.6 * r : 1; vec(S, s, N.mor, 'Sofía'); arco(A, S, s, N.mor); c.globalAlpha = 1;
      vec(A, a, N.cyan, 'Ana'); arco(A, L, l, N.ver); vec(L, l, N.ver, 'Luis');
      var lin = [];
      if (p >= 0.6) lin.push(['Ana: 46 de acción, 11 de comedia', N.cyan]);
      if (p >= 1.3) lin.push(['cos(Ana, Luis) = ' + fmt(cos(A, L), 2) + ' → muy parecidos', N.ver]);
      if (p >= 2.3) lin.push(['cos(Ana, Sofía) = ' + fmt(cos(A, S), 2) + ' → gustos distintos', N.mor]);
      panel(c, W, lin);
      if (r > 0) { /* una película viaja de Ana a Luis */
        var X = lerp(P.sx(A[0]), P.sx(L[0]), r), Y = lerp(P.sy(A[1]), P.sy(L[1]) - 34, r);
        c.fillStyle = N.ama; if (c.roundRect) { c.beginPath(); c.roundRect(X - 60, Y - 30, 120, 22, 6); c.fill(); } else c.fillRect(X - 60, Y - 30, 120, 22);
        tx(c, 'Recomendar a Luis', X, Y - 15, '#05060B', 11.5, 'center', 700);
      }
    };
  };

  /* =================== 2. Derivada: precio que maximiza el ingreso =================== */
  E.derivada = function () {
    var I = function (x) { return x * (1000 - 8 * x); }, d = function (x) { return 1000 - 16 * x; };
    return function (c, W, H, p) {
      var P = plano(W, H, 0, 125, 0, 35000, { l: 50, r: 14, t: 16, b: 34 });
      P.ejes(c, 5, 5, function (x) { return '$' + fmt(x); }, function (y) { return fmt(y / 1000) + 'k'; }, 'precio del producto', 'ingreso semanal ($)');
      var hasta = Math.max(0.01, seg(p, 0.05, 0.85) * 125); curva(c, I, 0, hasta, P, N.cyan, 2.8);
      if (p >= 2.4) { var k = seg(p, 2.4, 2.8); linea(c, P.sx(62.5), P.sy(0), P.sx(62.5), P.sy(I(62.5)), alfa(N.ver, 0.6 * k), 1.2, [4, 4]); }
      if (p < 1) { panel(c, W, p > 0.4 ? [['Demanda: 1,000 − 8·precio', N.bl], ['Ingreso = precio × demanda', N.cyan]] : []); return; }
      var x = p < 2 ? lerp(12, 45, seg(p, 1.05, 1.9)) : (p < 3 ? lerp(45, 62.5, seg(p, 2.05, 2.8)) : lerp(62.5, 100, seg(p, 3.05, 3.85)));
      var m = d(x), col = Math.abs(m) < 30 ? N.ver : (m > 0 ? N.ama : N.roj), dx = 20;
      linea(c, P.sx(x - dx), P.sy(I(x) - m * dx), P.sx(x + dx), P.sy(I(x) + m * dx), col, 2.4);
      pt(c, P.sx(x), P.sy(I(x)), 7, col, '#fff');
      var msg = Math.abs(m) < 30 ? 'pendiente 0 → ingreso MÁXIMO' : (m > 0 ? 'pendiente + → subir precio sí conviene' : 'pendiente − → ya perdiste clientes');
      panel(c, W, [['Precio: $' + fmt(x, 1), N.bl], ['Ingreso: $' + fmt(I(x)), N.cyan], ['Derivada: ' + (m > 0 ? '+' : '') + fmt(m) + ' por cada $1', col], [msg, col]]);
    };
  };

  /* =================== 3. Descenso del gradiente: entrenar un modelo de vivienda =================== */
  E.gradiente = function () {
    var Er = function (w) { return (w - 25) * (w - 25) / 6 + 2; }, dE = function (w) { return (w - 25) / 3; };
    var bien = [3]; for (var i = 0; i < 9; i++) bien.push(bien[i] - 1.2 * dE(bien[i]));
    var mal = [16]; for (var j = 0; j < 5; j++) mal.push(mal[j] - 6.75 * dE(mal[j]));
    function recorrido(c, P, ruta, k, col) {
      var n = Math.min(Math.floor(k), ruta.length - 2), f = k - n, w = lerp(ruta[n], ruta[n + 1], f);
      for (var q = 0; q <= n; q++) { pt(c, P.sx(ruta[q]), P.sy(Er(ruta[q])), 4, alfa(col, 0.45)); if (q < n) linea(c, P.sx(ruta[q]), P.sy(Er(ruta[q])), P.sx(ruta[q + 1]), P.sy(Er(ruta[q + 1])), alfa(col, 0.5), 1.3, [4, 4]); }
      linea(c, P.sx(ruta[n]), P.sy(Er(ruta[n])), P.sx(w), P.sy(Er(w)), alfa(col, 0.5), 1.3, [4, 4]);
      pt(c, P.sx(w), P.sy(Er(w)), 8, col, '#fff'); return { w: w, it: n + (f > 0.5 ? 1 : 0) };
    }
    return function (c, W, H, p) {
      var P = plano(W, H, 0, 50, 0, 100); P.ejes(c, 5, 5, function (x) { return fmt(x); }, function (y) { return fmt(y); }, 'w = precio por m² (miles de $)', 'error del modelo');
      c.save(); P.clip(c); curva(c, Er, 0, Math.max(0.1, seg(p, 0.05, 0.85) * 50), P, N.cyan, 2.8); c.restore();
      if (p >= 0.9) { pt(c, P.sx(25), P.sy(2), 5, N.ver); tx(c, 'mínimo (w = 25)', P.sx(25), P.sy(2) - 10, N.ver, 11, 'center'); }
      if (p < 1) return;
      if (p < 2) {
        var k0 = seg(p, 1.05, 1.5), w0 = 3, m = dE(w0);
        pt(c, P.sx(w0), P.sy(Er(w0)), 8, N.nar, '#fff');
        linea(c, P.sx(w0 - 3), P.sy(Er(w0) - 3 * m), P.sx(w0 + 7 * k0), P.sy(Er(w0) + 7 * k0 * m), N.bl, 1.6);
        if (k0 > 0.5) flecha(c, P.sx(w0) + 8, P.sy(Er(w0)) + 24, P.sx(w0) + 60, P.sy(Er(w0)) + 24, N.ama, 2.5);
        panel(c, W, [['Inicio: w = 3 → error ' + fmt(Er(w0), 1), N.nar], ['Pendiente = ' + fmt(m, 2) + ' (negativa)', N.bl], ['→ hay que AUMENTAR w', N.ama]]);
        return;
      }
      var r = recorrido(c, P, bien, seg(p, 2.05, 2.92) * (bien.length - 1), N.nar);
      var lin = [['η = 1.2 · iteración ' + r.it, N.nar], ['w = ' + fmt(r.w, 2) + '  error = ' + fmt(Er(r.w), 2), N.bl]];
      if (p >= 3) { var r2 = recorrido(c, P, mal, seg(p, 3.05, 3.9) * (mal.length - 1), N.roj); lin.push(['η = 6.75 · iteración ' + r2.it, N.roj], ['error = ' + fmt(Er(r2.w), 1) + ' ↑ ¡diverge!', N.roj]); }
      panel(c, W, lin);
    };
  };

  /* =================== 4. Punto de equilibrio: cafetería =================== */
  E.equilibrio = function () {
    var CF = 35000, PV = 60, CV = 25, Q = 1600, qe = CF / (PV - CV);
    return function (c, W, H, p) {
      var P = plano(W, H, 0, Q, 0, 100000, { l: 50, r: 14, t: 16, b: 34 });
      P.ejes(c, 4, 5, function (x) { return fmt(x); }, function (y) { return fmt(y / 1000) + 'k'; }, 'cafés vendidos al mes', '$ al mes');
      var a = seg(p, 0.1, 0.8), b = seg(p, 1.1, 1.8), d = seg(p, 2.1, 2.8), f = seg(p, 3.05, 3.6);
      if (f > 0) {
        c.fillStyle = alfa(N.roj, 0.18 * f); c.beginPath(); c.moveTo(P.sx(0), P.sy(0)); c.lineTo(P.sx(qe), P.sy(PV * qe)); c.lineTo(P.sx(0), P.sy(CF)); c.fill();
        c.fillStyle = alfa(N.ver, 0.2 * f); c.beginPath(); c.moveTo(P.sx(qe), P.sy(PV * qe)); c.lineTo(P.sx(Q), P.sy(PV * Q)); c.lineTo(P.sx(Q), P.sy(CF + CV * Q)); c.fill();
        c.globalAlpha = f; tx(c, 'pérdida', P.sx(qe * 0.3), P.sy(CF * 0.75), N.roj, 12, 'center', 700); tx(c, 'ganancia', P.sx(Q * 0.9), P.sy(PV * Q * 0.9), N.ver, 12, 'center', 700); c.globalAlpha = 1;
      }
      if (a > 0) { linea(c, P.sx(0), P.sy(CF), P.sx(Q * a), P.sy(CF), alfa(N.nar, 0.6), 1.8, [6, 5]); tx(c, 'costo fijo $35k', P.sx(Q * a) - 4, P.sy(CF) + 14, alfa(N.nar, 0.9), 11, 'right'); }
      if (b > 0) { linea(c, P.sx(0), P.sy(CF), P.sx(Q * b), P.sy(CF + CV * Q * b), N.nar, 2.8); tx(c, 'costo total', P.sx(Q * b) - 4, P.sy(CF + CV * Q * b) - 8, N.nar, 11.5, 'right', 700); }
      if (d > 0) { linea(c, P.sx(0), P.sy(0), P.sx(Q * d), P.sy(PV * Q * d), N.cyan, 2.8); tx(c, 'ingreso', P.sx(Q * d) - 4, P.sy(PV * Q * d) - 8, N.cyan, 11.5, 'right', 700); }
      if (f > 0) { var pul = 7 + 2 * Math.sin(performance.now() / 200); pt(c, P.sx(qe), P.sy(PV * qe), pul, '#fff'); tx(c, '1,000 cafés', P.sx(qe) + 12, P.sy(PV * qe) + 18, N.bl, 12, 'left', 700); }
      var lin = [];
      if (p >= 0.5) lin.push(['Costo fijo: $35,000 (renta, sueldos)', N.nar]);
      if (p >= 1.5) lin.push(['Costo variable: $25 por café', N.nar]);
      if (p >= 2.5) lin.push(['Precio de venta: $60 por café', N.cyan]);
      if (p >= 3.3) lin.push(['Equilibrio: 35,000 ÷ (60 − 25) = 1,000', '#fff'], ['≈ 34 cafés al día', N.ver]);
      panel(c, W, lin, P.pad.l + 10, 26);
    };
  };

  /* =================== 5. Funciones de activación: probabilidad de abandono =================== */
  E.activacion = function () {
    var sig = function (z) { return 1 / (1 + Math.exp(-z)); }, relu = function (z) { return Math.max(0, z); }, th = Math.tanh;
    return function (c, W, H, p) {
      var P = plano(W, H, -4, 4, -1.2, 3); P.ejes(c, 8, 7, function (x) { return fmt(x); }, function (y) { return fmt(y, 1); }, 'z = puntaje de la neurona', 'salida');
      linea(c, P.sx(-4), P.sy(0), P.sx(4), P.sy(0), 'rgba(255,255,255,.25)', 1);
      var k = seg(p, 2.05, 2.7), f = function (z) { return lerp(sig(z), relu(z), k); };
      curva(c, f, -4, lerp(-4, 4, Math.max(0.01, seg(p, 0.05, 0.8))), P, k > 0.5 ? N.ver : N.mor, 3);
      if (p >= 3) { var t = seg(p, 3.05, 3.6); curva(c, sig, -4, 4, P, N.mor, 2, t * 0.9); curva(c, th, -4, 4, P, N.ama, 2, t);
        c.globalAlpha = t; tx(c, 'sigmoide', P.sx(3.9), P.sy(1) + 16, N.mor, 11.5, 'right', 700); tx(c, 'tanh', P.sx(-3.9), P.sy(-1) - 8, N.ama, 11.5, 'left', 700); tx(c, 'ReLU', P.sx(2.6), P.sy(2.6), N.ver, 11.5, 'right', 700); c.globalAlpha = 1; }
      if (p < 1) return;
      var z = p < 2 ? lerp(-3.5, 3.5, seg(p, 1.05, 1.9)) : (p < 3 ? lerp(3.5, -2, seg(p, 2.05, 2.9)) : 1.2), y = f(z);
      linea(c, P.sx(z), P.sy(0), P.sx(z), P.sy(y), N.ten, 1, [4, 4]); pt(c, P.sx(z), P.sy(y), 7, N.nar, '#fff');
      if (p < 2) panel(c, W, [['Cliente con puntaje z = ' + fmt(z, 1), N.bl], ['P(abandono) = ' + fmt(sig(z) * 100) + '%', N.mor], [sig(z) > 0.5 ? '→ ofrecer descuento de retención' : '→ cliente estable', sig(z) > 0.5 ? N.nar : N.ver]]);
      else if (p < 3) panel(c, W, [['ReLU(' + fmt(z, 1) + ') = ' + fmt(relu(z), 2), N.ver], [z < 0 ? 'señal negativa → se apaga (0)' : 'señal positiva → pasa igual', N.bl]]);
    };
  };

  /* =================== 6. Sobreajuste: pronóstico de ventas semanales =================== */
  E.polinomio = function () {
    var r = rnd(7), real = function (x) { return Math.sin(Math.PI * x); }, tr = [], te = [];
    for (var i = 0; i < 14; i++) { var x = -1 + 2 * (i + r() * 0.8) / 14; tr.push([x, real(x) + gauss(r) * 0.22]); }
    for (var j = 0; j < 12; j++) { var x2 = -0.95 + 1.9 * (j + r()) / 12; te.push([x2, real(x2) + gauss(r) * 0.22]); }
    var xs = tr.map(function (q) { return q[0]; }), ys = tr.map(function (q) { return q[1]; });
    var F = { 1: ajustePoli(xs, ys, 1), 3: ajustePoli(xs, ys, 3), 12: ajustePoli(xs, ys, 12) };
    function ecm(f, d) { return d.reduce(function (s, q) { var e = f(q[0]) - q[1]; return s + e * e; }, 0) / d.length; }
    var V = function (y) { return 500 + 150 * y; };
    return function (c, W, H, p) {
      var P = plano(W, H, -1, 1, -2, 2); P.ejes(c, 4, 4, function (x) { return 'sem ' + fmt((x + 1) * 26); }, function (y) { return fmt(V(y)); }, 'semana del año', 'ventas (unidades)');
      var ap = seg(p, 0.05, 0.6);
      tr.forEach(function (q, i) { if (i / tr.length <= ap) pt(c, P.sx(q[0]), P.sy(q[1]), 5, '#fff'); });
      c.save(); P.clip(c);
      var g = 1, f;
      if (p >= 1 && p < 2) { f = F[1]; curva(c, f, -1, lerp(-1, 1, Math.max(0.01, seg(p, 1.05, 1.6))), P, N.nar, 3); }
      else if (p >= 2 && p < 3) { var k = seg(p, 2.05, 2.6); g = 3; f = function (x) { return lerp(F[1](x), F[3](x), k); }; curva(c, f, -1, 1, P, N.ver, 3); }
      else if (p >= 3) { var k2 = seg(p, 3.05, 3.5); g = 12; f = function (x) { return lerp(F[3](x), F[12](x), k2); }; curva(c, f, -1, 1, P, N.roj, 3); }
      c.restore();
      var tt = seg(p, 3.45, 3.8);
      if (tt > 0) te.forEach(function (q) { c.globalAlpha = tt; linea(c, P.sx(q[0]), P.sy(q[1]), P.sx(q[0]), P.sy(clamp(F[12](q[0]), -2, 2)), alfa(N.ama, 0.6), 1.2); pt(c, P.sx(q[0]), P.sy(q[1]), 4.5, N.ama); c.globalAlpha = 1; });
      if (p < 1) { panel(c, W, ap > 0.5 ? [['14 semanas de historia', N.bl]] : []); return; }
      var lin = [['Modelo de grado ' + g, g === 1 ? N.nar : (g === 3 ? N.ver : N.roj)], ['Error con historia: ' + fmt(ecm(F[g], tr) * 22500), N.bl]];
      if (p >= 3.5) lin.push(['Error con semanas nuevas: ' + fmt(ecm(F[12], te) * 22500), N.ama]);
      else if (g === 3) lin.push(['Error con semanas nuevas: ' + fmt(ecm(F[3], te) * 22500), N.ver]);
      lin.push([g === 1 ? 'Subajuste: ignora la temporada' : (g === 3 ? 'Captura la temporada sin el ruido' : 'Sobreajuste: memoriza el ruido'), g === 1 ? N.nar : (g === 3 ? N.ver : N.roj)]);
      panel(c, W, lin);
    };
  };

  /* =================== 7. Perceptrón: filtro de spam =================== */
  E.perceptron = function () {
    var d = nubes(5, [[2.6, 2.4], [7.2, 7]], 16, [1.05, 1.05]);
    d = d.filter(function (q) { return q.c === 0 ? q.x + q.y < 8.6 : q.x + q.y > 11; });
    var w = [-0.6, 1, 0.9], snaps = [w.slice()], lr = 0.25;
    for (var ep = 0; ep < 60; ep++) { var err = 0; d.forEach(function (q) { var x = (q.x - 5) / 2.5, y = (q.y - 5) / 2.5, pr = w[0] * x + w[1] * y + w[2] >= 0 ? 1 : 0, e = q.c - pr; if (e) { err++; w[0] += lr * e * x; w[1] += lr * e * y; w[2] += lr * e; snaps.push(w.slice()); } }); if (!err) break; }
    function pred(W2, q) { return W2[0] * (q.x - 5) / 2.5 + W2[1] * (q.y - 5) / 2.5 + W2[2] >= 0 ? 1 : 0; }
    return function (c, Wd, H, p) {
      var P = plano(Wd, H, 0, 10, 0, 10); P.ejes(c, 5, 5, function (x) { return fmt(x); }, function (y) { return fmt(y); }, 'enlaces en el correo', 'palabras “gratis / promo”');
      var k = p < 2 ? 0 : seg(p, 2.05, 2.9) * (snaps.length - 1), n = Math.min(Math.floor(k), snaps.length - 2), f = k - n;
      var Wc = snaps.length > 1 ? [0, 1, 2].map(function (i) { return lerp(snaps[n][i], snaps[n + 1][i], f); }) : snaps[0];
      if (p >= 3) { var s = seg(p, 3.05, 3.5); c.save(); P.clip(c); for (var gx = 0; gx < 10; gx += 0.25) for (var gy = 0; gy < 10; gy += 0.25) { c.fillStyle = pred(Wc, { x: gx + 0.125, y: gy + 0.125 }) ? alfa(N.roj, 0.13 * s) : alfa(N.cyan, 0.1 * s); c.fillRect(P.sx(gx), P.sy(gy + 0.25), P.sx(0.25) - P.sx(0) + 1, P.sy(0) - P.sy(0.25) + 1); } c.restore(); }
      var ap = seg(p, 0.05, 0.6), malos = 0;
      d.forEach(function (q, i) { if (i / d.length > ap) return; var ok = pred(Wc, q) === q.c; pt(c, P.sx(q.x), P.sy(q.y), 5, q.c ? N.roj : N.cyan, '#05060B');
        if (p >= 1 && !ok) { malos++; c.strokeStyle = N.ama; c.lineWidth = 2; c.beginPath(); c.arc(P.sx(q.x), P.sy(q.y), 9, 0, Math.PI * 2); c.stroke(); } });
      if (p >= 1) { var lw = seg(p, 1.05, 1.4); c.save(); P.clip(c); c.globalAlpha = lw; var X = function (y) { return 2.5 * (-(Wc[1] * (y - 5) / 2.5 + Wc[2]) / Wc[0]) + 5; };
        if (Math.abs(Wc[0]) > 1e-6) linea(c, P.sx(X(-2)), P.sy(-2), P.sx(X(12)), P.sy(12), '#fff', 2.6); c.restore(); }
      var lin = [['● correo normal', N.cyan], ['● spam', N.roj]];
      if (p >= 1) lin.push(['Correos mal clasificados: ' + malos, malos ? N.ama : N.ver]);
      if (p >= 2) lin.push(['Correcciones de pesos: ' + Math.round(k) + ' / ' + (snaps.length - 1), N.bl]);
      if (p >= 3) lin.push(['Regla aprendida: spam si ' + fmt(Wc[0], 2) + '·x + ' + fmt(Wc[1], 2) + '·y + ' + fmt(Wc[2], 2) + ' ≥ 0', N.ver]);
      panel(c, Wd, lin);
    };
  };

  /* =================== 8. K-means: segmentación de clientes de supermercado =================== */
  E.kmeans = function () {
    var d = nubes(13, [[2.2, 2.4], [7.4, 2.8], [5.2, 7.8]], 22, [0.9, 0.85]).map(function (q) { return { x: clamp(q.x, 0.2, 9.8), y: clamp(q.y, 0.2, 9.8) }; });
    var hist = [[{ x: 1.5, y: 8.8 }, { x: 5, y: 9.6 }, { x: 8.6, y: 8.8 }]];
    function asignar(cs, q) { var b = 0, bd = 1e9; cs.forEach(function (ce, i) { var dd = Math.hypot(q.x - ce.x, q.y - ce.y); if (dd < bd) { bd = dd; b = i; } }); return b; }
    for (var it = 0; it < 12; it++) { var cs = hist[hist.length - 1], nu = cs.map(function (ce, i) { var s = d.filter(function (q) { return asignar(cs, q) === i; }); return s.length ? { x: s.reduce(function (a, q) { return a + q.x; }, 0) / s.length, y: s.reduce(function (a, q) { return a + q.y; }, 0) / s.length } : ce; });
      hist.push(nu); if (nu.every(function (ce, i) { return Math.hypot(ce.x - cs[i].x, ce.y - cs[i].y) < 1e-4; })) break; }
    var col = [N.cyan, N.nar, N.mor];
    var fin = hist[hist.length - 1], nombres = fin.map(function (ce) { return ce.y > 6 ? 'Premium' : (ce.x > 5 ? 'Frecuentes, ticket bajo' : 'Ocasionales'); });
    return function (c, W, H, p) {
      var P = plano(W, H, 0, 10, 0, 10); P.ejes(c, 5, 5, function (x) { return fmt(x * 2); }, function (y) { return '$' + fmt(y * 100); }, 'visitas al mes', 'gasto promedio por visita');
      var k = p < 2 ? 0 : seg(p, 2.05, 2.9) * (hist.length - 1), n = Math.min(Math.floor(k), hist.length - 2), f = k - n;
      var cs = hist[0].map(function (ce, i) { return { x: lerp(hist[n][i].x, hist[n + 1][i].x, f), y: lerp(hist[n][i].y, hist[n + 1][i].y, f) }; });
      var ap = seg(p, 0.05, 0.6), asg = seg(p, 1.3, 1.9);
      d.forEach(function (q, i) { if (i / d.length > ap) return; var g = asignar(cs, q);
        if (p >= 1.3) linea(c, P.sx(q.x), P.sy(q.y), P.sx(cs[g].x), P.sy(cs[g].y), alfa(col[g], 0.18 * asg), 1);
        pt(c, P.sx(q.x), P.sy(q.y), 4.5, 'rgba(255,255,255,.55)'); if (asg > 0) pt(c, P.sx(q.x), P.sy(q.y), 4.5, alfa(col[g], asg)); });
      if (p >= 1) { var cae = seg(p, 1.0, 1.3); cs.forEach(function (ce, i) { var X = P.sx(ce.x), Y = P.sy(ce.y) - 40 * (1 - cae); c.globalAlpha = cae; linea(c, X - 9, Y - 9, X + 9, Y + 9, '#fff', 5); linea(c, X + 9, Y - 9, X - 9, Y + 9, '#fff', 5); linea(c, X - 9, Y - 9, X + 9, Y + 9, col[i], 3); linea(c, X + 9, Y - 9, X - 9, Y + 9, col[i], 3); c.globalAlpha = 1; }); }
      if (p >= 3) { var t = seg(p, 3.05, 3.5); c.globalAlpha = t; cs.forEach(function (ce, i) { tx(c, nombres[i], P.sx(ce.x), P.sy(ce.y) - 16, col[i], 13, 'center', 800); }); c.globalAlpha = 1; }
      var lin = [['66 clientes del programa de lealtad', N.bl]];
      if (p >= 1) lin.push(['k = 3 centros iniciales al azar', N.bl]);
      if (p >= 2) lin.push(['Iteración ' + Math.round(k) + ' de ' + (hist.length - 1) + (k >= hist.length - 1.01 ? ' · convergió' : ''), N.ama]);
      panel(c, W, lin);
    };
  };

  /* =================== 9. KNN: qué plan ofrecer a un cliente nuevo =================== */
  E.knn = function () {
    var r = rnd(17), d = [];
    for (var i = 0; i < 28; i++) d.push({ x: 26 + gauss(r) * 6, y: 28 + gauss(r) * 10, c: 0 });
    for (var j = 0; j < 18; j++) d.push({ x: 60 + gauss(r) * 5, y: 34 + gauss(r) * 10, c: 0 });
    for (var k2 = 0; k2 < 26; k2++) d.push({ x: 46 + gauss(r) * 7, y: 72 + gauss(r) * 9, c: 1 });
    d = d.map(function (q) { return { x: clamp(q.x, 19, 69), y: clamp(q.y, 3, 97), c: q.c }; });
    var nuevo = { x: 41, y: 58 };
    return function (c, W, H, p) {
      var P = plano(W, H, 18, 70, 0, 100); P.ejes(c, 4, 5, function (x) { return fmt(x); }, function (y) { return '$' + fmt(y) + 'k'; }, 'edad', 'ingreso mensual');
      var NX = P.sx(nuevo.x), NY = P.sy(nuevo.y);
      var orden = d.map(function (q) { return { q: q, dd: Math.hypot(P.sx(q.x) - NX, P.sy(q.y) - NY) }; }).sort(function (a, b) { return a.dd - b.dd; });
      var nv = p < 2 ? 0 : Math.min(5, Math.ceil(seg(p, 2.05, 2.85) * 5 - 0.001));
      if (nv > 0) { var rad = orden[nv - 1].dd + 8; c.save(); c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(NX, NY, rad, 0, Math.PI * 2); c.stroke(); c.restore();
        for (var v = 0; v < nv; v++) linea(c, NX, NY, P.sx(orden[v].q.x), P.sy(orden[v].q.y), 'rgba(255,255,255,.6)', 1.5); }
      var ap = seg(p, 0.05, 0.6);
      d.forEach(function (q, i) { if (i / d.length > ap) return; pt(c, P.sx(q.x), P.sy(q.y), 5, q.c ? N.mor : N.cyan, '#05060B'); });
      for (var v2 = 0; v2 < nv; v2++) pt(c, P.sx(orden[v2].q.x), P.sy(orden[v2].q.y), 7, orden[v2].q.c ? N.mor : N.cyan, '#fff');
      var votos = [0, 0]; for (var v3 = 0; v3 < nv; v3++) votos[orden[v3].q.c]++;
      if (p >= 1) { var e = seg(p, 1.05, 1.4), dec = p >= 3 ? seg(p, 3.05, 3.4) : 0, puls = p < 3 ? 1 + 0.15 * Math.sin(performance.now() / 180) : 1;
        c.globalAlpha = e; rombo(c, NX, NY, 9 * puls, dec > 0 ? (votos[1] > votos[0] ? N.mor : N.cyan) : N.ama); if (dec === 0) tx(c, '?', NX, NY + 4, '#05060B', 12, 'center', 800); c.globalAlpha = 1; }
      var lin = [['● plan básico', N.cyan], ['● plan premium', N.mor]];
      if (p >= 1) lin.push(['Nuevo cliente: 41 años, $58k', N.ama]);
      if (p >= 2) lin.push(['Vecinos: ' + votos[1] + ' premium · ' + votos[0] + ' básico', N.bl]);
      if (p >= 3) lin.push(['→ Ofrecer plan ' + (votos[1] > votos[0] ? 'PREMIUM' : 'BÁSICO'), votos[1] > votos[0] ? N.mor : N.cyan]);
      panel(c, W, lin);
    };
  };

  /* =================== 10. Árbol de decisión: aprobación de crédito =================== */
  E.arbol = function () {
    var r = rnd(29), d = [];
    for (var i = 0; i < 130; i++) { var ing = 5 + 45 * r(), ant = 10 * r(), ok = ing > 15 && (ant > 1.5 || ing > 30); if (r() < 0.04) ok = !ok; d.push({ x: ing, y: ant, c: ok ? 1 : 0 }); }
    function pred(nivel, q) { if (nivel >= 1 && q.x <= 15) return 0; if (nivel < 1) return 1; if (nivel >= 2 && q.y <= 1.5) return nivel >= 3 && q.x > 30 ? 1 : 0; return 1; }
    return function (c, W, H, p) {
      var P = plano(W, H, 5, 50, 0, 10); P.ejes(c, 5, 5, function (x) { return '$' + fmt(x) + 'k'; }, function (y) { return fmt(y); }, 'ingreso mensual', 'años en su empleo');
      var a = seg(p, 1.05, 1.6), b = seg(p, 2.05, 2.6), e = seg(p, 3.05, 3.6);
      function caja(x0, x1, y0, y1, col, al) { if (al <= 0) return; c.fillStyle = alfa(col, al); c.fillRect(P.sx(x0), P.sy(y1), P.sx(x1) - P.sx(x0), P.sy(y0) - P.sy(y1)); }
      caja(5, 15, 0, 10, N.roj, 0.16 * a); caja(15, 50, 1.5, 10, N.ver, 0.14 * b); caja(15, 30, 0, 1.5, N.roj, 0.16 * b); caja(30, 50, 0, 1.5, N.ver, 0.14 * e);
      var ap = seg(p, 0.05, 0.6);
      d.forEach(function (q, i) { if (i / d.length > ap) return; pt(c, P.sx(q.x), P.sy(q.y), 4.5, q.c ? N.ver : N.roj, '#05060B'); });
      if (a > 0) linea(c, P.sx(15), P.sy(0), P.sx(15), P.sy(10 * a), '#fff', 2.6);
      if (b > 0) linea(c, P.sx(15), P.sy(1.5), P.sx(lerp(15, 50, b)), P.sy(1.5), '#fff', 2.6);
      if (e > 0) linea(c, P.sx(30), P.sy(0), P.sx(30), P.sy(1.5 * e), '#fff', 2.6);
      var nivel = p >= 3.3 ? 3 : (p >= 2.3 ? 2 : (p >= 1.3 ? 1 : 0)), bien = d.filter(function (q) { return pred(nivel, q) === q.c; }).length;
      var lin = [['● pagó', N.ver], ['● no pagó', N.roj]];
      if (p >= 1) lin.push(['¿Ingreso ≤ $15k? → rechazar', a > 0.5 ? N.roj : N.ten]);
      if (p >= 2) lin.push(['¿Menos de 1.5 años en su empleo? → rechazar', b > 0.5 ? N.roj : N.ten]);
      if (p >= 3) lin.push(['… salvo ingreso > $30k → aprobar', e > 0.5 ? N.ver : N.ten]);
      if (p >= 1) lin.push(['Aciertos con ' + nivel + (nivel === 1 ? ' pregunta: ' : ' preguntas: ') + fmt(bien / d.length * 100) + '%', N.ama]);
      panel(c, W, lin);
    };
  };

  /* =================== 11. Umbral de decisión: detección de fraude =================== */
  E.umbral = function () {
    var r = rnd(9), leg = [], fra = [];
    for (var i = 0; i < 950; i++) leg.push(1 / (1 + Math.exp(-(gauss(r) * 1.1 - 2))));
    for (var j = 0; j < 50; j++) fra.push(1 / (1 + Math.exp(-(gauss(r) * 1.1 + 1.3))));
    var B = 20, hl = new Array(B).fill(0), hf = new Array(B).fill(0);
    leg.forEach(function (s) { hl[Math.min(B - 1, Math.floor(s * B))]++; }); fra.forEach(function (s) { hf[Math.min(B - 1, Math.floor(s * B))]++; });
    var ml = Math.max.apply(null, hl), mf = Math.max.apply(null, hf);
    return function (c, W, H, p) {
      var P = plano(W, H, 0, 1, 0, 1.05, { l: 22, r: 14, t: Math.min(140, H * 0.42), b: 34 }); P.ejes(c, 4, 0, function (x) { return fmt(x, 2); }, function () { return ''; }, 'puntaje de riesgo del modelo', '');
      var cr = seg(p, 0.05, 0.8), u = p < 1 ? null : (p < 2 ? lerp(0.98, 0.85, seg(p, 1.05, 1.5)) : (p < 3 ? lerp(0.85, 0.5, seg(p, 2.05, 2.8)) : lerp(0.5, 0.2, seg(p, 3.05, 3.8))));
      for (var b = 0; b < B; b++) { var x0 = P.sx(b / B) + 1, w = P.sx(1 / B) - P.sx(0) - 2, dentro = u != null && (b + 0.5) / B >= u;
        var h1 = hl[b] / ml * cr, h2 = hf[b] / mf * cr;
        c.fillStyle = alfa(N.cyan, dentro ? 0.75 : 0.35); c.fillRect(x0, P.sy(h1), w, P.sy(0) - P.sy(h1));
        c.fillStyle = alfa(N.roj, dentro ? 0.85 : 0.4); c.fillRect(x0, P.sy(h2), w, P.sy(0) - P.sy(h2)); }
      var lin = [['■ 950 compras legítimas', N.cyan], ['■ 50 fraudes', N.roj]];
      if (u != null) {
        linea(c, P.sx(u), P.pad.t, P.sx(u), P.sy(0), '#fff', 2.6); tx(c, 'bloquear →', P.sx(u) + 6, P.pad.t + 12, '#fff', 11.5, 'left', 700);
        var VP = fra.filter(function (s) { return s >= u; }).length, FP = leg.filter(function (s) { return s >= u; }).length;
        lin.push(['Umbral: ' + fmt(u, 2), '#fff'], ['Fraudes detectados: ' + VP + ' de 50', N.ver], ['Fraudes que se escapan: ' + (50 - VP), N.roj], ['Clientes bloqueados por error: ' + FP, N.ama],
          ['Precision ' + fmt(VP / Math.max(1, VP + FP) * 100) + '% · Recall ' + fmt(VP / 50 * 100) + '%', N.bl]);
      }
      panel(c, W, lin, P.pad.l + 6, 12);
    };
  };

  /* ---------- motor ---------- */
  function montar(box) {
    var fab = E[box.getAttribute('data-scene')]; if (!fab) return;
    var stage = box.querySelector('.kb-scrolly-stage'), cv = document.createElement('canvas'); cv.className = 'kb-scrolly-canvas'; stage.appendChild(cv);
    var ctx = cv.getContext('2d'), pasos = [].slice.call(box.querySelectorAll('.kb-scrolly-paso')), dibujar = fab(), W = 0, H = 0, dpr = 1, visible = false, activo = -1;
    function ajustar() { var rc = stage.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; W = rc.width; H = rc.height; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    function progreso() {
      var cen = window.innerHeight * 0.5, n = pasos.length;
      if (cen < pasos[0].getBoundingClientRect().top) return 0;
      for (var i = 0; i < n; i++) { var rc = pasos[i].getBoundingClientRect(); if (cen >= rc.top && cen < rc.bottom) return i + (cen - rc.top) / rc.height; }
      return n - 0.001;
    }
    function cuadro() {
      if (visible && W > 0) {
        var p = clamp(progreso(), 0, pasos.length - 0.001), a = Math.floor(p);
        if (a !== activo) { activo = a; pasos.forEach(function (s, i) { s.classList.toggle('activo', i === a); }); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = ctx.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.75); g.addColorStop(0, '#101830'); g.addColorStop(1, '#05060B');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        try { dibujar(ctx, W, H, p); } catch (e) { console.error('Escena', box.getAttribute('data-scene'), e); visible = false; }
      }
      requestAnimationFrame(cuadro);
    }
    window.addEventListener('resize', ajustar); ajustar();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) ajustar(); }, { rootMargin: '100px 0px' }).observe(box);
    else visible = true;
    requestAnimationFrame(cuadro);
  }
  function iniciar() { document.querySelectorAll('.kb-scrolly[data-scene]').forEach(montar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
