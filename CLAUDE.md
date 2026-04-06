# Accidental Recipes — Frontend CLAUDE.md

> Read this file completely before writing any code, creating any files,
> or running any commands. These are constraints, not suggestions.
> Also read the root Biga CLAUDE.md at:
> `C:\Users\tedfa\OneDrive\2 Find Marketing\Biga\CLAUDE.md`

---

## What Biga Is

> Headless moves content to surfaces. Biga makes content intelligent enough
> that it doesn't need scaffolding to be understood when it arrives. The
> intelligence travels with the content through the graph, not around it.

Use this to orient any decision about where logic lives. If it is scaffolding
around content, it is wrong. If it is intelligence inside the content, it
is right.

---

## What this repo is

Next.js frontend for accidentalrecipes.com. Replaces the existing Blogger site.
Deployed to Netlify. Part of the Biga platform — a content intelligence
infrastructure project where content is a typed, enriched data object,
not an HTML document.

This site is the reference implementation of that thesis. It should be
visually and architecturally distinct from a standard recipe site. The
reaction from a developer, SEO professional, or cook encountering it
for the first time should be: "what is this — this is interesting."

---

## Brand system

**Fonts:**
- Inter (400, 500, 600) + system-ui fallback — used throughout
- `font-display` and `font-body` Tailwind classes both resolve to Inter
- Playfair Display was evaluated and dropped — Inter throughout is the decision

**Color tokens** (CSS vars in `:root`, swap automatically for dark mode):
- `canvas` / `canvas-raised` — page and surface backgrounds
- `ink` / `ink-secondary` / `ink-muted` — text hierarchy
- `sage` / `sage-light` / `sage-muted` — accent, links, interactive cues
- `border` / `border-subtle` — dividers, card edges, input borders

**Usage rules:**
- Components use Tailwind classes (`text-ink`, `bg-canvas`, `border-border`)
- Custom CSS uses CSS vars (`var(--color-ink)`)
- Never hardcode hex values in components
- No `dark:` prefix needed for brand colors — CSS vars handle the swap

**WCAG link requirement:**
- Links must use sage accent color, not default blue or muted gray
- Shared link classes in globals.css: `link-underline`, `link-secondary`, `link-content`

**Do not:**
- Use any colors from the 2findmarketing.com palette (Deep Sapphire,
  Signal Green, Accent Orange)
- Add gradients or box shadows
- Use script or decorative fonts
- Hardcode hex values in components — always use Tailwind classes or CSS vars
- Add a dark mode toggle — `prefers-color-scheme` media query only

---

## Stack

- **Framework**: Next.js (App Router)
- **Deploy**: Netlify
- **Data source**: Biga-MCP server only — no direct database access, ever
- **Language**: TypeScript, strict mode
- **Styling**: Tailwind CSS (utility classes only — no custom CSS unless
  absolutely necessary; if added, document with a comment explaining why)
- **Color scheme**: Light default, `prefers-color-scheme: dark` respected throughout

---

## Absolute constraints — do not violate these

**MCP server is the only data source.**
Never query Postgres directly. Never import from Biga Technical.
All data comes through Biga-MCP tools:
- `get_recipe(slug: string)`
- `list_recipes(options)`
- `search_recipes(query: string, limit: number)`
- `get_ingredient(wikidataId: string)`
- `get_seo_metadata(slug: string)`
- `list_ingredients()`
- `health_check()`

**MCP transport is stdio in local dev.**
In production, the transport question is unresolved (see 2FI-100).
Do not assume HTTP transport is available. Do not architect around it.
The frontend calls MCP tools through a Next.js API route that spawns
the local MCP server process. Document this clearly in code comments.

**Content objects, not pages.**
Components receive typed data objects. They never parse strings to
extract meaning. A recipe is not a blob of text — it has typed fields.
An ingredient is not a string — it has a name, quantity, unit,
preparation note, optional flag, and Wikidata entity link.

**Render what you receive.**
The frontend does not assemble, augment, or infer data. If a field is
null or absent in the MCP response, it is absent from the page. No
fallback content, no placeholder text, no client-side enrichment.

**Null field rule.**
Never render a null value. Never serialize null into JSON-LD. If a field
is null or absent in the MCP response, omit the element entirely — no
empty tags, no blank sections, no placeholder text. Schema.org validators
penalize invalid values; they do not penalize absent optional fields.

