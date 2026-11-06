# Carta online · La Hispana Café Bar

Web estática de una sola página, pensada para móvil y en dos idiomas (ES/EN), para abrirla desde un QR en las mesas.
No tiene servidor, base de datos ni dependencias, y se aloja gratis en GitHub Pages.

```
la-hispana-carta/
├── index.html            ← estructura de la página
├── css/styles.css        ← diseño (colores y tipografías de la carta de Canva)
├── js/config.js          ← ⚙️ configuración: hoja de Google, PDF, contacto, avisos
├── js/app.js             ← lógica (lee el CSV y pinta la carta)
├── data/carta.csv        ← 🍽️ LA CARTA (platos, precios, traducciones)
├── img/                  ← logo y favicon
└── tools/generar_qr.py   ← genera el QR y las tarjetas para las mesas
```

---

## Paso 1 · Probarla en tu ordenador

La web lee `data/carta.csv` con `fetch`, así que no funciona abriendo el `index.html` con doble clic. Tiene que servirse por HTTP:

```bash
cd la-hispana-carta
python3 -m http.server 8000
```

Abre <http://localhost:8000>. Para verla como en un móvil, usa las DevTools del navegador (F12 → icono de móvil).
Para probar el inglés: <http://localhost:8000/?lang=en>.

> El idioma se elige solo según el idioma del móvil. Si está en español, sale en español; si no, en inglés. El cliente puede cambiarlo con el botón ES/EN y la página lo recuerda.

---

## Paso 2 · Entender el formato de la carta

Toda la carta está en `data/carta.csv` (se puede abrir con Excel, LibreOffice o Google Sheets). Cada fila es un plato:

| columna | qué es | ejemplo |
|---|---|---|
| `bloque` | Gran apartado (título grande) | `Cocina \| Kitchen` |
| `categoria` | Sección (cada una tiene su botón en el menú de arriba) | `Raciones \| Sharing plates` |
| `grupo` | Subtítulo opcional dentro de una sección | `Cervezas \| Beers` |
| `tipo` | `plato` (o vacío), `nota` (recuadro destacado) u `oculto` (no se muestra) | `plato` |
| `nombre` | Nombre del plato | `Finger de pollo \| Chicken fingers` |
| `descripcion` | Ingredientes o aclaración (opcional) | `Con patatas y huevo \| With fries & egg` |
| `precio` | Precio (entera si hay dos) | `13,90` · `+1,00` · `desde 3,00` |
| `precio_media` | Precio de media (si lo rellenas, la sección muestra dos columnas: Media / Entera) | `8,00` |
| `alergenos` | Códigos separados por comas (ver abajo) | `gluten, huevo, lacteos` |

**Traducción:** escribe `Español | English`. Si no pones la barra, se usa el mismo texto en los dos idiomas.
Si una celda empieza por `|` (por ejemplo `| Breaded pork roll with ham`), esa descripción solo se ve en inglés. Sirve para explicar platos típicos a los turistas.

**Orden:** las secciones y los platos salen en el mismo orden que las filas.

**Ocultar un plato temporalmente** (se acabó, plato de temporada…): pon `oculto` en la columna `tipo`.

**Alérgenos:** códigos válidos: `gluten`, `crustaceos`, `huevo`, `pescado`, `cacahuetes`, `soja`, `lacteos`, `frutos_cascara`, `apio`, `mostaza`, `sesamo`, `sulfitos`, `altramuces`, `moluscos`.
En cuanto un plato tenga alguno, aparecen unas etiquetas junto al plato y una leyenda al final. Ahora mismo están vacíos a propósito: **esta información la tiene que dar cocina**, no hay que inventarla.

---

## Paso 3 · Publicarla gratis en GitHub Pages

1. Crea una cuenta en <https://github.com> (o usa la tuya).
2. **New repository** → nombre, por ejemplo `carta` → **Public** (en el plan gratuito, Pages exige que el repositorio sea público) → *Create repository*.
3. Sube los archivos. Puedes hacerlo con git:
   ```bash
   cd la-hispana-carta
   git init && git add . && git commit -m "Carta online La Hispana"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/carta.git
   git push -u origin main
   ```
   o arrastrando la carpeta en la web del repo (*Add file → Upload files*).
4. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
5. En uno o dos minutos estará en `https://TU_USUARIO.github.io/carta/`.

Cada vez que hagas `git push`, la web se actualiza sola.

> Alternativa equivalente: **Cloudflare Pages** (conectas el repo y listo). También es gratis y va muy rápido en España.

