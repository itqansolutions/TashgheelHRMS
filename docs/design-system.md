# Tashgheel HRMS — UI Design System

## Overview

This document defines the complete design system for Tashgheel HRMS. All UI components,
colors, typography, spacing, and interaction patterns are derived from these tokens.
The system supports both English (LTR) and Arabic (RTL) layouts.

---

## 1. Color Palette

### Primary Colors

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-primary-950` | Navy Dark | `#0E1020` | Deepest sidebar shade |
| `--color-primary-900` | Navy | `#1D233D` | Sidebar hover, dark backgrounds |
| `--color-primary-800` | Deep Indigo Dark | `#242748` | Sidebar active states |
| `--color-primary-700` | Deep Indigo | `#2A2C4E` | **Main sidebar background** |
| `--color-primary-600` | Indigo Mid | `#363866` | Sidebar section headers |
| `--color-primary-500` | Indigo | `#4447A8` | Sidebar icon tint |
| `--color-primary-400` | Indigo Light | `#6E71C4` | Inactive nav text |
| `--color-primary-300` | Lavender | `#A5A8DC` | Subtle borders in dark contexts |
| `--color-primary-200` | Lavender Light | `#D4D5EF` | Hover backgrounds |
| `--color-primary-100` | Lavender Pale | `#EAEBF8` | Selected row tint |
| `--color-primary-50` | Lavender Mist | `#F4F4FC` | Page section backgrounds |

### Accent — Teal (Action / Success)

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-teal-700` | Teal Dark | `#007A52` | Teal button hover |
| `--color-teal-600` | Teal Deep | `#009968` | Teal button active |
| `--color-teal-500` | **Brand Teal** | `#00B67A` | **Primary CTA, success badges** |
| `--color-teal-400` | Teal Mid | `#00D492` | Focus rings |
| `--color-teal-200` | Teal Light | `#B3F0DC` | Success background tint |
| `--color-teal-100` | Teal Pale | `#D9F8EE` | Success alert background |
| `--color-teal-50` | Teal Mist | `#EEFDF7` | Hover on success elements |

### Accent — Coral (Danger / Alert)

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-coral-700` | Coral Dark | `#9E2020` | Error button hover |
| `--color-coral-600` | Coral Deep | `#C22E2E` | Error button active |
| `--color-coral-500` | **Brand Coral** | `#E54B4B` | **Destructive actions, error states** |
| `--color-coral-400` | Coral Mid | `#EA6E6E` | Error borders |
| `--color-coral-200` | Coral Light | `#F9BFBF` | Error background tint |
| `--color-coral-100` | Coral Pale | `#FDE8E8` | Error alert background |
| `--color-coral-50` | Coral Mist | `#FEF4F4` | Hover on error elements |

### Accent — Orange (Warning / Secondary Action)

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-orange-600` | Orange Deep | `#B54A00` | Warning button hover |
| `--color-orange-500` | **Brand Orange** | `#E86B13` | **Warnings, secondary CTAs** |
| `--color-orange-200` | Orange Light | `#F9C89A` | Warning background tint |
| `--color-orange-100` | Orange Pale | `#FDEBD8` | Warning alert background |
| `--color-orange-50` | Orange Mist | `#FEF5EC` | Hover on warning elements |

### Neutral / Content

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-neutral-950` | Black | `#0A0B0F` | Highest-contrast text |
| `--color-neutral-900` | Charcoal | `#1A1C29` | **Primary body text, headings** |
| `--color-neutral-800` | Slate Dark | `#2D3040` | Secondary headings |
| `--color-neutral-700` | Slate | `#434660` | Body text |
| `--color-neutral-600` | Slate Mid | `#5C607E` | Secondary text |
| `--color-neutral-500` | Slate Light | `#767B9C` | Placeholder text, icons |
| `--color-neutral-400` | Gray | `#9EA3BF` | Disabled text |
| `--color-neutral-300` | Gray Light | `#C5C9DC` | Dividers, borders |
| `--color-neutral-200` | Gray Pale | `#DDE0ED` | Table row dividers |
| `--color-neutral-100` | Silver | `#EBF0FA` | **Input field backgrounds** |
| `--color-neutral-50` | Off-White | `#F5F7FB` | **Content area background** |
| `--color-white` | White | `#FFFFFF` | **Cards, panels, sidebar contrast** |

---

## 2. Typography

### Font Families

