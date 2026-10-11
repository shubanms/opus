"""Subset the Ink fonts to Latin + the glyphs in scripts/glyphs.txt.

Run via `npm run fonts:subset` (needs fonttools + brotli; TTFs live in the
gitignored scripts/fonts-src/, see HANDOFF 5.5). Output: public/fonts/*.woff2.
"""
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "scripts" / "fonts-src"
out = root / "public" / "fonts"
glyphs = root / "scripts" / "glyphs.txt"
out.mkdir(parents=True, exist_ok=True)

UNICODES = "U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+2190-2193,U+2212,U+00D7"
FILES = [
    "ShipporiMinchoB1-Bold", "ShipporiMinchoB1-ExtraBold", "ZenKakuGothicNew-Regular", "ZenKakuGothicNew-Medium",
    "ZenKakuGothicNew-Bold", "YujiSyuku-Regular",
]

total = 0
for stale in out.glob("*.woff2"):
    if stale.stem not in FILES:
        stale.unlink()
for name in FILES:
    ttf = src / f"{name}.ttf"
    if not ttf.exists():
        sys.exit(f"missing {ttf}; download per HANDOFF 5.5")
    dest = out / f"{name}.woff2"
    # Yuji Syuku is for kanji only (HANDOFF 8.2): no Latin range.
    unicodes = "U+0020" if name.startswith("YujiSyuku") else UNICODES
    subprocess.run([
        "pyftsubset", str(ttf), f"--text-file={glyphs}", f"--unicodes={unicodes}",
        "--layout-features=kern,liga,palt,vert,tnum,pnum", "--no-hinting", "--desubroutinize",
        "--flavor=woff2", f"--output-file={dest}",
    ], check=True)
    total += dest.stat().st_size
    print(f"{dest.name}: {dest.stat().st_size / 1024:.1f} KB")
print(f"total: {total / 1024:.1f} KB (budget 400 KB)")
