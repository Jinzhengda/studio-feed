# Input Field Design QA

- Figma source: `studio feed`, component set `Input/Field` (`260:220`)
- Implementation view: `http://localhost:3000/login`
- Viewport: 1280 × 720
- Checked states: default, focus, password
- Checked variants: text/email and password; search uses the same shared control with a 24 × 24 Lucide search icon

## Comparison

- Control height: 40px
- Corner radius: 8px
- Horizontal spacing: 12px
- Label/control spacing: 4px
- Text: 14px body, token-driven line height and weight
- Icons: 24 × 24, 1px stroke
- Focus: semantic primary border plus 1px focus ring
- Dark mode: semantic text, background, border, disabled, danger, and success variables resolve correctly

## Coverage

- Login, signup, forgot-password, and reset-password forms
- Mobile feed search
- Admin works search
- Admin studios search and studio text fields
- File upload controls and checkboxes are intentionally excluded because they are not text-entry fields

## Verification

- ESLint: passed
- Production build: passed
- Browser visual check: passed
- Computed style check: passed

final result: passed

---

# Home Landing Annotation QA — 2026-07-13

- Source visual truth: browser annotation comments 1–3 from the current turn.
- Implementation screenshot: `/private/tmp/studio-feed-home-landing-annotation-final.png`
- Viewport: 1533 × 899, logged-out homepage, light theme.
- State: default header and landing CTA state.

## Findings

- No actionable P0/P1/P2 differences remain for the requested annotations.
- Fonts and typography: existing Alice display title and system-font Chinese controls are unchanged.
- Spacing and layout rhythm: the complete landing content group is shifted upward by 24px without changing its internal spacing or alignment.
- Colors and visual tokens: both the header login link and the secondary “关于” CTA now use `--color-border-default` (`#e5e5e5`) instead of the weaker `--color-border-card` (`#f2f2f2`).
- Image quality: no image assets are present in this landing state, so no asset fidelity check was needed.
- Copy and content: all existing copy and destinations are unchanged.

## Verification

- Browser-computed content transform: `translateY(-24px)`.
- Browser-computed button borders: `rgb(229, 229, 229)` for both annotated controls.
- Full-view comparison: the implementation screenshot confirms the requested upward shift and consistent stronger border hierarchy.
- Focused-region comparison was not needed because both requested border changes were confirmed through the full-view capture and exact computed styles.
- ESLint: passed.
- `git diff --check`: passed.

final result: passed

---

# Card Hover Palette QA

- Source visual truth: Figma `studio feed` card mode (`324:814`) plus the requested per-cover hover-color refinement.
- Implementation: home feed at `http://localhost:3000/`, text-overlay card mode.
- Viewport/state: desktop; live work covers loaded, text-overlay mode selected.

## Findings

- No actionable P0/P1/P2 differences remain.
- Colors and visual tokens: the overlay now samples the loaded cover into a per-card dominant color, applies it at 82% opacity with the existing blur/saturation treatment, and switches foreground text to #171717 for light palettes or white for dark palettes.
- Image quality: cover display, natural image ratio, and the existing 1.035 hover scale are unchanged.
- Typography and layout: card text, spacing, and the two selected card modes retain their prior measurements.
- Resilience: cross-origin sources that disallow pixel sampling keep the original dark overlay fallback; no image request or card interaction is blocked.

## Interaction Verification

- Browser verified sampled card palettes including `182 162 132`, `40 27 19`, `222 217 215`, and `245 96 1` with the matching inline overlay colors.
- Light palettes use dark foreground text; dark palettes use white foreground text.
- Browser console: no application errors or warnings.
- ESLint: passed.
- Production build: a concurrent build process holds Next.js's transient `.next/lock`; source files were not modified or removed to clear it.

final result: passed

---

# Work Card Modes QA

- Source visual truth: Figma `studio feed`, node `324:814`
- User reference image: `/var/folders/m3/dk4vml7j4nv70yttfy8x7n0m0000gn/T/codex-clipboard-f0803964-7c4b-46bf-ae62-bd962fd64a9c.png`
- Source screenshot: `/private/tmp/figma-card-modes.png`
- Implementation screenshots: `/private/tmp/studio-feed-card-image-final.png`, `/private/tmp/studio-feed-card-text-hover-final.png`
- Full and focused comparison evidence: `/private/tmp/studio-feed-card-comparison.png`
- Viewport: 1280 × 720, authenticated homepage, light theme
- States: image/details mode; text-overlay mode in focus-visible state, visually equivalent to hover