```css
/* English (LTR) */
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;

/* Arabic (RTL) */
--font-arabic: 'Noto Sans Arabic', 'Segoe UI', sans-serif;

/* Monospace (code, IDs) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `--text-xs` | 11px | 16px | 400 | Labels, badges, captions |
| `--text-sm` | 13px | 20px | 400 | Table cells, secondary text |
| `--text-base` | 14px | 22px | 400 | Body text, form inputs |
| `--text-md` | 15px | 24px | 400 | Card body, descriptions |
| `--text-lg` | 16px | 26px | 500 | Section headings, card titles |
| `--text-xl` | 18px | 28px | 600 | Page sub-headings |
| `--text-2xl` | 22px | 32px | 700 | Page headings |
| `--text-3xl` | 28px | 36px | 700 | Dashboard KPI numbers |
| `--text-4xl` | 36px | 44px | 800 | Hero / login headings |

### Font Weights

| Token | Value | Usage |
|---|---|---|
| `--font-regular` | 400 | Body text |
| `--font-medium` | 500 | Labels, nav items |
| `--font-semibold` | 600 | Headings, button text |
| `--font-bold` | 700 | Page titles, KPI values |
| `--font-extrabold` | 800 | Hero text, display numbers |

---

## 3. Spacing & Sizing

### Base Unit: 4px

| Token | Value | Usage |
|---|---|---|
| `--space-0.5` | 2px | Micro gaps |
| `--space-1` | 4px | Icon padding |
| `--space-2` | 8px | Tight spacing |
| `--space-3` | 12px | Badge padding |
| `--space-4` | 16px | Card inner padding (sm) |
| `--space-5` | 20px | Section gaps |
| `--space-6` | 24px | Card padding (default) |
| `--space-8` | 32px | Section padding |
| `--space-10` | 40px | Large section gaps |
| `--space-12` | 48px | Page section padding |
| `--space-16` | 64px | Major layout gaps |
| `--space-20` | 80px | Hero padding |

### Layout

| Token | Value | Usage |
|---|---|---|
| `--sidebar-width` | 260px | Collapsed: 68px |
| `--topbar-height` | 60px | Fixed top navigation |
| `--content-max-width` | 1440px | Page content max width |
| `--card-padding` | 24px | Standard card inner padding |
| `--page-padding-x` | 32px | Horizontal page margin |
| `--page-padding-y` | 28px | Vertical page margin |

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, tags, pills |
| `--radius-md` | 8px | Buttons, inputs, small cards |
| `--radius-lg` | 12px | Cards, modals, dropdowns |
| `--radius-xl` | 16px | Large cards, panels |
| `--radius-2xl` | 24px | Feature cards, hero sections |
| `--radius-full` | 9999px | Avatars, toggle switches |

---

## 5. Shadows

| Token | CSS Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(26,28,41,0.05)` | Subtle lift |
| `--shadow-sm` | `0 2px 4px rgba(26,28,41,0.08)` | Input focus |
| `--shadow-md` | `0 4px 12px rgba(26,28,41,0.10)` | Cards, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(26,28,41,0.12)` | Modals, drawers |
| `--shadow-xl` | `0 16px 40px rgba(26,28,41,0.16)` | Floating panels |
| `--shadow-sidebar` | `4px 0 20px rgba(0,0,0,0.15)` | Sidebar edge |

---

## 6. Component Specifications

### Button

```
Primary (Teal):
  bg: #00B67A | hover: #009968 | active: #007A52
  text: #FFFFFF | radius: 8px | height: 40px | px: 20px
  font: 14px semibold

Danger (Coral):
  bg: #E54B4B | hover: #C22E2E
  text: #FFFFFF

Secondary (Outline):
  border: #C5C9DC | bg: white | hover bg: #F5F7FB
  text: #2D3040

Ghost:
  bg: transparent | hover bg: #EBF0FA
  text: #434660

Sizes: sm (32px), md (40px), lg (48px)
```

### Input / Form Field

```
bg: #EBF0FA | border: #C5C9DC | radius: 8px
height: 40px | px: 14px
focus: border #00B67A, shadow 0 0 0 3px rgba(0,182,122,0.15)
error: border #E54B4B, shadow 0 0 0 3px rgba(229,75,75,0.15)
placeholder: #9EA3BF
label: 13px medium #2D3040, mb: 6px
```

### Card

```
bg: #FFFFFF | radius: 12px | shadow: --shadow-md
padding: 24px | border: 1px solid #DDE0ED
header: 16px semibold #1A1C29 | mb-header: 16px
```

### Badge / Pill

```
Sizes: sm (px:8, py:2, text:11px), md (px:10, py:4, text:12px)
radius: 9999px | font-weight: 500

