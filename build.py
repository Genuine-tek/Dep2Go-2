#!/usr/bin/env python3
"""Re-inject the shared header / pill row / sidebar / schema / footer into every page.

The site is plain static HTML — you can open any page directly and it works.
This script exists only so the shared chrome has a single source of truth:
edit partials/header.html (or footer/sidebar), run

    python build.py

and every page is updated in place. Each page carries marker comments

    <!-- @header --> ... <!-- /@header -->

and only the text between a matching pair is replaced, so your page content is
never touched. Run it as many times as you like; it is idempotent.

Per-page settings (which nav item is current, the sidebar ticket number,
whether the sidebar shows the request form) live in partials/pages.json.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTIALS = ROOT / "partials"

# The origin written into the source files. Every absolute URL in the sources
# uses this; at build time it is rewritten to whatever partials/site.json says
# the site is really served from. Old origins stay in the list so switching
# back and forth keeps working - a page already built for one host still gets
# normalised to the next.
SOURCE_ORIGIN = "https://dep2go.com"
KNOWN_ORIGINS = [SOURCE_ORIGIN, "https://dep2-go.vercel.app"]


def site_origin() -> str:
    """Where the built site will actually live."""
    f = PARTIALS / "site.json"
    if not f.exists():
        return SOURCE_ORIGIN
    return json.loads(f.read_text(encoding="utf-8"))["origin"].rstrip("/")


def retarget(text: str, origin: str) -> str:
    """Point every absolute URL at the serving origin."""
    for known in KNOWN_ORIGINS:
        if known != origin:
            text = text.replace(known, origin)
    return text


def load(name: str) -> str:
    return (PARTIALS / f"{name}.html").read_text(encoding="utf-8").rstrip("\n")


def region(html: str, tag: str, replacement: str) -> str:
    """Replace the text between <!-- @tag --> and <!-- /@tag -->."""
    pattern = re.compile(
        rf"(<!--\s*@{tag}\s*-->)(.*?)(<!--\s*/@{tag}\s*-->)", re.S
    )
    if not pattern.search(html):
        raise SystemExit(f"  !! missing <!-- @{tag} --> marker")
    return pattern.sub(lambda m: m.group(1) + "\n" + replacement + "\n" + m.group(3),
                       html, count=1)


def header_for(src: str, active: str) -> str:
    """Mark the current page's nav item."""
    if not active:
        return src
    return src.replace(f'data-nav="{active}"',
                       f'data-nav="{active}" aria-current="page"', 1)


def sidebar_for(src: str, ticket: str, show_form: bool) -> str:
    """Fill the ticket number and honour the show-form flag."""
    out = src.replace("{{TICKET}}", ticket)
    block = re.compile(r"[ \t]*<!--\s*#if sidebar-form\s*-->.*?<!--\s*/if\s*-->\n?", re.S)
    if show_form:
        # keep the contents, drop the marker comments
        out = out.replace("<!-- #if sidebar-form -->\n", "")
        out = re.sub(r"[ \t]*<!--\s*/if\s*-->\n", "", out)
    else:
        out = block.sub("", out)
    return out


def main() -> int:
    pages = json.loads((PARTIALS / "pages.json").read_text(encoding="utf-8"))
    origin = site_origin()
    if origin not in KNOWN_ORIGINS:
        KNOWN_ORIGINS.append(origin)
    header, footer, sidebar = load("header"), load("footer"), load("sidebar")
    pillrow, schema = load("pillrow"), load("schema")

    changed = 0
    for name, cfg in pages.items():
        path = ROOT / name
        if not path.exists():
            print(f"  !! {name} not found")
            return 1
        before = path.read_text(encoding="utf-8")
        html = region(before, "header", header_for(header, cfg["active"]))
        html = region(html, "sidebar",
                      sidebar_for(sidebar, cfg["ticket"], cfg["sidebarForm"]))
        html = region(html, "pillrow", pillrow)
        html = region(html, "pillrow2", pillrow)
        html = region(html, "schema", schema)
        html = region(html, "footer", footer)
        html = retarget(html, origin)
        if html != before:
            path.write_text(html, encoding="utf-8")
            changed += 1
        print(f"  {name}")

    # robots.txt and sitemap.xml carry absolute URLs too
    for name in ("robots.txt", "sitemap.xml"):
        f = ROOT / name
        if not f.exists():
            continue
        text = f.read_text(encoding="utf-8")
        out = retarget(text, origin)
        if out != text:
            f.write_text(out, encoding="utf-8")
            print(f"  {name}")
            changed += 1

    print(f"\n{len(pages)} pages processed, {changed} updated.")
    print(f"serving origin: {origin}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