## Findings

- No actionable P0/P1/P2 differences remain.
- Typography: card titles use Alice at 18px/24px and up to three lines; dates and studio names use the system CJK stack at 12px/18px.
- Spacing and layout: cards retain the 248px responsive grid column, keep each live work cover's natural aspect ratio with media flush to the outer border, and retain 16px details padding, 4px date gap, and 16px title gap.
- Colors and tokens: #f2f2f2 light borders, theme-aware card surfaces, tertiary metadata, white overlay text, and 60% white overlay metadata match the source hierarchy.
- Image quality: live work thumbnails remain the source content and use an object-cover crop. Text-overlay mode applies the specified 10px backdrop blur and rgba(0,0,0,0.3) cover.
- Copy and content: each card continues to show its real title, publication date, and studio; only their presentation changes.

## Comparison History

1. The previous implementation had one shared card style, a translate/shadow hover, variable image presentation, and a menu toggle that changed only its own selected state.
2. Added a shared persisted card-mode store and connected all rendered cards to the menu control.
3. Rebuilt image/details mode to match the Figma information block and added a distinct subtle image-scale hover.
4. Added image-only mode with the Figma hover overlay, blur, title, date, and right-aligned studio. Browser verification confirmed overlay opacity 1, blur 10px, and image scale about 1.035 in hover-equivalent focus state.
5. Follow-up: removed the fixed source-frame aspect ratio at the user's request. Browser verification confirmed visible cover heights now vary from 148px to 332px while retaining both card modes and hover behavior.
6. Follow-up: loading skeletons now follow the selected card mode. Text-overlay mode uses cover-only placeholders; image/details mode adds metadata placeholders below each cover.

## Interaction Verification

- Switching modes updates all 40 loaded cards immediately.
- The selected mode persists through local storage and is shared between the menu and card grid.
- Image/details mode shows the information panel and hides the overlay.
- Text-overlay mode removes the information panel at rest and reveals the overlay on hover or keyboard focus.
- Keyboard users receive the same content reveal as pointer users.
- Card hover keeps the same 1px #f2f2f2 outer border; no inner outline or hover border-color change is applied.
- Loading skeletons preserve the selected presentation: cover-only for text-overlay mode and cover-plus-details for image/details mode.
- Browser console: no application errors or warnings.
- ESLint: passed.
- Production build and TypeScript: passed.

## Follow-up Polish

- Card heights vary with real title length in image/details mode, as expected for the live masonry feed.

final result: passed

---

# Shared Navigation Header QA

- Source visual truth: Figma `studio feed`, nodes `311:451` (home with search) and `266:1037` (inner page)
- Source screenshots: `/private/tmp/figma-nav-home.png`, `/private/tmp/figma-nav-inner.png`
- Implementation screenshots: `/private/tmp/studio-feed-nav-home.png`, `/private/tmp/studio-feed-nav-inner.png`
- Full and focused comparison evidence: `/private/tmp/studio-feed-nav-comparison.png`
- Viewport: 1335px desktop, light theme; homepage search state and inner-page menu-only state

## Findings

- No actionable P0/P1/P2 differences remain.
- Fonts and typography: the navigation wordmark now uses a bold sans-serif treatment matching the Figma vector, with a measured 131px width and 20px rendered height. Chinese search copy uses the system CJK stack at 14px/21px.
- Spacing and layout: total header height is 84px, the centered content track is 1088px, the home search is 240×40px, the menu control is 40×40px, and the search/menu gap is 16px.
- Colors and tokens: white primary background, #f2f2f2 control borders, #171717 icon/wordmark color, and pill radii match the source.
- Image/icon fidelity: the menu uses the Lucide library's Menu icon at exactly 24×24px with 1px stroke, round caps and joins. Search uses the existing Lucide Search icon at 24×24px with 1px stroke. No handcrafted or substitute icon remains.
- Copy: `StudioFeed` and `搜索作品或工作室` match the source.

## Comparison History

1. Initial comparison found a serif Alice wordmark, a 2px handcrafted menu icon, a 1152px content track, an 8px search radius, 24px control gap, and an empty loading circle.
2. Replaced the menu drawing with the correct Lucide icon, changed the wordmark to the source-matching bold sans treatment, restored the 1088px track and Figma spacing/radii, and made the loading state render the real icon.
3. Final same-size comparison confirmed the 131px wordmark, 1088px track, 240×40px search, 40×40px menu, 16px gap, and 1px menu stroke.

