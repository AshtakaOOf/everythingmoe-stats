#!/bin/sh
# Regenerate src/assets/inter-subset.woff2.
set -e
SRC=node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2
python3 -m fontTools.varLib.instancer "$SRC" wght=400:600 -o /tmp/inter-lim.ttf
pyftsubset /tmp/inter-lim.ttf --output-file=src/assets/inter-subset.woff2 --flavor=woff2 \
  --unicodes="U+0020-007E,U+00A0,U+00D7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+2212,U+0394,U+2190-2193,U+25B8" \
  --layout-features="kern,liga,calt,tnum" --no-hinting --desubroutinize
ls -l src/assets/inter-subset.woff2
