/*
 * La Hispana · Carta online
 * Lee la carta de una hoja de Google publicada como CSV (si está configurada)
 * o de data/carta.csv, y la pinta. Sin dependencias.
 *
 * Textos bilingües: "Texto en español | Text in English".
 * Si falta la parte en inglés, se muestra la española.
 */
(function () {
  "use strict";

  var CFG = window.CARTA_CONFIG || {};
  var CSV_LOCAL = "data/carta.csv";
  var TIEMPO_MAX_HOJA = 5000; // ms antes de usar el respaldo local

  var UI = {
    es: {
      subtitulo: "Café Bar", cargando: "Cargando la carta…", media: "Media", entera: "Entera",
      error: "No hemos podido cargar la carta. Por favor, pide la carta física al personal.",
      verPdf: "Ver carta en PDF", llamar: "Llamar", comoLlegar: "Cómo llegar",
      alergenos: "Alérgenos", arriba: "Volver arriba", saltar: "Saltar a la carta",
      nav: "Secciones de la carta", titulo: "Carta · La Hispana Café Bar", desde: "desde"
    },
    en: {
      subtitulo: "Café Bar", cargando: "Loading menu…", media: "Half", entera: "Full",
      error: "We couldn't load the menu. Please ask our staff for a printed copy.",
      verPdf: "View PDF menu", llamar: "Call us", comoLlegar: "Directions",
      alergenos: "Allergens", arriba: "Back to top", saltar: "Skip to menu",
      nav: "Menu sections", titulo: "Menu · La Hispana Café Bar", desde: "from"
    }
  };

  // Los 14 alérgenos del Reglamento (UE) 1169/2011. Usa el código en la columna "alergenos".
  var ALERGENOS = {
    gluten:      ["GL", "Gluten", "Gluten"],
    crustaceos:  ["CR", "Crustáceos", "Crustaceans"],
    huevo:       ["HU", "Huevo", "Egg"],
    pescado:     ["PE", "Pescado", "Fish"],
    cacahuetes:  ["CA", "Cacahuetes", "Peanuts"],
    soja:        ["SO", "Soja", "Soy"],
    lacteos:     ["LA", "Lácteos", "Milk"],
    frutos_cascara: ["FC", "Frutos de cáscara", "Tree nuts"],
    apio:        ["AP", "Apio", "Celery"],
    mostaza:     ["MO", "Mostaza", "Mustard"],
    sesamo:      ["SE", "Sésamo", "Sesame"],
    sulfitos:    ["SU", "Sulfitos", "Sulphites"],
    altramuces:  ["AL", "Altramuces", "Lupin"],
    moluscos:    ["MU", "Moluscos", "Molluscs"]
  };

  // Columna "etiquetas": argentino, nuevo, y días de la semana (muestra "¡Hoy!" ese día).
  var DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  var ETQ = {
    argentino: { es: "Auténtico argentino", en: "Authentic Argentine" },
    nuevo: { es: "Nuevo", en: "New" },
    hoy: { es: "¡Hoy!", en: "Today!" }
  };

  var lang = idiomaInicial();
  var carta = null;
  var hayIngles = true; // se recalcula al cargar los datos

  /* ---------------- Utilidades ---------------- */

  function sinAcentos(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function slug(s) {
    return sinAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function partes(texto) {
    var t = String(texto || "");
    var i = t.indexOf("|");
    if (i === -1) return [t.trim(), ""];
    return [t.slice(0, i).trim(), t.slice(i + 1).trim()];
  }
  function tr(texto) {
    var p = partes(texto);
    if (lang === "en") return p[1] || p[0];
    // Si solo hay parte en inglés ("| ..."), en español no se muestra nada
    return p[0];
  }
  function clave(texto) { return partes(texto)[0] || partes(texto)[1]; }
  function t(k) { return (UI[lang] && UI[lang][k]) || UI.es[k]; }

  function el(tag, attrs, hijos) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (hijos || []).forEach(function (h) { if (h) n.appendChild(typeof h === "string" ? document.createTextNode(h) : h); });
    return n;
  }

  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function idiomaInicial() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "es" || q === "en") return q;
    var g = leer("carta-idioma");
    if (g === "es" || g === "en") return g;
    return /^es\b/i.test(navigator.language || "es") ? "es" : "en";
  }

  /* ---------------- Precios ---------------- */

  function precio(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    // Solo se formatea si es un único número ("3,80", "+0,50", "desde 3,00").
    // Cualquier otra cosa ("2x1", "S/M") se muestra tal cual.
    if (!/^[^\d]*\d+(?:[.,]\d{1,2})?\s*€?\s*$/.test(s)) return s;
    var m = s.match(/(\d+(?:[.,]\d{1,2})?)/);
    var num = parseFloat(m[1].replace(",", "."));
    var antes = s.slice(0, m.index).replace(/€/g, "").trim();
    var signo = "";
    if (/\+$/.test(antes)) { signo = "+"; antes = antes.replace(/\+$/, "").trim(); }
    if (/^desde$/i.test(antes)) antes = t("desde");
    var fmt = new Intl.NumberFormat(lang === "en" ? "en-IE" : "es-ES", {
      style: "currency", currency: "EUR", minimumFractionDigits: 2
    }).format(num);
    return (antes ? antes + " " : "") + signo + fmt;
  }

  /* ---------------- CSV ---------------- */

  function parseCSV(texto) {
    var filas = [], fila = [], campo = "", comillas = false;
    texto = texto.replace(/^﻿/, "");
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (comillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
        } else campo += c;
      } else if (c === '"') comillas = true;
      else if (c === ",") { fila.push(campo); campo = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        fila.push(campo); filas.push(fila); fila = []; campo = "";
      } else campo += c;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }

    var cab = (filas.shift() || []).map(function (h) { return slug(h).replace(/-/g, "_"); });
    return filas
      .filter(function (f) { return f.some(function (x) { return x.trim(); }); })
      .map(function (f) {
        var o = {};
        cab.forEach(function (h, j) { o[h] = (f[j] || "").trim(); });
        return o;
      });
  }

  /* ---------------- Modelo ---------------- */

  function construir(filas) {
    var bloques = [], porBloque = {}, porCategoria = {};
    filas.forEach(function (f) {
      var tipo = (f.tipo || "plato").toLowerCase();
      if (tipo === "oculto" || !f.categoria) return;
      if (tipo !== "nota" && !f.nombre) return;

      var kb = clave(f.bloque || "");
      if (!porBloque[kb]) { porBloque[kb] = { texto: f.bloque || "", categorias: [] }; bloques.push(porBloque[kb]); }

      var kc = clave(f.categoria);
      var cat = porCategoria[kc];
      if (!cat) {
        cat = porCategoria[kc] = { id: slug(kc), texto: f.categoria, grupos: [], notas: [], doble: false };
        porBloque[kb].categorias.push(cat);
      }
      if (tipo === "nota") { cat.notas.push(f.descripcion || f.nombre); return; }

      var g = cat.grupos[cat.grupos.length - 1];
      if (!g || clave(g.texto) !== clave(f.grupo || "")) { g = { texto: f.grupo || "", items: [] }; cat.grupos.push(g); }
      if (f.precio_media) cat.doble = true;
      g.items.push(f);
    });

    hayIngles = filas.some(function (f) {
      return ["categoria", "nombre", "descripcion"].some(function (k) { return partes(f[k])[1]; });
    });
    return bloques;
  }

  /* ---------------- Pintado ---------------- */

  function bandera() {
    var txt = ETQ.argentino[lang];
    return el("span", { class: "bandera-ar", role: "img", "aria-label": txt, title: txt });
  }

  function etiquetas(it) {
    return (it.etiquetas || "").split(/[,;]+/).map(function (e) { return slug(e).replace(/-/g, "_"); }).filter(Boolean);
  }

  function pintarItem(it, doble, destacado) {
    var etq = etiquetas(it);
    var hoy = DIAS[new Date().getDay()];
    var esArg = etq.indexOf("argentino") !== -1;
    if (esArg) hayArgentino = true;

    var nombre = el("span", { class: "item__nombre" });
    var textoNombre = tr(it.nombre);
    if (esArg && !destacado) {
      // La última palabra va pegada a la bandera para que nunca se quede sola en otra línea
      var corte = textoNombre.lastIndexOf(" ");
      nombre.appendChild(document.createTextNode(textoNombre.slice(0, corte + 1)));
      nombre.appendChild(el("span", { class: "nowrap" }, [textoNombre.slice(corte + 1) + " ", bandera()]));
    } else {
      nombre.textContent = textoNombre;
    }

    var fila = el("div", { class: "item__fila" }, [
      nombre,
      el("span", { class: "item__puntos", "aria-hidden": "true" })
    ]);
    if (doble) {
      var pm = precio(it.precio_media);
      fila.appendChild(el("span", { class: "item__precio" + (pm ? "" : " item__precio--vacio"), text: pm || "—", "aria-label": pm ? t("media") + " " + pm : null, "aria-hidden": pm ? null : "true" }));
      var pe = precio(it.precio);
      fila.appendChild(el("span", { class: "item__precio", text: pe, "aria-label": t("entera") + " " + pe }));
    } else {
      fila.appendChild(el("span", { class: "item__precio", text: precio(it.precio) }));
    }

    var li = el("li", { class: "item" }, [fila]);
    var d = tr(it.descripcion);
    if (d) li.appendChild(el("p", { class: "item__desc", text: d }));

    var pills = [];
    if (etq.indexOf(hoy) !== -1) pills.push(el("span", { class: "pill pill--hoy", text: ETQ.hoy[lang] }));
    if (etq.indexOf("nuevo") !== -1) pills.push(el("span", { class: "pill", text: ETQ.nuevo[lang] }));
    if (esArg && destacado) pills.push(el("span", { class: "pill pill--ar" }, [bandera(), ETQ.argentino[lang]]));
    if (pills.length) li.appendChild(el("div", { class: "item__pills" }, pills));

    var codigos = (it.alergenos || "").split(/[,;\s]+/).map(function (c) { return slug(c).replace(/-/g, "_"); })
      .filter(function (c) { return ALERGENOS[c]; });
    if (codigos.length) {
      li.appendChild(el("div", { class: "item__alergenos" }, codigos.map(function (c) {
        var a = ALERGENOS[c], nombre = lang === "en" ? a[2] : a[1];
        return el("span", { class: "alergeno", title: nombre, "aria-label": nombre, text: a[0] });
      })));
      codigos.forEach(function (c) { usadosSet[c] = true; });
    }
    return li;
  }

  var usadosSet = {};
  var hayArgentino = false;

  function pintarCarta() {
    usadosSet = {};
    hayArgentino = false;
    var main = document.getElementById("carta");
    var nav = document.getElementById("nav");
    main.textContent = ""; nav.textContent = "";

    carta.forEach(function (b) {
      var sec = el("div", { class: "bloque__secciones" });
      var tb = tr(b.texto);
      // El bloque llamado "Ofertas" se pinta destacado (ponlo el primero en el CSV)
      var destacado = /^ofertas?\b/.test(slug(clave(b.texto)));
      var bloque = el("section", { class: "bloque" + (destacado ? " bloque--ofertas" : ""), "aria-label": tb || null }, [
        tb ? el("h2", { class: "bloque__titulo", text: tb }) : null, sec
      ]);

      b.categorias.forEach(function (c) {
        var art = el("article", { class: "seccion" + (c.doble ? " seccion--doble" : ""), id: c.id }, [
          el("h3", { class: "seccion__titulo", text: tr(c.texto) })
        ]);
        if (c.doble) art.appendChild(el("div", { class: "cols-precio", "aria-hidden": "true" }, [
          el("span", { text: t("media") }), el("span", { text: t("entera") })
        ]));
        c.grupos.forEach(function (g) {
          var cont = el("div", { class: "grupo" });
          if (g.texto) cont.appendChild(el("h4", { class: "grupo__titulo", text: tr(g.texto) }));
          var ul = el("ul", { class: "items" });
          g.items.forEach(function (it) { ul.appendChild(pintarItem(it, c.doble, destacado)); });
          cont.appendChild(ul);
          art.appendChild(cont);
        });
        c.notas.forEach(function (n) { art.appendChild(el("p", { class: "nota", text: tr(n) })); });
        sec.appendChild(art);

        nav.appendChild(el("li", null, [el("a", { href: "#" + c.id, class: destacado ? "nav__oferta" : null, text: tr(c.texto) })]));
      });
      main.appendChild(bloque);
    });

    if (hayArgentino) {
      main.appendChild(el("p", { class: "leyenda-ar" }, [bandera(), " " + ETQ.argentino[lang]]));
    }

    // Leyenda de alérgenos (solo si se usa alguno)
    var lista = Object.keys(ALERGENOS).filter(function (k) { return usadosSet[k]; });
    if (lista.length) {
      main.appendChild(el("section", { class: "seccion leyenda", id: "alergenos" }, [
        el("h3", { class: "seccion__titulo", text: t("alergenos") }),
        el("ul", null, lista.map(function (k) {
          var a = ALERGENOS[k];
          return el("li", null, [el("span", { class: "alergeno", text: a[0], "aria-hidden": "true" }), lang === "en" ? a[2] : a[1]]);
        }))
      ]));
    }
    activarScrollSpy();
  }

  function pintarPie() {
    var pie = document.getElementById("pie");
    pie.textContent = "";
    var inner = el("div", { class: "pie__inner" }, [el("p", { class: "pie__marca", text: CFG.nombre || "La Hispana" })]);

    var contacto = el("ul", { class: "pie__contacto" });
    if (CFG.direccion) contacto.appendChild(el("li", { text: tr(CFG.direccion) }));
    if (CFG.horario) contacto.appendChild(el("li", { text: tr(CFG.horario) }));
    if (contacto.children.length) inner.appendChild(contacto);

    var botones = el("div", { class: "pie__botones" });
    if (CFG.telefono) botones.appendChild(el("a", { class: "boton", href: "tel:" + CFG.telefono.replace(/\s+/g, ""), text: t("llamar") }));
    if (CFG.googleMaps) botones.appendChild(el("a", { class: "boton", href: CFG.googleMaps, target: "_blank", rel: "noopener", text: t("comoLlegar") }));
    if (CFG.instagram) botones.appendChild(el("a", { class: "boton", href: CFG.instagram, target: "_blank", rel: "noopener", text: "Instagram" }));
    if (CFG.pdfUrl) botones.appendChild(el("a", { class: "boton", href: CFG.pdfUrl, target: "_blank", rel: "noopener", text: t("verPdf") }));
    if (botones.children.length) inner.appendChild(botones);

    var avisos = el("div", { class: "pie__avisos" });
    (CFG.avisos || []).forEach(function (a) { avisos.appendChild(el("p", { text: tr(a) })); });
    inner.appendChild(avisos);
    pie.appendChild(inner);
  }

  function pintarTextosFijos() {
    document.documentElement.lang = lang;
    document.title = t("titulo");
    document.querySelectorAll("[data-i18n]").forEach(function (n) { n.textContent = t(n.getAttribute("data-i18n")); });
    document.querySelector(".skip").textContent = t("saltar");
    document.querySelector(".nav").setAttribute("aria-label", t("nav"));
    document.getElementById("arriba").setAttribute("aria-label", t("arriba"));
    var sub = CFG.subtitulo && tr(CFG.subtitulo);
    if (sub) document.querySelector("[data-i18n=subtitulo]").textContent = sub;
    document.querySelectorAll(".idioma button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    document.querySelector(".idioma").hidden = !hayIngles;
  }

  function pintarTodo() {
    pintarTextosFijos();
    if (carta) pintarCarta();
    pintarPie();
  }

  /* ---------------- Navegación activa ---------------- */

  var observador = null;
  function activarScrollSpy() {
    if (observador) observador.disconnect();
    if (!("IntersectionObserver" in window)) return;
    var enlaces = {};
    document.querySelectorAll("#nav a").forEach(function (a) { enlaces[a.getAttribute("href").slice(1)] = a; });
    observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = enlaces[e.target.id];
        if (!a) return;
        document.querySelectorAll('#nav a[aria-current="true"]').forEach(function (x) { x.removeAttribute("aria-current"); });
        a.setAttribute("aria-current", "true");
        var lista = document.getElementById("nav");
        var objetivo = a.offsetLeft - (lista.clientWidth - a.offsetWidth) / 2;
        lista.scrollTo({ left: objetivo, behavior: "smooth" });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    document.querySelectorAll(".seccion[id]").forEach(function (s) { observador.observe(s); });
  }

  /* ---------------- Carga de datos ---------------- */

  function descargar(url, conTiempo) {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = conTiempo && ctrl ? setTimeout(function () { ctrl.abort(); }, TIEMPO_MAX_HOJA) : null;
    return fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (txt) {
        var filas = parseCSV(txt);
        if (!filas.length || !("categoria" in filas[0])) throw new Error("CSV sin columna 'categoria'");
        return filas;
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function cargar() {
    var hoja = (CFG.googleSheetCsvUrl || "").trim();
    var p = hoja
      ? descargar(hoja, true).catch(function (e) {
          console.warn("[carta] Hoja de Google no disponible, uso data/carta.csv:", e.message);
          return descargar(CSV_LOCAL, false);
        })
      : descargar(CSV_LOCAL, false);

    p.then(function (filas) {
      carta = construir(filas);
      pintarTodo();
      if (location.hash) {
        var destino = document.getElementById(location.hash.slice(1));
        if (destino) destino.scrollIntoView();
      }
    }).catch(function (e) {
      console.error("[carta]", e);
      var main = document.getElementById("carta");
      main.textContent = "";
      main.appendChild(el("p", { class: "error", text: t("error") }));
      if (CFG.pdfUrl) main.appendChild(el("p", { class: "error" }, [el("a", { href: CFG.pdfUrl, text: t("verPdf") })]));
    });
  }

  /* ---------------- Eventos ---------------- */

  document.querySelectorAll(".idioma button").forEach(function (b) {
    b.addEventListener("click", function () {
      var nuevo = b.getAttribute("data-lang");
      if (nuevo === lang) return;
      lang = nuevo;
      guardar("carta-idioma", lang);
      pintarTodo();
    });
  });

  var arriba = document.getElementById("arriba");
  window.addEventListener("scroll", function () { arriba.hidden = window.scrollY < 700; }, { passive: true });
  arriba.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  pintarTextosFijos();
  pintarPie();
  cargar();
})();
