# Direct Equipment Parts — static site

Plain HTML, CSS and JavaScript. No build step, no framework, no dependencies.
Open any `.html` file in a browser and it works.

## Publishing to GitHub Pages

Push the contents of this folder to a repository, then **Settings → Pages →
Source: Deploy from a branch**, branch `main`, folder `/ (root)`.

Every path in the site is **relative**, so it works both at a user site
(`https://you.github.io/`) and at a project site
(`https://you.github.io/repo-name/`) with no configuration.

`.nojekyll` is included. GitHub Pages runs Jekyll by default, which silently
skips files and folders whose names begin with `_` or `.` — that file turns it
off. Leave it in place.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `about.html` | About |
| `services.html` | Services |
| `blog.html` | Blog index |
| `contact.html` | Contact / request a part |
| `hiring.html` | Hiring |
| `post-hard-to-find-parts.html` | Post — sourcing discontinued parts |
| `post-oem-vs-aftermarket.html` | Post — OEM vs. aftermarket |
| `post-same-day-delivery.html` | Post — same-day delivery |

## Layout

```
assets/css/industry.css   design-system tokens and components
assets/css/dep.css        brand overrides, responsive rules, hover/focus states
assets/js/dep.js          sticky nav, mobile menu, form handling
assets/img/               logo + photographs
partials/                 shared header, sidebar, footer (see below)
build.py                  re-injects the partials into every page
```

## Editing

**Page content** — edit the `.html` file directly. Nothing to rebuild.

**Header, footer or sidebar** — these appear on all nine pages, so they live in
`partials/`. Edit the partial, then run:

```bash
py build.py
```

(`py` on Windows; `python3` on macOS and Linux. Python 3.8+, no packages needed.)

That rewrites the region between the `<!-- @header -->` … `<!-- /@header -->`
markers in each page and leaves everything else alone. It is safe to re-run.

Per-page settings live in `partials/pages.json`:

- `active` — which nav item gets `aria-current="page"`
- `ticket` — the sidebar's request-ticket number
- `sidebarForm` — `false` on Contact and Hiring, which already have their own
  request form, so the sidebar omits the duplicate

## Forms

The forms validate and show a confirmation entirely in the browser — **nothing
is sent anywhere**. That matches the original design, which was a prototype. To
collect real submissions, point each `<form>` at a handler (Formspree, Netlify
Forms, a Google Form, or your own endpoint) and remove the matching
`data-request-form` / `data-apply-form` / `data-subscribe-form` hook so
`assets/js/dep.js` stops intercepting the submit.

## Browser support

Modern evergreen browsers. The scroll-reveal animation uses
`animation-timeline: view()` and degrades to always-visible where unsupported.
`prefers-reduced-motion` is respected throughout.
