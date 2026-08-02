#!/usr/bin/env python3
"""Re-inject the shared header / sidebar / footer into every page.

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
    header, footer, sidebar = load("header"), load("footer"), load("sidebar")

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
        html = region(html, "footer", footer)
        if html != before:
            path.write_text(html, encoding="utf-8")
            changed += 1
        print(f"  {name}")

    print(f"\n{len(pages)} pages processed, {changed} updated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
