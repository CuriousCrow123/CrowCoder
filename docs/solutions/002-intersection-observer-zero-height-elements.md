---
title: "IntersectionObserver fails on zero-height elements with threshold > 0"
category: frontend-issues
tags: [intersection-observer, scroll-trigger, client-visible, astro-hydration, popup]
module: scroll-observer
symptom: "Scroll-triggered popups never appear — user scrolls to quiz section but nothing happens"
root_cause: "IntersectionObserver with threshold 0.3 cannot detect a 0-height target element"
---

# IntersectionObserver Fails on Zero-Height Elements

## Symptom

Scroll-triggered quiz popups never appeared for users. The first quiz (near the viewport on page load) would sometimes work, but quizzes further down the page never triggered regardless of scroll speed or wait time.

Automated Playwright tests with controlled scrolling masked the issue because they scrolled slowly and paused at exact positions, giving the first quiz (which auto-triggered near the viewport) time to appear.

## Root Cause

The scroll observer (`scroll-observer.ts`) used `IntersectionObserver` with `threshold: 0.3` to detect when quiz containers entered the viewport. However, the observed element (`.popup-container`) had **0 height** when the popup was inactive — it was an empty div waiting to be filled with quiz content.

A zero-height element cannot satisfy a 30% visibility threshold. The observer's `isIntersecting` was never `true` for these elements, so the callback never fired and the popup never opened.

### Why the first quiz sometimes worked

The first quiz was positioned close enough to the initial viewport (~499px from top, viewport height 800px) that Astro's `client:visible` hydration triggered it immediately on page load. By the time the scroll observer registered, the popup had already been requested through a different code path, giving the container height from the quiz content.

### The double-observer trap

This architecture has TWO IntersectionObservers in sequence:
1. **Astro's `client:visible`** — observes astro-island children to decide when to hydrate
2. **Our scroll observer** — observes the popup-container to decide when to open

Astro's observer works because it observes the astro-island's children (which include the sr-only div with 1px height). But our observer targets the popup-container specifically, which has 0 height until content is injected.

## Fix

Two changes:

1. **Lower threshold from 0.3 to 0** in `scroll-observer.ts` — any intersection triggers the callback. The 1-second grace period already prevents premature activation during fast scrolling, so the threshold was redundant protection.

2. **Add `min-height: 1px` to `.popup-container`** in `Popup.svelte` — ensures the container always has a non-zero bounding rect for the IntersectionObserver to detect, even when empty.

## Verification

Before fix (fast scroll test): 1 of 4 quizzes appeared
After fix (fast scroll test): 2 of 4 quizzes appeared
After fix (scroll to each quiz): 4 of 4 quizzes appeared

## Lessons

1. **Never observe dynamically-sized containers with threshold > 0.** If an element starts empty and gets content injected later, use `threshold: 0` or ensure the element always has minimum dimensions.

2. **Test with realistic scroll behavior.** Playwright's programmatic scrolling doesn't match real users. Fast-scroll tests and "scroll to element + immediate check" tests are more representative than "scroll to element + wait 3 seconds."

3. **`client:visible` hydration adds a timing layer.** Components using `client:visible` hydrate asynchronously after entering the viewport. Any post-hydration observers start late — the element may have already scrolled past by the time the observer registers. Design observer logic to handle "element was visible but isn't anymore" gracefully.

4. **The grace period was solving the wrong problem.** The 1-second grace period + 30% threshold was meant to prevent triggering during fast scrolling. But the grace period alone is sufficient — it cancels if the element leaves the viewport. The threshold added fragility without benefit.