### (Opcional, recomendado) Dominio propio, unos 10 €/año

Una URL como `lahispana.es/carta` queda más profesional y, sobre todo, **hace que el QR dependa de vosotros y no de GitHub**. Si algún día cambiáis de hosting, se cambia el DNS y el QR impreso sigue funcionando.

1. Compra el dominio (DonDominio, Cloudflare Registrar, etc.).
2. En **Settings → Pages → Custom domain**, escribe `carta.lahispana.es` (o `www.lahispana.es`).
3. En el DNS del dominio, crea un registro `CNAME` de `carta` a `TU_USUARIO.github.io`.
4. Cuando lo verifique, marca **Enforce HTTPS**.

⚠️ **Decide la URL definitiva antes de imprimir el QR.**

---

## Paso 4 · (Opcional) Que tus amigos editen la carta desde Google Sheets

Así pueden cambiar un precio desde el móvil sin pedírtelo ni tocar código.

1. Crea una hoja de cálculo nueva en Google Sheets.
2. **Archivo → Importar → Subir** `data/carta.csv` → *Reemplazar hoja de cálculo*, y **desmarca** «Convertir texto en números, fechas y fórmulas» (así los precios se quedan tal cual, con coma).
3. **Archivo → Compartir → Publicar en la Web** → elige la hoja → formato **Valores separados por comas (.csv)** → *Publicar*. Copia el enlace.
4. Pégalo en `js/config.js`:
   ```js
   googleSheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv",
   ```
5. Haz `git push`. A partir de ahora la web lee la hoja.
6. Comparte la hoja (como **editores**) solo con las personas del bar.

Cosas a tener en cuenta:
- Google tarda **unos 5 minutos** en reflejar los cambios en el CSV publicado.
- Si la hoja no responde en 5 segundos, la web usa `data/carta.csv` como respaldo. De vez en cuando, descarga la hoja como CSV y sustituye ese archivo para que el respaldo esté al día.
- No cambies los nombres de las columnas de la primera fila.

---

## Paso 5 · Generar el QR y las tarjetas de mesa

```bash
pip install segno
python3 tools/generar_qr.py https://TU_USUARIO.github.io/carta/
```

Crea la carpeta `qr/` con:
- `qr-carta.svg`: vectorial, para imprenta o para meterlo en Canva sin que pierda calidad.
- `qr-carta.png`: para usos rápidos (redes, WhatsApp).
- `tarjetas-mesa.html`: ábrelo en el navegador e imprime en A4 al 100 %. Salen 4 tarjetas A6 con el logo, el QR, «Escanea para ver la carta / Scan to see the menu» y la URL escrita.

Es un **QR estático**: la URL va dentro del propio código, no pasa por ningún servicio externo y no caduca.
❌ No uses generadores web de «QR dinámico»: muchos dejan de funcionar o empiezan a cobrar a los pocos meses.

### Checklist antes de imprimir
- [ ] La URL del QR es la definitiva (con dominio propio, si lo vais a tener).
- [ ] Probado con al menos 3 móviles distintos (iPhone y Android) **en el bar, con su luz**.
- [ ] El QR mide al menos 2,5–3 cm (en la tarjeta mide unos 5 cm).
- [ ] Probado también con datos móviles, no solo con el wifi del bar.
- [ ] Hay carta física para quien no tenga móvil o no quiera usarlo.

---

## Paso 6 · Ajustes finales en `js/config.js`

- `pdfUrl`: copia el PDF de Canva a la carpeta como `carta.pdf` y pon `pdfUrl: "carta.pdf"`. Aparecerá el botón «Ver carta en PDF» en el pie.
- `direccion`, `telefono`, `horario`, `instagram`, `googleMaps`: si los rellenas, aparecen en el pie con botones de «Llamar» y «Cómo llegar».
- Pon también la URL de la carta en la ficha de **Google Business Profile** (Google Maps → *Menú*).

---

## Detalles técnicos

- Sin cookies, sin analítica y sin rastreo, así que **no hace falta banner de cookies**. Las fuentes se cargan desde Bunny Fonts, que no rastrea (a diferencia de Google Fonts).
- HTML, CSS y JS sin frameworks ni proceso de compilación. Pesa unos 45 KB más el logo.
- Accesible: navegación por teclado, etiquetas ARIA y contraste AA.
- Si cambian los colores o tipografías de la marca, están todos al principio de `css/styles.css` (`:root`).
- El logo actual mide 182 px. Si tenéis una versión más grande (≥ 400 px) o en SVG, sustituye `img/logo.png` y se verá más nítido en pantallas retina.