**SEO fluff is not load-bearing.**
The headnote/prose is one field among many. Do not design pages around
it as the primary content container. Structured fields come first.

**Unit strings come from the data layer.**
Never hardcode "cups", "tbsp", or other unit strings in components.
Pass them through from the MCP response. This enables a future metric
toggle without component changes.

**No lock-in.**
No vendor-specific APIs, no Anthropic SDK, no platform-specific
features that would prevent the same frontend pattern from being
reproduced on another stack.

**`wikidata_id` is nullable.**
NULL means the ingredient could not be resolved to a Wikidata entity.
It does not mean the data is missing or incomplete. Do not treat null
`wikidata_id` as an error. Do not attempt to resolve it at runtime.

**Wikidata entity validation — P31/P279 required.**
When running the linker, the top result from `wbsearchentities` must be
validated against P31 (instance of) or P279 (subclass of) before
acceptance. Do not write the top result blindly. If validation fails,
write null rather than a wrong entity.

**Spawned child processes require explicit env passing.**
Any code that spawns a child process must pass `env: { ...process.env }`
in spawn options. Omitting this causes DATABASE_URL and other environment
variables to be absent three layers downstream.

**JSON-LD is injected, not constructed.**
The frontend injects the blob returned by `get_seo_metadata` directly
into `<script type="application/ld+json">`. It does not modify the blob,
merge additional fields, or construct JSON-LD from `get_recipe` data.
The MCP server owns the JSON-LD shape. Known gap: Wikidata `sameAs`
links not yet present in output (2FI-124 — parallel track, do not
compensate in frontend).

---

## Title resolution — priority chain

Never assume a field exists. Resolve display title in this order:
1. `meta.titleOverride` (if non-null)
2. `title` (top-level field on `get_recipe` response)
3. Slug humanized — hyphens to spaces, title-cased — last resort only

Apply this chain consistently:

| Output | Source |
|--------|--------|
| URL / route | `slug` — always, never derived from title |
| `<title>` tag | titleOverride → title → slug humanized |
| `<h1>` | title → titleOverride → slug humanized |
| `<meta name="description">` | headnote — omit entirely if null |
| JSON-LD `name` | titleOverride → title |
| JSON-LD `description` | headnote — omit entirely if null |

---

## Architecture patterns

**LinkerConfig is domain-agnostic.**
Domain knowledge (known bad mappings, entity type constraints, fallback
strategies) lives in LinkerConfig, not in linker code. The linker itself
is a general-purpose resolution mechanism. Do not embed food-domain
assumptions in the algorithm.

**EnrichmentProvider interface.**
All enrichment sources (Wikidata, USDA FoodData Central, future sources)
will implement a standard EnrichmentProvider interface being formalized
in 2FI-112. Do not build new enrichment scripts outside this pattern
once 2FI-112 is resolved. Wikidata enrichment is the reference
implementation.

---

## Page architecture

### Home — `/`

Recipe grid as primary surface. 56 recipes in catalog as of 2026-04-02.

**Recipe grid**: Default entry point for all audiences. Each card shows
title, headnote preview (omit if null), ingredient count. No images on
cards — not populated. Links to `/recipes/[slug]`.

**Search**: Single text input. Calls `search_recipes(query, limit: 20)`
on submit or debounced input. Results replace the grid. Postgres
full-text against titles and headnotes — not semantic search. Do not
describe it as anything more than it is. Empty query: show full grid.
No results: clean empty state, no fallback suggestions.

**Browse by ingredient**: Secondary surface. Calls `list_ingredients()`
to populate. Links to `/ingredients/[wikidataId]`. Ingredients with
`wikidata_id: null` render as plain text without a link. This surface
demonstrates the knowledge graph — keep it visually secondary to the
recipe grid.

What the home page must NOT have: hero banner, featured recipe carousel,
editorial content, personalization UI (sessionStorage structure may exist
from prior sessions — do not remove it, but do not build UI against it now).

### Recipe — `/recipes/[slug]`

Two MCP calls on page load: `get_recipe(slug)` and `get_seo_metadata(slug)`.

Three zones, rendered in this order:

**Primary zone** — `<h1>` title, hero image or styled placeholder,
headnote (if non-null). Hero images not yet populated — render a styled
placeholder that holds the visual weight of the zone. Title overlaid on
placeholder is acceptable. This is an intentional design state, not a bug.
The placeholder component must accept an `imageSrc` prop for future use.

