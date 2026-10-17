# UI guidelines

The interface aims to be calm and easy to scan: price and address first, restrained color, no
decorative motion, and controls placed where the device makes them easy to reach.

## Visual design

### Color tokens

All colors are CSS custom properties defined at the top of
[`frontend/src/index.css`](../frontend/src/index.css). Components use tokens, never literal
colors.

| Token          | Light     | Dark      | Use                                             |
| -------------- | --------- | --------- | ----------------------------------------------- |
| `--background` | `#f5f8fb` | `#10212c` | Page background                                 |
| `--surface`    | `#ffffff` | `#192e3c` | Cards, panels, dialogs                          |
| `--text`       | `#122f40` | `#f0f6fa` | Primary text                                    |
| `--muted`      | `#52687a` | `#bdcdd8` | Secondary text                                  |
| `--line`       | `#dce5eb` | `#3c5262` | Borders and dividers                            |
| `--primary`    | `#ffbb8d` | `#ffbb8d` | Primary buttons, selected controls, logo accent |
| `--on-primary` | `#123c4d` | `#123c4d` | Text and icons on `--primary`                   |
| `--teal`       | `#006b73` | `#8de0df` | Links and informational icons                   |
| `--danger`     | `#a52e25` | `#ffb3a8` | Validation errors                               |

- The orange accent is identical in both themes. Primary actions always use orange with navy
  text; secondary actions use neutral surfaces.
- Color is never the only signal of a state: selected controls also change shape or text
  (`aria-pressed`, a check, a count badge).

### Typography and content

- System font stack (Inter when installed, then the platform UI font), 14 px base size.
- Prices use the largest type on cards and detail headers. Numbers use US formatting
  (`$750,000`, `1,248 homes`).
- Copy uses plain, task-focused language: "Search", "Show homes", "Try again", "Return to first
  page". Error messages say what happened and what to do next.

### Themes

A switch in the header toggles light and dark. Until a visitor chooses, the theme follows the
operating system. Switching theme changes only CSS tokens; the current search, page, gallery
position and scroll position are kept.

## Layouts

The layout is chosen by viewport, not by device detection.

| Viewport                                             | Name    | Search and filters                                                                                               | Pagination and actions                                 |
| ---------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| ≥ 1360 px wide                                       | Wide    | Sticky toolbar (location, Search, Sort); filter sidebar always visible                                           | Below the results, with a "Showing x–y of n" range     |
| 900–1359 px wide                                     | Desktop | Sticky toolbar with a Filters toggle; sidebar can be hidden, and the grid switches between two and three columns | Below the results                                      |
| < 900 px wide, or < 500 px tall with a touch pointer | Compact | **Search & filters** button opens a bottom sheet with location, filters and sort                                 | Bottom action bar with search button and page controls |

Compact detail pages keep **Back to listings** and **Photos** in the bottom bar. On compact
layouts open houses follow the property facts; on desktop they sit in a side column.

All layouts work from 320 px wide without horizontal page scrolling, and bottom bars respect
device safe areas.

## Components

| Component      | Behavior                                                                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location input | Combobox following the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): focus stays in the input, Arrow keys move through suggestions, Enter chooses, Escape closes the list before closing a surrounding sheet.   |
| Filter sheet   | Native `dialog` with focus trapped inside, Escape to close, background scroll locked, focus returned to the opening button. **Cancel** and **Show homes** sit at the lower edge.                                                                   |
| Property card  | One native link to the detail page, so middle-click, new tab and keyboard navigation behave as expected. Shows a home-type badge only when a type is known.                                                                                        |
| Photo gallery  | Horizontal scroll snapping with a numeric counter ("3 / 12"), previous and next buttons, and keyboard arrows. No autoplay and no dot indicators. The full-screen viewer puts controls in the bottom bar on phones and beside the image on desktop. |
| Result states  | Shared `ResultState` component: icon, heading, one sentence, and recovery actions.                                                                                                                                                                 |
| Pagination     | Page numbers with previous and next on desktop; "page / total" with previous and next on compact layouts. Disabled while loading or when no results exist.                                                                                         |

## Motion

There are no scroll-triggered animations, parallax, autoplay or decorative transitions. Under
`prefers-reduced-motion: reduce`, smooth scrolling is turned off.

## Accessibility checklist

- Every control has a visible label or an accessible name.
- Visible focus indicator on every interactive element; a "Skip to content" link starts each page.
- Headings follow page structure; result totals are announced through a polite live region.
- Loading states use `role="status"`; failures use `role="alert"`.
- Dialogs have a labelled title, trap focus and restore it on close.
- Images have meaningful `alt` text; failed images fall back to a labeled placeholder.
- Automated axe checks for WCAG 2.0/2.1 A and AA run in the Playwright suite on results and
  dialogs, in both themes.
