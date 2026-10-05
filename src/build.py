# Builds ../index.html from game.html by embedding the Fredoka font (so the game works offline).
# Usage (from the repo root):  python3 src/build.py
import base64, pathlib
here = pathlib.Path(__file__).parent
src = (here / 'game.html').read_text()
ff = ''
for w in (600, 700):
    b = base64.b64encode((here / 'fonts' / f'fredoka-latin-{w}-normal.woff2').read_bytes()).decode()
    ff += f'@font-face{{font-family:"Fredoka";font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format("woff2")}}\n'
(here.parent / 'index.html').write_text(src.replace('/*FONTS*/', ff))
print('built index.html')