**Structured data zone** — Ingredients and instructions rendered from
typed fields. Each ingredient line: quantity, unit, name, preparation
note. Wikidata entity progressive disclosure (see below). Instructions
as numbered typed steps, not a prose blob. Design step component with
an empty optional image slot per step — do not render it now.

**Signal zone** — Enrichment confidence, entity resolution count
("X of Y ingredients resolved"), enrichment signals from
`enrichment.signals`. Collapsed by default, user-toggled open.
Uses `aria-expanded` / `aria-controls`. Expansion affordance must be
prominent. A collapsed section that isn't obviously expandable is invisible.

Key meal facts (prep time, cook time, difficulty, dietary highlights):
not in current data shape — omit zone entirely. Do not placeholder.
Design so the zone can be inserted between primary and structured data
zones later without restructuring.

### Browse / index — filterable
Filterable by ingredient entity, category, enrichment confidence.
Session-aware browsing state via `sessionStorage`. Not a static grid.

### Ingredient entity page — `/ingredients/[wikidataId]`
A page for each Wikidata-linked ingredient. Shows:
- Canonical Wikidata name
- Colloquial name alongside canonical where they differ
  (e.g. "coriander / cilantro") — both in the same element, not a tooltip
- Ingredient category
- All recipes using this ingredient

This page makes the knowledge graph visible. No other recipe site has it.
Treat it as a first-class deliverable, not an afterthought.

---

## Progressive disclosure — Wikidata entity tags

Each ingredient line shows a subtle visual indicator (small dot or tag)
when a Wikidata entity link exists for that ingredient (`entity` non-null).
On tap or hover, expands to show: entity name, category, link to entity page.

Ingredients with `entity: null` render as plain text. No cue, no
interaction, no visual distinction. They are just ingredients.

**Accessibility requirements — non-negotiable:**
- Keyboard accessible: focus + Enter/Space triggers disclosure
- `aria-expanded="false"` / `"true"` on the trigger element
- `aria-controls` pointing to the disclosure panel ID
- Disclosure panel has `role="region"` and `aria-label`
- Graceful degradation without JS: render as a link to the entity page

---

## Accessibility — WCAG 2.2 AA (2FI-104)

Design accessible interaction patterns first. Do not add accessibility
attributes to finished components as a second pass.

### Contrast
- 4.5:1 ratio minimum for body text, 3:1 for large text and UI components.
- Also run APCA contrast checks on body text. If something passes WCAG 2.x
  but reads thin, fix the weight or size. Do not just hit the number.

### Focus and keyboard navigation
- **Focus rings**: visible, not suppressed. Use `:focus-visible`, not `:focus`.
- **Focus not obscured** (WCAG 2.2 new): if a sticky header exists, set
  `scroll-padding-top` to prevent focused elements hiding behind it.
- **Keyboard navigation must be fully functional** on all pages, with explicit
  focus management between relationship groups on ingredient entity pages.
- **Label in name**: visible button/link text must match its accessible name.

### Motion
- **`prefers-reduced-motion` is required, not optional.** All motion behind:
  `@media (prefers-reduced-motion: no-preference) { ... }`

### Information density and progressive disclosure
- Ingredient entity pages carry significant information density. Relationship
  groups must be visually separated with a clear hierarchy.
- Use progressive disclosure if a group would otherwise overwhelm the page.

### Unit display
- Build the display layer to accept a unit preference. Toggle UI deferred.

### Regional ingredient names
- Surface regional variants where Wikidata provides them.
  "Cilantro / coriander" is the model. Comprehension issue, not cosmetic.

### Page structure and neurodiversity
- Get to content immediately. No narrative padding before recipe content.
- Steps are discrete chunks, not prose.
- Consistent navigation: no layout shifts between pages.
- UI labels: clear and literal. No jargon. No metaphor in interactive labels.
- Alt text: describe image content. Do not assume cultural context.
- `aria-live="polite"` on any region that updates without page navigation.

---

## Privacy and compliance — GDPR/CCPA (2FI-103)

