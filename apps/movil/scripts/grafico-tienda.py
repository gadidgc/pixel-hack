"""Genera el gráfico de funciones de Google Play (1024x500) y el ícono de 512x512.

Usa la foto de /descargar, el ícono de la app y la fuente Lexend de la app.
Desde la raíz del repo: python3 apps/movil/scripts/grafico-tienda.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[3]
MOVIL = RAIZ / "apps/movil"
SALIDA = MOVIL / "tienda/capturas"
FUENTE = RAIZ / "node_modules/@expo-google-fonts/lexend/600SemiBold/Lexend_600SemiBold.ttf"
FUENTE_TEXTO = RAIZ / "node_modules/@expo-google-fonts/figtree/400Regular/Figtree_400Regular.ttf"

FONDO = (13, 12, 11)
TEXTO = (242, 236, 227)
SUAVE = (165, 157, 146)
ANCHO, ALTO = 1024, 500


def grafico_funciones() -> None:
    lienzo = Image.new("RGB", (ANCHO, ALTO), FONDO)

    # Foto a la derecha, con degradado hacia el fondo para que el texto se lea.
    foto = Image.open(MOVIL / "public/descargar/img/hero.jpg").convert("RGB")
    escala = ALTO / foto.height
    foto = foto.resize((round(foto.width * escala), ALTO))
    # La persona está a ~70% del ancho de la foto: la dejamos cerca del borde derecho.
    x_foto = 840 - round(0.7 * foto.width)
    lienzo.paste(foto, (x_foto, 0))
    degradado = Image.new("L", (ANCHO, 1))
    for x in range(ANCHO):
        # Opaco hasta x=580 (donde termina el texto), transparente desde x=780.
        degradado.putpixel((x, 0), max(0, min(255, round(255 * (780 - x) / 200))))
    capa = Image.new("RGB", (ANCHO, ALTO), FONDO)
    lienzo.paste(capa, (0, 0), degradado.resize((ANCHO, ALTO)))

    dibujo = ImageDraw.Draw(lienzo)
    icono = Image.open(MOVIL / "assets/icon.png").convert("RGBA").resize((64, 64))
    mascara = Image.new("L", (64, 64), 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, 63, 63), radius=14, fill=255)
    lienzo.paste(icono, (56, 56), mascara)
    dibujo.text((136, 72), "Vigía", font=ImageFont.truetype(str(FUENTE), 32), fill=TEXTO)

    titular = ImageFont.truetype(str(FUENTE), 46)
    y = 190
    for linea, color in (("Te arranchan el celular.", SUAVE), ("Tu familia lo sabe", TEXTO), ("al toque.", TEXTO)):
        dibujo.text((56, y), linea, font=titular, fill=color)
        y += 58
    dibujo.text((56, y + 18), "Detecta el arrebato desde una moto y avisa por WhatsApp y SMS.",
                font=ImageFont.truetype(str(FUENTE_TEXTO), 21), fill=SUAVE)

    lienzo.save(SALIDA / "play-grafico-1024x500.png")


def icono_512() -> None:
    Image.open(MOVIL / "assets/icon.png").convert("RGBA").resize((512, 512)).save(SALIDA / "play-icono-512.png")


if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    grafico_funciones()
    icono_512()
    print("Listo:", SALIDA)
