#!/usr/bin/env python3
"""
Genera el QR de la carta y una hoja de tarjetas para las mesas.

Uso:
    pip install segno
    python3 tools/generar_qr.py https://TU-URL-DE-LA-CARTA

Crea en la carpeta qr/:
    qr-carta.svg        -> para imprenta / Canva (vectorial, no pierde calidad)
    qr-carta.png        -> para usos rápidos (WhatsApp, redes, etc.)
    tarjetas-mesa.html  -> ábrelo en el navegador e imprime en A4 (4 tarjetas A6 por hoja)

Es un QR ESTÁTICO: la URL va dentro del propio código, no depende de ningún
servicio externo y no caduca nunca. Solo deja de funcionar si cambias la URL.
"""
import html
import sys
from pathlib import Path

try:
    import segno
except ImportError:
    sys.exit("Falta la librería segno. Instálala con:  pip install segno")

VERDE = "#1e4d1b"
RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "qr"

TARJETA = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Tarjetas QR · La Hispana</title>
<link rel="stylesheet" href="https://fonts.bunny.net/css?family=abril-fatface:400|league-spartan:600,700|nunito-sans:400,600&display=swap">
<style>
  @page {{ size: A4; margin: 0; }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: #ddd; font-family: "Nunito Sans", system-ui, sans-serif; color: {verde}; }}
  .hoja {{ width: 210mm; height: 297mm; margin: 10mm auto; background: #fff;
          display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }}
  .tarjeta {{ border: .2mm dashed #bbb; display: flex; flex-direction: column; align-items: center;
             justify-content: center; text-align: center; padding: 8mm; background: #f6f8f4; }}
  .marco {{ width: 100%; height: 100%; border: .4mm solid #7fa088; outline: .3mm solid #7fa088;
           outline-offset: -1.6mm; display: flex; flex-direction: column; align-items: center;
           justify-content: center; padding: 6mm 4mm; }}
  .logo {{ width: 18mm; height: 18mm; border-radius: 50%; }}
  .nombre {{ font-family: "Abril Fatface", Georgia, serif; font-size: 22pt; line-height: 1; margin: 2mm 0 0; }}
  .sub {{ font-family: "Abril Fatface", Georgia, serif; letter-spacing: .4em; font-size: 7pt; margin: 1.5mm 0 4mm; }}
  .qr {{ width: 52mm; height: 52mm; background: #fff; padding: 3mm; border-radius: 2mm; }}
  .qr svg {{ width: 100%; height: 100%; display: block; }}
  .cta {{ font-family: "League Spartan", sans-serif; font-weight: 700; letter-spacing: .12em;
         text-transform: uppercase; font-size: 11pt; margin: 4mm 0 .5mm; }}
  .cta-en {{ font-size: 8pt; opacity: .8; margin: 0; }}
  .url {{ font-size: 7pt; margin: 3mm 0 0; opacity: .75; word-break: break-all; }}
  @media print {{ body {{ background: none; }} .hoja {{ margin: 0; }} .aviso {{ display: none; }} }}
  .aviso {{ max-width: 210mm; margin: 10mm auto 0; font-size: 14px; color: #333; }}
</style>
</head>
<body>
<p class="aviso">Imprime esta página en A4 al 100&nbsp;% (sin «ajustar a página») y recorta por la línea discontinua.
Prueba el QR con varios móviles antes de imprimir todas las tarjetas.</p>
<div class="hoja">
{tarjetas}
</div>
</body>
</html>
"""

UNA_TARJETA = """  <div class="tarjeta"><div class="marco">
    <img class="logo" src="../img/logo.png" alt="">
    <p class="nombre">La Hispana</p>
    <p class="sub">CAFÉ BAR</p>
    <div class="qr">{svg}</div>
    <p class="cta">Escanea para ver la carta</p>
    <p class="cta-en">Scan to see the menu</p>
    <p class="url">{url}</p>
  </div></div>"""


def main():
    if len(sys.argv) != 2 or not sys.argv[1].startswith(("http://", "https://")):
        sys.exit("Uso: python3 tools/generar_qr.py https://tu-url-de-la-carta")
    url = sys.argv[1].strip()

    # Corrección de errores "Q" (25 %): aguanta manchas, arañazos y reflejos en la mesa.
    qr = segno.make(url, error="q", micro=False)
    SALIDA.mkdir(exist_ok=True)

    qr.save(SALIDA / "qr-carta.svg", scale=10, border=4, dark=VERDE, light="#ffffff")
    qr.save(SALIDA / "qr-carta.png", scale=30, border=4, dark=VERDE, light="#ffffff")

    svg = qr.svg_inline(scale=1, border=2, dark=VERDE, light=None, omitsize=True)
    url_visible = html.escape(url.replace("https://", "").replace("http://", "").rstrip("/"))
    tarjetas = "\n".join(UNA_TARJETA.format(svg=svg, url=url_visible) for _ in range(4))
    (SALIDA / "tarjetas-mesa.html").write_text(TARJETA.format(verde=VERDE, tarjetas=tarjetas), encoding="utf-8")

    print(f"QR para: {url}")
    print(f"  Versión {qr.designator}, corrección de errores Q")
    for f in ("qr-carta.svg", "qr-carta.png", "tarjetas-mesa.html"):
        print(f"  -> {SALIDA / f}")


if __name__ == "__main__":
    main()
