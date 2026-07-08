# AgriGuardian — Colour Palette & Consistency Standard

Dev reference. One shade per role. New code and restyles use these values; a role
must never be drawn in a near-duplicate shade. High-contrast (a11y) values are a
separate, deliberate set and are **never** unified with these.

## Canonical palette

### Brand
| Role | Value |
|---|---|
| Brand green (header, sidebar, primary) | `#1F4D2E` |
| Brand green — hover | `#17391F` |
| Accent green (Email button, progress, OK dot) | `#2E7A4E` |
| Mint accent (active bar / secondary on dark) | `#8FD3B4` |
| Secondary text on dark green | `#9FE1CB` |

### Surfaces & lines
| Role | Value |
|---|---|
| Page canvas (behind the app card, neutral) | `#EEEEEA` |
| Page / app surface (sage) | `#E7F0E7` |
| Card / box (soft, on sage) | `#F3F8F2` |
| Card border (hairline) | `#D7E4D7` |
| Divider inside a card | `#E4EEE4` |
| Form-field fill | `#FFFFFF` (kept white on purpose) |
| Form-field border | `#CBD8CB` |

### Text
| Role | Value |
|---|---|
| Primary | `#22372A` |
| Secondary | `#5F7266` |
| Muted / hint | `#7A8F80` |
| On dark | `#FFFFFF` |

### Severity / status (Owner, Manager, Technician only)
| Role | Value |
|---|---|
| Critical dot / fill | `#E24B4A` |
| Critical text | `#A32D2D` |
| Critical tint | `#FCEBEB` |
| Critical border | `#F09595` |
| Review (yellow) dot | `#D4C000` |
| Caution text | `#7A6514` |
| Review tint | `#FBF6E9` |
| OK dot | `#2E7A4E` |
| Success text | `#1F6E43` |
| Success tint | `#E2EFE8` |
| Success border | `#BBD8C2` |

### Semantic families
| Family | fg | tint | border |
|---|---|---|---|
| Escalation (purple) | `#5B21B6` (deep `#3B0764`) | `#EFEAF7` | `#C4B5FD` |
| Observation / info (blue) | `#1A5FA8` | `#E6F0FA` | `#92B4E3` |
| Returned to tech (orange) | `#7A3200` | `#FFF3E0` | `#E6823A` |

### Farm Hand / Viewer — colour-safe (no severity, no amber)
| State | fg | bg |
|---|---|---|
| Fine | `#1F6E43` | `#E2EFE8` |
| Known issue | `#1A5FA8` | `#E6F0FA` |
| Use with caution | `#41506A` | `#E4E8EE` |

### High-contrast mode (a11y) — DO NOT unify with the above
`#CC0000`, `#880000`, `#006600`, `#004400`, `#FFFF00`, `#888800`, `#000`, `#fff`.
Intentional accessibility overrides injected by `accessibility.js`.

---

## Drift found -> target (standardisation map)

Role-aware, not blind find/replace — the same literal can serve different roles.

| Drifted values | Role | -> Canonical |
|---|---|---|
| `#F7F7F5`, `#F2F6F3`, `#F4F8F5`, `#F9FDF9`, `#F4F6F8`, `#FAFAFA`, `#F5F5F5` (as box) | card/box surface | `#F3F8F2` |
| `#fff` **only where a card/box** (not text, logo, field) | card surface | `#F3F8F2` |
| `#EAF3EC`, `#F0F9F3`, `#C8E6C9`, `#DDEAE0` | success tint | `#E2EFE8` |
| `#E0E0E0`, `#E8E8E8`, `#E5E5E5`, `#E3E3E3`, `#EBEBEB`, `#DCE8DC` | card border | `#D7E4D7` |
| `#F0F0F0` | divider | `#E4EEE4` |
| `#ddd` (field border) | field border | `#CBD8CB` |
| `#111`, `#1A1A1A`, `#333`, `#3A3A3A` | primary text | `#22372A` |
| `#555`, `#666` | secondary text | `#5F7266` |
| `#888`, `#999`, `#9A9A9A`, `#9DB2A2` | muted text | `#7A8F80` |
| `#C0392B` | critical dot | `#E24B4A` |
| `#C9A400`, `#EF9F27` (as review dot) | review dot | `#D4C000` |
| `#854F0B`, `#713F12`, `#3D2B00`, `#633806` | caution/amber text | `#7A6514` |
| `#FEFCE8`, `#FAEEDA`, `#FEF08A`, `#F5E9B8`, `#E6D8AE` | review tint | `#FBF6E9` |
| `#7C3AED` | escalation fg | `#5B21B6` |
| `#F3EEFF`, `#FAF5FF`, `#EDE9FE` | escalation tint | `#EFEAF7` |
| `#1A3A6B`, `#185FA5`, `#5B8DB8`, `#2B4D8E`, `#1A4A7A`, `#005577` | info fg | `#1A5FA8` |
| `#F0F6FF`, `#EAF1FB`, `#E8F1FB` | info tint | `#E6F0FA` |
| `#BDD3EE`, `#BFD6EC`, `#B6D4F2` | info border | `#92B4E3` |

## Scope / method note
Standardisation is done role-by-role with verification (`node --check`,
`validate-split.py`) — never a global find/replace, since `#fff`, `#888`, `#ddd`
legitimately serve more than one role. HC values are left exactly as-is.
