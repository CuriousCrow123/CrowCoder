---
title: "CSP blocks Zod v4 in Brave — all Svelte islands fail to hydrate"
category: browser-issues
tags: [csp, zod, brave, hydration, security, vite, module-cache]
module: types
symptom: "All interactive Svelte components render as static HTML in Brave — quizzes, progress bar, and export/import are non-functional"
root_cause: "Zod v4 uses new Function() for schema compilation, blocked by CSP script-src without 'unsafe-eval'; Brave enforces meta-tag CSP strictly unlike Chrome"
---

# CSP Blocks Zod v4 in Brave

## Symptom

All interactive Svelte components (quizzes, progress bar, export/import) rendered as static HTML in Brave browser. Event handlers did not fire, `bind:group` and `bind:value` had no effect. The page looked correct but nothing was interactive.

Other Chromium browsers (Chrome, Playwright headless Chromium) worked fine on the same dev server.

Brave DevTools console showed:

```
The Content Security Policy (CSP) prevents the evaluation of arbitrary strings
as JavaScript to make it more difficult for an attacker to inject unauthorized
code on your site.

Source location: zod.js?v=cacefc85:812
Directive: script-src
Status: blocked
```

## Root Cause

Three factors combined to produce this failure:

1. **Zod v4 uses `new Function()` internally.** Zod's schema compilation uses runtime code generation (`new Function()`) as a performance optimization. This requires the `'unsafe-eval'` CSP directive.

2. **The project's CSP meta tag omitted `'unsafe-eval'`.** The `<meta>` tag in `src/layouts/Base.astro` had `script-src 'self' 'unsafe-inline'` — sufficient for inline scripts but not for `new Function()`.

3. **Brave enforces meta-tag CSP strictly; Chrome does not.** Chrome is lenient about enforcing CSP delivered via `<meta>` tags on `localhost` dev servers. Brave enforces them regardless of origin. This meant the bug was invisible in Chrome and in Playwright's default Chromium.

### Cascade path

The CSP violation in Zod caused a cascading import failure:

```
src/lib/types.ts (Zod schemas)
  → src/lib/persistence.ts (imports types.ts)
    → src/lib/state/progress.svelte.ts (imports persistence.ts)
      → Quiz.svelte, ProgressBar.svelte, ExportImport.svelte (import progress state)
```

Every component that transitively imported Zod schemas failed to initialize, killing all interactivity.

## Fix

Added `'unsafe-eval'` to the CSP `script-src` directive in `src/layouts/Base.astro`:

```html
<!-- BEFORE -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ..." />

<!-- AFTER -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; ..." />
```

## Verification

1. **Playwright with Brave executable.** Launched Playwright using Brave's actual binary (`/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`) in headless mode. All components hydrated and functioned correctly after the fix.

2. **Brave Private Window.** Opened the dev server in a Private Window (no cached modules). All components worked immediately.

3. **Brave with stale cache.** A normal Brave window with stale module cache still failed after the fix until the cache was cleared. Hard refresh (`Cmd+Shift+R`) was insufficient — full cache clear via `brave://settings/clearBrowserData` (Cached images and files) was required.

### Why hard refresh was not enough

Brave caches individual ES module imports by URL. A hard refresh reloads the top-level page but does not necessarily bust the cache for every `import` in the module graph. The failed Zod module was cached with its error state, and Brave continued serving it from cache even after the CSP directive changed.

## Lessons

1. **Know your dependencies' runtime requirements.** Zod v4's use of `new Function()` is not documented prominently. Libraries that compile schemas, templates, or expressions at runtime often need `'unsafe-eval'`. Audit dependencies when setting CSP policy.

2. **Test in strict browsers.** Chrome's lenient CSP enforcement on localhost creates a false sense of security. Brave and Firefox enforce CSP more strictly. Include at least one strict browser in the test matrix.

3. **CSP failures cascade silently through module graphs.** When a mid-graph module fails to load due to CSP, every downstream module fails too. The console error points to the source (Zod), but the visible symptom (broken UI) is far removed. Check the console first when components render but don't hydrate.

4. **Module cache can outlive the fix.** Brave's aggressive ES module caching means that fixing the server-side CSP header/meta tag is not enough — users with cached modules need to clear their cache or use a Private Window.

## Prevention

- CLAUDE.md updated: CSP directive now includes `'unsafe-eval'` for Zod v4 compatibility
- When adding dependencies that use runtime code generation (schema compilers, template engines, expression parsers), verify CSP compatibility before committing to the library
- Consider testing the production build in Brave as part of the manual QA checklist

## Related

- `src/layouts/Base.astro` — CSP meta tag
- `src/lib/types.ts` — Zod v4 schemas that trigger `new Function()`
- MDN: [Content Security Policy — unsafe-eval](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_eval)