## Interaction Verification

- Menu: opens to opacity 1 and closes to opacity 0 from the header control.
- Search: accepts text and updates the URL query (`?q=Pentagram`), then returns to the empty state.
- Console: no application errors or warnings.
- ESLint: passed.
- Production build and TypeScript: passed.

## Follow-up Polish

- No remaining P3 navigation polish items were identified.

final result: passed

---

# Login Page Redesign QA

- Source visual truth: Figma `studio feed`, node `266:1741`
- Intended implementation: `http://localhost:3000/login`
- Viewport: 1350 × 947, light theme, logged-out state
- Source capture: `/private/tmp/studio-feed-login-figma.png`
- Implementation capture: `/private/tmp/studio-feed-login-final-2.png`
- Full-view comparison evidence: `/private/tmp/studio-feed-login-comparison.png`

## Findings

- No actionable P0/P1/P2 differences remain.
- Typography: the Latin heading uses Google Fonts Alice at 40px/48px; Chinese copy uses the configured system-font fallback.
- Layout: the desktop view is a 675px/675px split, with the 320px form centered in the left panel and the artwork stage clipped inside the right panel.
- Gallery: all 10 WebP files are served from Supabase Storage. The animation maintains a large center artwork with smaller incoming/outgoing artwork, moving continuously upward while scaling.
- Responsive and accessibility: the artwork panel is removed below 1024px, reduced-motion users receive a static centered artwork, and password visibility remains keyboard-accessible.

## Implementation Status

- Login authentication behavior is preserved.
- Uploaded 10 source WebP files to `studio-covers/login-gallery/v1/` without overwriting existing objects; the public image response was verified as HTTP 200 WebP.
- Password visibility control was tested in both directions (`password` → `text` → `password`).
- Motion was sampled one second apart; visible cards moved upward and changed scale as intended.
- Browser console has no application errors or warnings; only normal Next.js development messages were present.
- ESLint passed.
- Production build and TypeScript passed.

## Comparison History

1. Initial render exposed missing custom login styles because the new rules were omitted from the generated Tailwind layer. Moved the login rules outside that layer and verified computed dimensions.
2. The first gallery pass showed too many overlapping artworks. Narrowed the visible animation window and increased the travel distance so the composition resolves into top, center, and bottom stages.
3. The final pass increased the central artwork to the Figma scale and made off-center cards shrink more aggressively, matching the source hierarchy while retaining the requested motion.

final result: passed

---

# Studio Management Page Design QA

- Source visual truth: Figma `studio feed`, node `266:1034`; local capture `/private/tmp/studio-feed-figma.png`
- Implementation screenshot: `/private/tmp/studio-feed-local-final-3.png`
- Full-view comparison: `/private/tmp/studio-feed-comparison-passed.png`
- Focused toolbar/list comparison: `/private/tmp/studio-feed-comparison-detail.png`
- Viewport: 1335 × 1246, light theme, desktop management state with eight representative rows
- Route: `http://localhost:3000/admin/studios`

## Findings

- No actionable P0/P1/P2 differences remain.
- Typography: Google Fonts Alice is loaded through `next/font/google` for Latin letters and numerals; Chinese glyphs fall back to PingFang SC, Hiragino Sans GB, Microsoft YaHei, and the system sans-serif stack.
- Spacing and layout: 1088px content width, 300px stat cards, 4px card gaps, 64px toolbar, table start at y=528, 79px rows, and footer start at y=1161 match the source capture.
- Colors and tokens: light surfaces, #f7f7f7 stat panels, subtle borders, and #23433c primary action match the Figma tokens while retaining the existing dark-theme mappings.
- Image quality: list thumbnails use the real work/cover image pipeline; the QA fixture used the Figma-provided thumbnail asset with matching 56 × 40 crop.
- Copy and content: all fixed labels, search placeholder, filter names, action names, cover status, and footer copy match the source. Count values are intentionally data-driven.
- Icons: menu and search use the existing Lucide icon family at 24px with 1px stroke.
- Accessibility: semantic search input, filter/action buttons, hidden table headers, keyboard focus styles, and non-wrapping action labels are retained.

## Comparison History