**Cookie consent banner** — shown on first visit.
- Not a dark pattern. Decline must be as prominent as accept.
- Consent state stored in `localStorage` under key `biga_consent`.
- Shape: `{ analytics: boolean, functional: boolean, personalization: boolean, version: string, timestamp: string }`
- `functional` and `personalization` stubbed as `false` — do not omit them.
- Banner respects `prefers-color-scheme`.

**Analytics events** — only fire when `consent.analytics === true`.
Every event payload must include `consent_given: boolean`.
Event properties use snake_case — BigQuery-bound.

Core events:
- `page_view` — `{ page_type, slug, referrer }`
- `recipe_view` — `{ slug, source }` (source: browse | search | direct)
- `ingredient_entity_click` — `{ ingredient_name, wikidata_id, recipe_slug }`
- `signal_zone_toggle` — `{ state, recipe_slug }` (state: open | close)
- `search_query` — `{ query, result_count }`
- `browse_filter_applied` — `{ filter_type, filter_value }`

**Session state** — `sessionStorage` only. Key: `biga_session`.
Shape: `{ viewed: string[], ingredient_affinity: string[] }`
Clears on tab close. No consent required.

---

## Design references

- **NYT Cooking**: editorial confidence, clean hierarchy, readable type
- **Fastmail**: purposeful, no decorative chrome, actions are obvious
- **Acme Weather**: data-rich but warm — density as a feature, not a problem
- **CHI311**: structured information, navigable by facet

Through-line: information density is a feature. Whitespace creates
hierarchy, not decoration. The site should feel like a tool that
respects the user's intelligence.

---

## Neurodiverse and culturally diverse audiences

- No time-pressure UI patterns
- Consistent navigation structure on every page
- Sufficient whitespace between content zones
- Signal zone toggle reduces visual complexity — secondary purpose beyond
  deferring technical detail
- Ingredient names: canonical alongside colloquial where they differ —
  both visible in same element, not hidden in tooltip
- Unit strings: from data layer only, never hardcoded
- No culturally specific idioms in UI copy

---

## Data population reality — do not treat as bugs

| Field | State | Behavior |
|-------|-------|----------|
| Hero image | Not populated | Styled placeholder, title overlaid |
| Headnote | ~60–70% populated | Omit zone entirely when null |
| Cook time / prep time / difficulty | Not in data shape | Zone omitted entirely |
| Nutrition / dietary / allergy | Not in data shape | Zone omitted entirely |
| Step-level images | Not in data shape | Empty optional slot in step component |
| Wikidata `sameAs` in JSON-LD | Missing pending 2FI-124 | Inject what `get_seo_metadata` returns |

---

## Data Layer — Known Inconsistencies

### IngredientLine.name
The `name` field is documented as optional (`name?: string`) with a JSDoc note.
This is intentional. The MCP server does not currently return `name` on ingredient
lines. Display name derivation follows this priority:

1. `entity.name` — when a Wikidata entity exists for the ingredient
2. `rawString` — fallback when no entity is linked

Do not remove the `name?: string` type definition. It documents intent and will
be populated when the data layer catches up. Do not use it as a display source
until it is confirmed present in live MCP responses.

---

## Deferred — do not build these now

| Ticket | Feature | Notes |
|--------|---------|-------|
| 2FI-101 | "Start Cooking" mode | Step-level timers, decluttered UI |
| 2FI-102 | "What is this?" guided tour | Audience selector with contextual overlays |
| 2FI-124 | `get_seo_metadata` Wikidata enrichment | Backend fix — parallel track, do not compensate in frontend |
| — | Ingredient graph / natural language search | See roadmap doc in Linear |
| — | Identity / login / personalization | Phase 3+ |
| — | Metric unit toggle | Structure supports it; UI not required yet |
| — | HTTP MCP transport | Unresolved (2FI-100) |
| — | Static generation / generateStaticParams | Unresolved (2FI-100) |
| — | Related recipes | Future rev |
| — | Step-level timer extraction | Future rev |

---

## Related repos
```
C:\Users\tedfa\OneDrive\2 Find Marketing\
├── Biga\
│   ├── CLAUDE.md              ← root project context — read this too
│   ├── Biga Technical\        ← ingestion pipeline — do not import from here
│   └── Biga-MCP\              ← MCP server this frontend consumes
└── Accidental Recipes\
    └── Biga\                  ← this repo
        ├── CLAUDE.md          ← this file
        ├── app\               ← Next.js App Router
        └── ...
```