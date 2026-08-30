#!/usr/bin/env python3
"""
cargopete-style palette validator.

Checks every ink and accent token against ALL FOUR surfaces, not merely the page
ground. A token that clears AA on --bg but fails on --bg-inset will be unreadable
inside a chip or a kbd, which is exactly where small labels live.

    python3 tools/contrast.py                 # validate the mandated palette
    python3 tools/contrast.py --check '#cc4455'
                                              # check one colour you are deriving
                                              # (a destructive-action red, say)

Exit code is non-zero if anything required fails, so it drops straight into CI.

--text-faint is expected to fail AA and is listed as DECORATIVE. That is a
contract, not an oversight: it carries kickers, window titles and timestamps, and
never body copy, a link, or the only instance of a fact. See SKILL.md section 2.
"""

import argparse
import sys

AA, AAA = 4.5, 7.0


# --------------------------------------------------------------------------- maths

def _linear(channel: int) -> float:
    c = channel / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hexstr: str) -> float:
    h = hexstr.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def ratio(fg: str, bg: str) -> float:
    a, b = luminance(fg), luminance(bg)
    if a < b:
        a, b = b, a
    return (a + 0.05) / (b + 0.05)


# --------------------------------------------------------------------- the palette

DARK_SURFACES = {
    "--bg":       "#171614",
    "--bg-elev":  "#201f1c",
    "--bg-code":  "#1b1a17",
    "--bg-inset": "#262420",
}

DARK_INKS = {
    # token          value      required
    "--text":       ("#ece9e3", AAA),
    "--text-muted": ("#9c978c", AA),
    "--text-faint": ("#6e6a61", None),   # decorative by contract
    "--accent":     ("#8bb8dc", AA),
    "--accent-ink": ("#cfe3f2", AA),
    "--rust":       ("#cd8560", AA),
    "--ok":         ("#86b592", AA),
    "--warn":       ("#cdb06a", AA),
}

LIGHT_SURFACES = {
    "--bg":       "#fbfbfa",
    "--bg-elev":  "#ffffff",
    "--bg-code":  "#f7f6f3",
    "--bg-inset": "#f2f1ec",
}

LIGHT_INKS = {
    "--text":       ("#2f3437", AAA),
    "--text-muted": ("#706d69", AA),     # NOT #787774 - that measures 4.32 and misses
    "--text-faint": ("#9a968e", None),
    "--accent":     ("#1f6c9f", AA),
    "--accent-ink": ("#1a5680", AA),
    "--rust":       ("#9d5433", AA),   # NOT #a85a38 - that measures 4.44 on --bg-inset
    "--ok":         ("#346538", AA),
    "--warn":       ("#8a6400", AA),
}


# ------------------------------------------------------------------------ reporting

def check(theme: str, surfaces: dict, inks: dict) -> int:
    print(f"\n  {theme}")
    print("  " + "-" * 68)
    header = "  {:<14}".format("token") + "".join(f"{s.lstrip('-'):>13}" for s in surfaces)
    print(header + "   verdict")

    failures = 0
    for token, (value, required) in inks.items():
        ratios = {s: ratio(value, sv) for s, sv in surfaces.items()}
        worst = min(ratios.values())

        if required is None:
            verdict = "DECORATIVE"
        elif worst >= AAA:
            verdict = "AAA"
        elif worst >= AA:
            verdict = "AA"
        else:
            verdict = f"FAIL (needs {required})"
            failures += 1

        cells = "".join(f"{r:>13.2f}" for r in ratios.values())
        print(f"  {token:<14}{cells}   {verdict}")

    return failures


def derive(colour: str) -> int:
    """Check one colour a caller is deriving - a destructive red, typically -
    against every surface in both themes."""
    print(f"\n  deriving {colour}")
    print("  " + "-" * 68)
    failures = 0
    for theme, surfaces in (("dark", DARK_SURFACES), ("light", LIGHT_SURFACES)):
        for name, sv in surfaces.items():
            r = ratio(colour, sv)
            mark = "ok " if r >= AA else "FAIL"
            if r < AA:
                failures += 1
            print(f"  {theme:<6}{name:<12}{r:>8.2f}   {mark}")
    if failures:
        print("\n  Fails AA somewhere. Darken or lighten it, or restrict it to the")
        print("  surfaces where it clears - and write that restriction down.")
    return failures


def main() -> int:
    ap = argparse.ArgumentParser(description="cargopete-style palette validator")
    ap.add_argument("--check", metavar="HEX",
                    help="validate a single colour you are deriving against all surfaces")
    args = ap.parse_args()

    if args.check:
        return 1 if derive(args.check) else 0

    print("\n  cargopete-style - mandated palette")
    failures = check("dark (canonical)", DARK_SURFACES, DARK_INKS)
    failures += check("light (optional inversion)", LIGHT_SURFACES, LIGHT_INKS)

    print()
    if failures:
        print(f"  {failures} token(s) below their required ratio.\n")
        return 1
    print("  All required tokens clear their targets on every surface.")
    print("  --text-faint is decorative by contract: kickers, window titles,")
    print("  timestamps. Never body copy, never a link, never the only instance")
    print("  of a fact.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
