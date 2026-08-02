# Import notes — Direct Equipment Parts Website

Imported from Claude Design project `dfeafd10-33e1-4181-a524-c44709b7620a`
on 2026-08-02.

**Status: complete.** All 28 project paths are present and intact.

## How it was assembled

Text files (HTML, CSS, JS, Markdown, JSON) were pulled through the
`claude_design` MCP (`DesignSync.get_file`).

`DesignSync.get_file` caps each response at 256 KiB with no range/offset
parameter, so five large binaries came back clipped. Those were replaced from
the project's own export at
`C:\Users\paced\Downloads\Direct Equipment Parts Website\`:

| File | Now | Was (clipped) |
| --- | --- | --- |
| `dep-logo-mark.png` | 969,118 B — 1844×853 | 196,608 B, no `IEND` |
| `uploads/Untitled design (2).png` | 969,118 B — 1844×853 | 196,608 B, no `IEND` |
| `dep-logo.png` | 300,611 B — 837×387 | 196,608 B, no `IEND` |
| `uploads/screencapture-conequip-…png` | 4,640,242 B — 1920×4657 | 196,608 B, no `IEND` |
| `.image-slots.state.json` | 1,626,980 B — all 11 slots | 218,742 B, 2 slots |

`support.js` and `image-slot.js` were also replaced from the export. They had
been written by a helper script that read the API response with the system ANSI
codepage instead of UTF-8, which turned every em-dash in their comments into
mojibake. Content was otherwise identical; only those two files were affected
(the rest were written directly, and the binaries are base64 and so ASCII-safe).

## Verified

- **All 28 files are SHA-256 identical to the project's own export.**
- All 28 expected paths present.
- All four PNGs carry a valid `IEND` chunk; JPEG and WebP trailers valid.
- All three JSON files parse; `.image-slots.state.json` holds all 11 slots:
  `dep-hero-request`, `dep-hero-person`, `dep-hero-delivery`, `dep-why-video`,
  `dep-about-shop`, `dep-blog-1/2/3`, `dep-post1/2/3-hero`.
- All 12 `.dc.html` pages: correct doctype, closing `</html>`, balanced `<x-dc>`.
- Served over HTTP and loaded `Home.dc.html`: page renders, and every
  `<image-slot>` shows its real photograph from the restored sidecar.
- `dep-logo-mark.png` fetches `200 image/png`, 969,118 B, and decodes in-browser
  to 1844×853.

## Logo

`Header.dc.html:29` and `Footer.dc.html:36` both reference `dep-logo-mark.png`.
That is the DEP excavator-and-track-pad lockup, and it is now the complete file,
so both render correctly with no markup change. The PNG has a transparent
background; the header sizes it `height:clamp(66px,10vw,140px)` on white, the
footer `height:130px` on the dark navy band.

## Known limitation: React is not bundled

`support.js` (the dc-runtime) requires `window.React` and `window.ReactDOM`,
which the pages never load — the Claude Design host supplies them. Serving this
folder as plain static files therefore renders the page body and the image
slots, but **`<dc-import>` components do not mount**, so the shared Header,
Footer and Sidebar are absent, along with `sc-if` blocks and `{{ }}` bindings.

This is a property of the exported format, not of the import — the byte-identical
official export behaves the same way. To deploy outside the Design app you would
need to load React and ReactDOM before `support.js`, or flatten the components
into each page.

## Layout

```
Home / About / Services / Blog / Contact / Hiring   page entry points
Post-*.dc.html                                      three blog posts
Header / Footer / Sidebar .dc.html                  shared components (dc-import)
dep.css                                             brand token overrides
support.js                                          dc-runtime (generated)
image-slot.js                                       <image-slot> component
.image-slots.state.json                             slot photos, inline base64 webp
_ds/industry-.../                                   Industry design system
uploads/                                            source assets
```

Serve over HTTP rather than `file://` — the sidecar is fetched
document-relative and local-file CORS rules will block it.