Variants:
  success (teal):  bg #D9F8EE | text #007A52 | border #B3F0DC
  danger (coral):  bg #FDE8E8 | text #9E2020 | border #F9BFBF
  warning (orange): bg #FDEBD8 | text #B54A00 | border #F9C89A
  info (indigo):   bg #EAEBF8 | text #2A2C4E | border #D4D5EF
  neutral:         bg #EBF0FA | text #434660 | border #C5C9DC
```

### Table

```
header: bg #F5F7FB | text 12px uppercase medium #767B9C
row: bg white | hover bg #F5F7FB | border-bottom 1px #DDE0ED
selected: bg #EBF0FA
cell: py 14px | px 16px | text 14px #1A1C29
```

### Sidebar Navigation

```
Container: bg #2A2C4E | width 260px | shadow --shadow-sidebar

Section Label: text 11px uppercase #6E71C4 | px 16px | mt 24px

Nav Item:
  Default: text 14px medium #A5A8DC | py 10px | px 16px | radius 8px | mx 8px
  Hover:   bg #363866 | text #FFFFFF
  Active:  bg linear-gradient(135deg, #00B67A, #009968) | text #FFFFFF
           shadow 0 4px 12px rgba(0,182,122,0.3)

Nav Icon: 18px | mr 12px (LTR) | ml 12px (RTL)

Collapsed (68px): icons only, tooltip on hover
```

### Topbar

```
bg: #FFFFFF | height: 60px | border-bottom: 1px solid #DDE0ED
shadow: 0 1px 4px rgba(0,0,0,0.06)
px: 24px

Left: Page title (18px semibold #1A1C29) + Breadcrumbs (13px #767B9C)
Right: Language toggle | Notifications bell | User avatar + name
```

### Modal / Dialog

```
Overlay: rgba(26,28,41,0.5) | blur: 4px
Container: bg #FFFFFF | radius 16px | shadow --shadow-xl
Sizes: sm (480px), md (600px), lg (800px), xl (1000px)
Header: px 28px pt 24px | title 18px bold | close button top-right
Body: px 28px py 20px
Footer: px 28px pb 24px | border-top 1px #DDE0ED | flex justify-end gap-12px
```

### Kanban Card

```
bg: #FFFFFF | radius: 10px | shadow: --shadow-sm
border-left: 4px solid (stage color) | p: 14px
hover: shadow --shadow-md | translateY -1px (transition 150ms)

Stage Colors:
  New Application:    #6E71C4 (indigo)
  Screening:          #E86B13 (orange)
  HR Interview:       #00B67A (teal)
  Technical:          #4447A8 (indigo-500)
  Assessment:         #9E2020 (coral-dark)
  Offer:              #007A52 (teal-dark)
  Placed:             #00B67A (teal)
```

---

## 7. Animation & Motion

```css
/* Micro-interactions */
--transition-fast:   150ms ease-in-out;   /* hover states */
--transition-base:   200ms ease-in-out;   /* button press, input focus */
--transition-slow:   300ms ease-in-out;   /* modal open, drawer slide */
--transition-slower: 400ms cubic-bezier(0.34, 1.56, 0.64, 1); /* spring */

/* Specific animations */
Sidebar collapse:     width 200ms ease-in-out
Modal appear:         opacity + scale(0.96→1) 200ms ease-out
Drawer slide:         translateX 300ms cubic-bezier(0.4, 0, 0.2, 1)
Kanban card drag:     scale(1.02) + shadow-xl during drag
Notification badge:   pulse animation 2s infinite
Toast enter:          slideInFromRight 200ms ease-out
Page transition:      opacity 150ms ease-in-out
```

---

## 8. RTL / Arabic Specifics

```
Direction:         [dir="rtl"] on <html> when Arabic is active
Sidebar:           Right side when RTL
Nav icons mr→ml:   icon ml-0 mr-3 (LTR) → icon mr-0 ml-3 (RTL)
Text align:        text-left → text-right for body content
Kanban card:       border-left → border-right for stage color
Drawer:            slides from left when RTL
Breadcrumb sep:    / → \ when RTL
Date format:       MM/DD/YYYY (EN) | DD/MM/YYYY (AR)
Numbers:           Western numerals in both (not Arabic-Indic)
```

---

## 9. Page Layouts

### Standard Dashboard Page

```
┌─ Sidebar (260px) ──────┬─ Main Content ──────────────────────────────┐
│                        │ ┌─ Topbar (60px) ──────────────────────────┐ │
│  Logo (80px header)    │ │ Title        [Notif] [Lang] [Avatar]     │ │
│                        │ └──────────────────────────────────────────┘ │
│  [Nav Group: CRM]      │ ┌─ Page Content (padding: 28px 32px) ──────┐ │
│    Companies           │ │                                           │ │
│    Contacts            │ │  Breadcrumb                               │ │
│                        │ │  Page Heading + Action Buttons            │ │
│  [Nav Group: ATS]      │ │  ─────────────────────────────────────    │ │
│    Jobs                │ │  Filters / Search Bar                     │ │
│    Candidates          │ │  ─────────────────────────────────────    │ │
│    Pipeline            │ │  Main Content (Table / Cards / Kanban)    │ │
│                        │ │                                           │ │
│  [Nav Group: Placement]│ └───────────────────────────────────────────┘ │
│  [Nav Group: Finance]  │                                              │
│  [Nav Group: Analytics]│                                              │
│  [Nav Group: Settings] │                                              │
└────────────────────────┴──────────────────────────────────────────────┘
```

### Detail Page (with Tabs)

```
┌─ Sidebar ──────────────┬─ Main ────────────────────────────────────────┐
│                        │ Topbar                                        │
│                        │ ──────────────────────────────────────────    │
│                        │ [← Back]  Entity Name       [Action Buttons]  │
│                        │                                               │
│                        │ ┌─ Header Card (key info + quick stats) ───┐  │
│                        │ └───────────────────────────────────────────┘  │
│                        │                                               │
│                        │ [Tab 1] [Tab 2] [Tab 3] [Tab 4] [Tab 5]      │
│                        │ ──────────────────────────────────────────    │
│                        │ Tab Content                                   │
└────────────────────────┴───────────────────────────────────────────────┘
```

---

## 10. TailwindCSS Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: false,
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#F4F4FC',
          100: '#EAEBF8',
          200: '#D4D5EF',
          300: '#A5A8DC',
          400: '#6E71C4',
          500: '#4447A8',
          600: '#363866',
          700: '#2A2C4E', // main sidebar
          800: '#242748',
          900: '#1D233D',
          950: '#0E1020',
        },
        teal: {
          50:  '#EEFDF7',
          100: '#D9F8EE',
          200: '#B3F0DC',
          400: '#00D492',
          500: '#00B67A', // brand teal
          600: '#009968',
          700: '#007A52',
        },
        coral: {
          50:  '#FEF4F4',
          100: '#FDE8E8',
          200: '#F9BFBF',
          400: '#EA6E6E',
          500: '#E54B4B', // brand coral
          600: '#C22E2E',
          700: '#9E2020',
        },
        orange: {
          50:  '#FEF5EC',
          100: '#FDEBD8',
          200: '#F9C89A',
          500: '#E86B13', // brand orange
          600: '#B54A00',
        },
        neutral: {
          50:  '#F5F7FB',
          100: '#EBF0FA',
          200: '#DDE0ED',
          300: '#C5C9DC',
          400: '#9EA3BF',
          500: '#767B9C',
          600: '#5C607E',
          700: '#434660',
          800: '#2D3040',
          900: '#1A1C29',
          950: '#0A0B0F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(26,28,41,0.05)',
        sm: '0 2px 4px rgba(26,28,41,0.08)',
        md: '0 4px 12px rgba(26,28,41,0.10)',
        lg: '0 8px 24px rgba(26,28,41,0.12)',
        xl: '0 16px 40px rgba(26,28,41,0.16)',
        sidebar: '4px 0 20px rgba(0,0,0,0.15)',
      },
    },
  },
}

export default config
```

---

## 11. Iconography

- **Library**: Lucide React (consistent, clean, MIT licensed)
- **Default Size**: 18px for nav icons, 16px for inline, 20px for action buttons
- **Color**: inherits from text color of parent
- **Stroke Width**: 1.75px (softer, professional look)

### Key Icon Mappings

| Feature | Icon |
|---|---|
| Companies | `Building2` |
| Contacts | `Users` |
| Candidates | `UserCheck` |
| Jobs | `Briefcase` |
| Pipeline | `Kanban` |
| Interviews | `Calendar` |
| Offers | `FileText` |
| Placements | `CheckCircle2` |
| Replacements | `RefreshCw` |
| Finance | `DollarSign` |
| Analytics | `BarChart3` |
| AI | `Sparkles` |
| Settings | `Settings2` |
| Notifications | `Bell` |
| Audit Logs | `ScrollText` |
| Activities | `Activity` |
| Documents | `Paperclip` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Export | `Download` |