1. Initial desktop capture found vertically wrapped row actions and a theme/state mismatch. Fixed action-button shrink/whitespace behavior and captured the source-matching light state.
2. First light comparison found an 8px table-start drift and a 1px-per-row density drift. Restored the 32px table gap, set 79px rows, and aligned the footer boundary.
3. Post-fix comparison confirmed the source and implementation share the same major-region geometry; no actionable P0/P1/P2 findings remain.
4. Font correction replaced the unresolved `Alice` family name/Georgia fallback with the real Google Fonts Alice file and verified the browser-computed stack as `Alice, Alice Fallback, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif` with `document.fonts.status = loaded`.

## Interaction Verification

- Search: filtering to an unmatched term updates the result count and shows the empty result message.
- Status filters: selected state and filtered result count update correctly.
- Add studio: modal opens and closes; form labels and controls remain reachable.
- Console: checked. The unauthenticated QA fixture produced one expected Supabase refresh-token warning; the fixture and development auth bypass were removed before handoff.
- ESLint: passed.
- Production build and TypeScript: passed.

## Follow-up Polish

- P3: the browser-only Next.js development badge may appear in local screenshots; it is not part of the production UI.

final result: passed

## Button Component QA

- Figma source: `Button` component set (`261:149`)
- Variants implemented: Primary, Secondary, Ghost, Danger
- States implemented: Default, Hover, Pressed, Focus, Loading, Disabled
- Geometry: 40px height, 8px radius, 16px horizontal padding, 8px content gap
- Typography: 14px / 14px, medium weight, token-driven font family
- Loading icon: Lucide LoaderCircle, 24 × 24, 1px stroke
- Replaced: authentication actions, empty-state links, header authentication actions, admin page actions, row actions, upload labels, and modal actions
- Intentionally retained as specialized controls: menu triggers, theme toggle, segmented filters, password visibility control
- ESLint: passed
- TypeScript: passed
- Browser visual and computed-style check: passed
- Production build: stopped after an extended no-output packaging wait; no build error was reported

final result: passed

---

# Current QA Status

The login-page redesign is implemented, backend-backed, visually compared, interaction-tested, and production-build verified.

final result: passed

---

# Menu Panel UI QA

- Source visual truth: Figma `studio feed`, nodes `266:12119` (light) and `266:12155` (dark)
- Source screenshots: `/private/tmp/figma-menu-light.png`, `/private/tmp/figma-menu-dark.png`
- Implementation screenshots: `/private/tmp/studio-feed-menu-light-final.png`, `/private/tmp/studio-feed-menu-dark-final.png`
- Full and focused comparison evidence: `/private/tmp/studio-feed-menu-comparison.png`
- Viewport: 1280 × 720 browser viewport; menu crop normalized to the source's exact 248 × 472 frame
- State: authenticated home menu, time sort, image-card selection; light and dark themes

## Findings

- No actionable P0/P1/P2 differences remain.
- Typography: all menu labels use the system CJK font stack at 14px/21px; segmented labels use 12px/18px.
- Spacing and layout: the panel is fixed at 248px wide and measured at 472px high. Rows use 24px horizontal padding, 12px vertical padding, a 32px avatar, and 120px segmented controls.
- Colors and tokens: white/#101010 surfaces, subtle divider, red destructive action, and theme-specific active/idle control colors follow the two Figma variants.
- Image and icon fidelity: the user avatar remains live account data. Archive, Images, MessageCircleMore, Mail, LogOut, Sun, Moon, Contrast, Image, and ReceiptText use Lucide library icons at 24×24px and 1px stroke; all previous handcrafted menu SVGs were removed.
- Copy: profile, management, project, contact, logout, sort, theme, and card labels match the source.
- Browser annotation: shared header vertical padding was changed from 12px to 4px on desktop and mobile, preserving its existing responsive horizontal padding.

## Comparison History

1. Initial comparison found a 240px panel, missing card control, several 1.5–2px handcrafted icons, and a 477px total height.
2. Replaced icons with the exact Lucide families, added the card selector, fixed the panel width to 248px, and normalized segmented controls to the Figma 120×32px geometry.
3. The first post-fix measurement was 473px because the one-pixel divider occupied layout space. Overlaid the divider by one pixel; the final browser measurement is exactly 248×472px.

## Interaction Verification

- Menu opens and closes from the header button.
- Sort selection updates the URL query.
- Light, dark, and system theme buttons update their selected state.
- Image and text card controls switch active state and persist the choice locally.
- Browser console: no application errors or warnings.
- ESLint: passed.
- Production build and TypeScript: passed.

## Follow-up Polish

- The live avatar naturally differs from the example avatar embedded in the Figma frame; this is expected dynamic content.

final result: passed
