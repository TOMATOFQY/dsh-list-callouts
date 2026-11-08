# List Callouts

English | [中文](README.zh.md)

Renders **list callouts** in DSH's Markdown file preview *and* in Chat messages: a
list item whose first character is a configured marker becomes a tinted,
color-coded callout.

This is a port of [mgmeyers/obsidian-list-callouts](https://github.com/mgmeyers/obsidian-list-callouts)
(GPL-3.0) to the DSH Web UI. The Obsidian plugin's reading-view half — the
`registerMarkdownPostProcessor` pass and `styles.css` — is reimplemented as a
markdown-it transform plus scoped CSS; the CodeMirror live-preview half has no
counterpart because DSH's file preview is read-only.

## Install

The package is a self-contained DSH bundle: a Host half (`index.js`), a Browser
half (`client.js`, which embeds the markdown-it bundle), the loader patch, locale
metadata, and an icon. Install the directory into a profile:

```sh
npm install                       # the Host half imports @deepseek-ai/schemastery
# inside a DSH session / profile shell
plugin_manager install_bundle /path/to/dsh-list-callouts
```

`client.js` is the shipped artifact. Editing it directly is enough — there is no
build step; the renderer code lives in its `//#region` sections. The Host half
(`index.js`) needs its one runtime dependency installed in this directory; the
profile links the directory, so `pnpm` does not install it for you. `node_modules`
is git-ignored; `package-lock.json` is committed.

## Layout

| Path | Role |
|---|---|
| `index.js` | Host half: the `Config` schema (the namespace the page edits) and the initial `__DSH_LIST_CALLOUTS_CONFIG__` projection |
| `client.js` | Browser half: document-preview renderer, Chat decorator, CSS |
| `cordis.patch.yml` | Inserts the loader row for the bundle |
| `locale/{en,zh}.json` | Plugin Manager title/description |
| `icon.svg` | Plugin artwork |

## Syntax

```markdown
- ! important
- ? question
- ~ idea
- @ note
- $ success
- % neutral
- & warning
```

Any list item works: ordered lists, nested lists, blockquotes, and task items.
The same syntax is decorated in Chat answers, reasoning text, and any other
Markdown rendered inside the conversation.

```markdown
- [ ] ! a task that is also a callout
- ! parent callout
  - nested items stay outside the tinted block
```

## Two rendering paths

| Surface | Mechanism | Fidelity |
|---|---|---|
| Sidebar file preview | The plugin registers its **own** Markdown document renderer, so it owns the whole tree | Full: tinted wrapper, nested lists stay outside the tint, marker glyph can be an icon |
| Chat | A resident decorator watches rendered conversation Markdown: class/attribute/custom-property writes are immediate, and the marker character is split into a styled span only after the text has been stable for 350ms | Tint covers the whole item (nested items included); the bubble's own `li` is never moved or replaced, so streaming and virtualization stay valid |

Both surfaces keep the list's own bullet marker — the shipped `li::marker` rule in
Chat, the default disc in the preview — and the tinted band extends left so the
bullet sits inside it, as in the Obsidian plugin. Task items show their checkbox
instead of a bullet.

On both surfaces the list bullet takes the callout's own color (`li::marker`),
so a callout row reads as `• ! text` with the dot, glyph, and tint in one color.

In Chat, the marker character cannot be colored in place (a `::first-letter`
rule does not apply to these list items), so the decorator splits it into a
`<span class="lc-chat-marker">` only after the row's text has been stable for
350ms. The original text node stays in place — never moved, never parented
elsewhere — so React's own text updates and unmounts remain valid; if React
rewrites the text, the split is reverted and re-applied on the next settle.

The Chat path deliberately never re-parents or replaces nodes: that DOM belongs
to the shipped renderer, which also streams tokens and unmounts virtualized
rows, so structural edits would break its reconciliation. Turn it off with the
**Render in Chat messages** switch on the bundle's page if you prefer Chat
untouched.

## How it plugs in

The plugin registers **its own Markdown document renderer** through
`ctx.documentPreviews` at the `extension` priority band, so `.md` / `.markdown`
files open with list-callout support. The shipped renderer is still registered:
the preview's viewer dropdown lists both, so any single file can be switched
back to the stock renderer.

Set `defaultViewer: builtin` (see below) to keep the stock renderer in front and
make "List callouts" an opt-in choice in that dropdown instead.

## Settings

**Sidebar → Plugins → List Callouts bundle → configuration**: the marker list is
edited on the bundle's own page, the same place the shipped bundles keep their
settings (`plugins.bundle.config`). No config file needs to be touched:

- two switches: **Render in Markdown previews** (off hands `.md` tabs back to the
  shipped renderer) and **Render in Chat messages** — each surface is controlled
  on its own;
- add and remove markers, each with a character (≤ 4 code units, no spaces), a
  color picker, and an optional icon glyph;
- a live preview renders the current list with the real callout styling;
- every accepted edit applies immediately to both surfaces — open documents
  re-render and already-rendered Chat rows are re-decorated;
- **Reset to defaults** clears the override and falls back to the plugin config.

The page writes through the plugin's own Host `Config` (`obsidian-list-callouts`
namespace): the values are validated by the schema and persisted in the profile's
configuration layer, exactly like the settings of every shipped plugin. The Host
declares the editable fields `.volatile()`, so an accepted edit reaches the open
documents and the Chat decorator without a reload; **Reset to defaults** drops the
layer override.

The injected default (from the row's own `config` in the profile patch) is used
only for the first paint, before the settings mirror answers. A browser-local
override left by an earlier version of this plugin
(`localStorage['dsh.list-callouts.callouts.v1']`) is migrated into the Host config
once and then removed.

## Configuration

Add a matching row override in the profile's `cordis.patch.yml`:

```yaml
- id: obsidian-list-callouts
  config:
    defaultViewer: callouts      # callouts | builtin (sidebar .md preview)
    chatCallouts: true           # decorate Chat messages
    markdownCallouts: true       # own the .md preview renderer
    opacityLight: 0.1            # tint alpha, light mode
    opacityDark: 0.15            # tint alpha, dark mode
    callouts:
      - { char: '!', color: '255, 23, 68' }
      - { char: '?', color: '255, 145, 0' }
      - { char: '★', color: '255, 214, 0', icon: '★' }
```

- `callouts[].char` — the marker character (≤ 4 code units, no spaces).
- `callouts[].color` — `r, g, b` (0–255) used for the marker and the tinted background.
- `callouts[].icon` — optional glyph shown instead of `char` (emoji work).
- `opacityLight` / `opacityDark` — background tint alpha, 0–1.
- `defaultViewer` — which renderer opens `.md` tabs first; the other one stays
  available in the preview toolbar's dropdown.
- `chatCallouts` / `markdownCallouts` — the two per-surface switches, same values
  the bundle page writes; the theme fields other than `defaultViewer` are
  `.volatile()`, so editing them restarts nothing.

## Renderer coverage

Supported: headings, paragraphs, emphasis, nested ordered/unordered lists, task
lists, tables, blockquotes, fenced code, inline code, links, images (local files
resolve through the authenticated file route; remote URLs are left alone), `---`
rules, and a leading YAML frontmatter block shown as a key/value box.

Not covered (the stock renderer still offers these): syntax highlighting,
KaTeX math, footnotes, and source-file line anchors. Markdown link and image
focus affordances are the plugin's own, not the stock component's.

## License

GPL-3.0, inherited from the upstream plugin this is a port of (see `LICENSE`).

Vendored third-party code: [markdown-it](https://github.com/markdown-it/markdown-it)
14.1.0, MIT, embedded in `client.js`.
