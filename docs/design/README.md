# OPUS — redesign directions (Aug 2026)

Five complete visual directions for the UI redesign, each shown across nine real
screens. Built for review, not for shipping — nothing here is imported by the app.

## Published for review

| | Direction | Idea |
|---|---|---|
| **Start here** | [All five + comparison](https://claude.ai/code/artifact/dc9d4a55-6d7f-4302-adf8-e2c5dc5d10f7) | Matrix, library breakdown, recommendation |
| 1 | [Forge](https://claude.ai/code/artifact/feb470d5-6d51-4ed7-bfcd-841d577d2997) | Molten luxury — obsidian + gold as a real metal |
| 2 | [Brutal](https://claude.ai/code/artifact/5c2a26a6-8e2e-4ba4-8274-90d81eeff93d) | Data as typography — ink on paper, one signal red |
| 3 | [Arcade](https://claude.ai/code/artifact/9400e770-a899-45b1-987f-96cbdd2b2ce1) | The RPG unapologetic — plasma HUD on void |
| 4 | [Atelier](https://claude.ai/code/artifact/6be0e35b-10cd-44d4-9d55-7acfedaeb5cf) | The printed journal — bone stock, old-style serif |
| 5 | [Aurora](https://claude.ai/code/artifact/a0ba0f86-fc55-4950-9172-d905f43bb036) | Depth and glass — frosted panels over aurora light |

## Regenerate

```bash
node docs/design/build.mjs   # writes <direction>.html next to the source
```

## Files

- `screens.mjs` — the nine screens as one shared content model (Home, active
  workout, Progress, Profile, Exercise library, History, Quests, level-up,
  Settings), using real OPUS data. Shared across all five so the comparison is
  like-for-like.
- `base.mjs` — structural CSS every direction inherits, plus the page template.
  All colour, type, radius, depth and motion come from tokens.
- `themes.mjs` — the five directions. Each is a token block plus the extra CSS
  that gives it character, and its own library list, trade-offs and risks.
- `build.mjs` — renders each direction to a self-contained HTML file.

## Notes

- Mockups use **system typefaces** — the artifact sandbox blocks font CDNs. The
  shipped app keeps its licensed faces; judge structure, weight and rhythm.
- Each direction commits to a single visual world rather than supporting both
  themes, because the point is to pitch a look. The comparison index adapts to
  light and dark.
- Two conclusions hold across all five: **GSAP is now free including every
  plugin**, and **Lenis is rejected everywhere** — smooth-scroll hijacking
  fights Android pull-to-refresh in an installed PWA.
