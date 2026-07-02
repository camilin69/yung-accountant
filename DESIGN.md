# Yung Accountant — Design System

> Brutalist Glass V2 · Role-based theming · Onest typography · Accessible by default

---

## 1. Design Philosophy

Yung Accountant follows a **Brutalist Glass** aesthetic: raw structural clarity softened by translucent frosted-glass surfaces. The design prioritizes:

- **Depth over flatness** — layered glass panels with backdrop blur create spatial hierarchy
- **Role empathy** — each user role (estudiante, trabajador, ama-de-casa) gets a distinct color palette that reflects their context
- **Motion with purpose** — animations guide attention, not distract. Every transition uses `cubic-bezier(0.22, 1, 0.36, 1)` for consistent feel
- **Typography-first** — Onest font with a fluid scale drives information hierarchy; glass effects are secondary to readability

---

## 2. Theme System

### Architecture

Themes are applied via a `data-theme` attribute on `<html>`:

```html
<html data-theme="estudiante-dark">
```

Six themes exist: `{role}-{mode}` where `role ∈ {estudiante, trabajador, ama-de-casa}` and `mode ∈ {dark, light}`.

### CSS Custom Properties

Each theme defines 30+ CSS custom properties organized into groups:

| Group | Properties | Purpose |
|-------|-----------|---------|
| **Primary** | `--theme-primary`, `--theme-primary-light`, `--theme-primary-dark` | Main brand color |
| **Secondary** | `--theme-secondary`, `--theme-secondary-light`, `--theme-secondary-dark` | Complementary accent |
| **Accent** | `--theme-accent`, `--theme-accent-soft` | Highlight/glow color |
| **Background** | `--theme-background-primary`, `--theme-background-secondary`, `--theme-background-tertiary`, `--theme-background-glass`, `--theme-background-glass-hover`, `--theme-background-glass-active` | Layered backgrounds |
| **Text** | `--theme-text-primary`, `--theme-text-secondary`, `--theme-text-tertiary`, `--theme-text-disabled` | Text hierarchy |
| **Border** | `--theme-border-light`, `--theme-border-medium`, `--theme-border-dark` | Border levels |
| **Gradient** | `--theme-gradient-primary`, `--theme-gradient-secondary`, `--theme-gradient-accent` | Gradient fills |
| **Shadow** | `--shadow-glass-sm`, `--shadow-glass-md`, `--shadow-glass-lg`, `--shadow-button`, `--shadow-elevated` | Depth levels |
| **Glass** | `--glass-blur`, `--glass-saturation` | Glass effect tuning |
| **Overlay** | `--modal-overlay` | Modal backdrop |
| **Semantic** | `--semantic-income`, `--semantic-expense`, `--semantic-warning`, `--semantic-info` | Status colors |

### Theme Context (React)

```typescript
// hooks/useTheme.ts
const { currentRole, currentMode, currentTheme, setTheme, toggleMode } = useTheme();
```

The `ThemeContext` persists preference to `localStorage` under `user-theme-preference`.

### Adding a New Theme

1. Add a new `[data-theme="newrole-dark"]` block in `src/index.css` (inside `@layer base`)
2. Define all 30+ custom properties with appropriate values
3. Add a new type union member to `ThemeRole` in `ThemeContext.tsx`
4. Add a per-theme `.glass-btn-primary` override in `@layer theme-overrides`

---

## 3. Component Patterns

### Glass Surfaces

| Class | Use case | Border radius | Shadow level |
|-------|----------|---------------|--------------|
| `glass-sm` | Cards, stat tiles, small panels | `var(--radius-md, 1.5rem)` | sm |
| `glass-md` | Main content cards, form containers | `var(--radius-lg, 2rem)` | md → lg on hover |
| `glass-lg` | Hero sections, large panels | `2.5rem` | lg |
| `glass-aero` | Premium cards, feature highlights | `2rem` | multi-layer (shadow + inset + border glow) |
| `glass-input` | Form inputs, selects | `1.25rem` | — (focus glow via primary) |
| `glass-btn` | Secondary buttons | `1.25rem` | — (hover glow) |
| `glass-btn-primary` | Primary CTAs | `var(--radius-md, 1.25rem)` | button shadow |

**Usage pattern:**
```tsx
<div className="glass-sm p-6">Card content</div>
<button className="glass-btn glass-btn-primary">Submit</button>
```

### Card Hover Pattern

Add `card-hover` to any glass card for a lift-on-hover effect:
```tsx
<div className="glass-md card-hover p-6">Hoverable card</div>
```

### Form Pattern

```tsx
<label htmlFor="field-id" className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5"
  style={{ color: 'var(--theme-text-tertiary)' }}>
  Field Label
</label>
<input
  id="field-id"
  className="glass-input w-full"
  style={{ color: 'var(--theme-text-primary)' }}
/>
```

### Button Pattern

```tsx
{/* Primary */}
<button className="glass-btn-primary">Save Changes</button>

{/* Secondary */}
<button className="glass-btn">Cancel</button>
```

### Modal Pattern

```tsx
const modalRef = useRef<HTMLDivElement>(null);
useFocusTrap(modalRef, isOpen, onClose);

return isOpen ? (
  <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999]">
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title"
      className="modal-container w-full max-w-lg p-6 animate-scale-in">
      <h2 id="modal-title">...</h2>
      <button onClick={onClose} aria-label="Close dialog">
        <X />
      </button>
    </div>
  </div>
) : null;
```

---

## 4. Color System

### Primitive Tokens

The 6 `[data-theme]` blocks define role-specific primitives. These should only be used for theme definition.

### Semantic Tokens

Use these for status-dependent UI elements that should adapt per theme:

| Token | Dark themes | Light themes | Usage |
|-------|-------------|--------------|-------|
| `--semantic-income` | `#10B981` | `#059669` | Income, positive balances, success |
| `--semantic-expense` | `#EF4444` | `#DC2626` | Expenses, negative balances, errors |
| `--semantic-warning` | `#F59E0B` | `#D97706` | Warnings, allocated funds, goals |
| `--semantic-info` | `#3B82F6` | `#2563EB` | Info, neutral indicators |

**Usage:**
```tsx
// ✅ Correct — adapts to theme
<span style={{ color: 'var(--semantic-income)' }}>+$500.00</span>

// ❌ Wrong — hardcoded, won't adapt
<span style={{ color: '#10B981' }}>+$500.00</span>
```

---

## 5. Typography Scale

### Fluid Classes

| Class | Size | Weight | Letter spacing | Line height | Usage |
|-------|------|--------|---------------|-------------|-------|
| `.display` | `clamp(2.2rem, 8vw, 4.5rem)` | 300 (350 on Retina) | `-0.02em` | 1.15 | Hero headlines |
| `.headline` | `clamp(1.5rem, 4vw, 2.5rem)` | 400 | `-0.01em` | — | Page titles |
| `.title` | `1.3rem` | 500 | `0.005em` | — | Section headers |
| `.body` | `0.95rem` | 400 | `0.005em` | 1.75 | Body text |
| `.caption` | `0.72rem` | 500 | `0.06em` (uppercase) | — | Labels, metadata |

### Font Stack

```
font-family: 'Onest', 'Inter', system-ui, sans-serif;
```

Onest is loaded from Google Fonts with weights 300, 400, 500, 600, 700. The `display=swap` strategy ensures text is visible during font load.

---

## 6. Animation Library

### Keyframes

| Name | Behavior | Duration |
|------|----------|----------|
| `float` | Gentle vertical bob (±10px) | 6s infinite |
| `float-subtle` | Very subtle vertical bob (±4px) | 4s infinite |
| `glow-pulse` | Box-shadow pulse using `--theme-primary` | 3s infinite |
| `shimmer` | Horizontal gradient sweep | 1.8–2.5s infinite |
| `fadeInUp` | Fade in + slide up (24px) | 0.7s |
| `fadeInDown` | Fade in + slide down (16px) | 0.5s |
| `scaleIn` | Fade in + scale up (0.94→1) | 0.5s |
| `slideInRight` | Slide from right (30px) | 0.5s |
| `slideInLeft` | Slide from left (20px) | 0.5s |
| `dropdownIn` | Scale+fade for dropdowns (0.98→1) | 0.25s |
| `pulse-subtle` | Subtle scale pulse (1→1.02) | 2s infinite |
| `rotate-slow` | Continuous slow rotation | 20s linear |
| `border-glow` | Border color pulse | 3s infinite |
| `gradient-shift` | Background position sweep | 8s infinite |
| `breathe` | Opacity pulse (0.4→0.8) | 3s infinite |
| `ripple` | Outward box-shadow ripple | 1.5s |
| `shake` | Horizontal shake for validation errors (±6px) | 0.5s |
| `checkmark-draw` | SVG stroke-dashoffset draw | — |

### Utility Classes

Each keyframe has a corresponding utility class: `.animate-float`, `.animate-fade-in-up`, `.animate-scale-in`, etc.

### Stagger System

```tsx
// Manual: use stagger-N classes
<div className="animate-fade-in-up stagger-1">Item 1</div>
<div className="animate-fade-in-up stagger-2">Item 2</div>

// Or use the StaggerList component:
<StaggerList staggerMs={50}>
  <Card />
  <Card />
  <Card />
</StaggerList>
```

### View Transitions

The app uses the View Transition API (`@view-transition { navigation: auto }`) for smooth cross-fades between routes in Chrome 111+. Falls back gracefully in unsupported browsers.

### Reduced Motion

All animations and transitions are disabled when the user has `prefers-reduced-motion: reduce` enabled:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Responsive Breakpoints

| Name | Range | Typical layout |
|------|-------|---------------|
| **mobile** | < 480px | Single column, hamburger menu |
| **tablet** | 480px – 1023px | Auto-collapsed icon sidebar, 2-col grids |
| **desktop** | 1024px – 1399px | Full sidebar, multi-column layouts |
| **wide** | ≥ 1400px | Max-width container at 1400px |

### Hook

```typescript
import { useResponsive } from '../hooks/useResponsive';
const { isMobile, isTablet, isDesktop, isWide, breakpoint } = useResponsive();
```

### Layout Utilities

```css
.container-wide    → max-width: 1400px
.container-narrow  → max-width: 720px
.grid-auto-fit     → auto-fit grid, min 300px columns
.section-padding   → fluid clamp padding
```

---

## 8. Accessibility Guidelines

### Skip Link

A `<SkipLink />` is placed as the first focusable element in the layout. It becomes visible on Tab and jumps to `#main-content`.

### Document Titles

Every page sets a dynamic document title via the `useDocumentTitle` hook:
```typescript
useDocumentTitle('Dashboard'); // → "Dashboard | Yung Accountant"
```

### Icon-Only Buttons

**Every** icon-only button must have an `aria-label`:
```tsx
<button onClick={onClose} aria-label="Close dialog">
  <X className="w-5 h-5" />
</button>
```

Toggle buttons should also have `aria-expanded` or `aria-pressed`.

### Form Labels

All form inputs must have an associated `<label>` with `htmlFor` matching the input's `id`:
```tsx
<label htmlFor="field-id">Label</label>
<input id="field-id" />
```

### Error Messages

All form errors must use `role="alert"` so screen readers announce them:
```tsx
{error && (
  <div role="alert" className="flex items-center gap-1.5">
    <AlertCircle /> {error}
  </div>
)}
```

### Modals

- Use `role="dialog"` and `aria-modal="true"`
- Add `aria-labelledby` pointing to the title element
- Add `aria-describedby` pointing to the description
- Trap focus within the modal (use `useFocusTrap` hook)
- Close on Escape key
- Restore focus to trigger element on close

### Color Contrast

- All text must meet WCAG AA (≥4.5:1 for normal text, ≥3:1 for large text)
- `--theme-text-disabled` values have been verified to meet ≥4.5:1 in all 6 themes
- Semantic tokens use slightly darker variants in light themes for adequate contrast

### Navigation

- Active nav links have `aria-current="page"`
- The sidebar uses `<nav>` + `<aside>` semantic elements
- The main content area has `id="main-content"` for skip-link targeting

### Tooltips

Use the `<Tooltip>` component for icon-only buttons that need additional context:
```tsx
<Tooltip content="Open notifications">
  <button aria-label="Open notifications"><Bell /></button>
</Tooltip>
```
Tooltips appear on hover AND focus (keyboard accessible) and are suppressed on touch devices.

---

## 9. Component Catalog

### Common Components (`src/components/common/`)

| Component | Props | Usage |
|-----------|-------|-------|
| `AnimatedCheckmark` | `visible`, `onComplete?`, `size?`, `color?` | Success confirmation animation |
| `Avatar` | `user?`, `size?`, `className?`, `onClick?` | User avatar with fallback initials |
| `BalanceWarning` | `amount`, `walletId`, `wallets` | Insufficient balance warning |
| `Calendar` | `transactions`, `categories`, `currentDate`, `onDateChange`, `onDayClick`, `getDayTransactions` | Monthly calendar with income/expense indicators |
| `ConfettiEffect` | `active`, `onComplete?` | Canvas confetti celebration |
| `ConfirmModal` | `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `type?`, `icon?` | Confirmation dialog with focus trap |
| `CustomSelect` | `value`, `onChange`, `options`, `placeholder?`, `label?`, `error?` | Accessible custom dropdown portal |
| `EmptyState` | `icon?`, `title`, `description`, `actionLabel?`, `onAction?` | Empty data placeholder with CTA |
| `Galaxy` | — | Animated starfield background (decorative, `aria-hidden`) |
| `GradientText` | `children`, `className?`, `as?` | Text with primary→secondary gradient |
| `Logo` | `size?`, `withText?`, `className?` | SVG logo with theme-aware colors |
| `NumberInput` | `value`, `onChange`, `min?`, `max?`, `step?`, `label?`, `error?` | Formatted number input with validation |
| `SkeletonCard` | `className?`, `lines?` | Loading placeholder card |
| `SkeletonStat` | `className?` | Loading placeholder stat tile |
| `SkeletonTable` | `className?`, `rows?`, `cols?` | Loading placeholder table |
| `SkipLink` | — | Keyboard skip-to-content link |
| `StaggerList` | `children`, `staggerMs?`, `animationClass?` | Staggered animation wrapper |
| `StatCard` | `icon`, `title`, `value`, `color?` | Glass stat display card |
| `ThemeCard` | `children`, `variant?` | Theme-aware card wrapper |
| `ToastNotification` | `isOpen`, `onClose`, `message`, `type?`, `duration?` | Auto-dismissing toast |
| `Tooltip` | `content`, `children`, `position?`, `delay?` | Keyboard-accessible tooltip |

### Hooks (`src/hooks/`)

| Hook | Returns | Usage |
|------|---------|-------|
| `useAuth()` | `{ isAuthenticated, isReady }` | Auth state |
| `useCountUp(target, duration?)` | `number` | Animated number counting |
| `useDocumentTitle(title)` | — | Dynamic document title |
| `useFocusTrap(ref, isActive, onClose)` | — | Modal focus trapping + Escape |
| `useMediaQuery(query)` | `boolean` | Match media query |
| `useMetaInit()` | — | One-time metadata fetch |
| `useResponsive()` | `{ breakpoint, isMobile, isTablet, isDesktop, isWide }` | Current breakpoint |
| `useTheme()` | `ThemeContextType` | Theme context |
| `useThemeStyles()` | Style helpers | Theme-aware class/color generators |
| `useToast()` | `{ toast, showToast, hideToast }` | Local toast state |

---

## 10. Best Practices

### ✅ Do

- Use **CSS custom properties** for all colors: `style={{ color: 'var(--theme-text-primary)' }}`
- Use **semantic tokens** for status colors: `var(--semantic-income)`, `var(--semantic-expense)`
- Use **glass classes** for surface effects: `glass-sm`, `glass-md`, `glass-lg`, `glass-aero`
- Add **`aria-label`** on every icon-only button
- Add **`htmlFor`** + **`id`** pairs on all form labels and inputs
- Add **`role="alert"`** on error messages
- Add **`useDocumentTitle`** in every page component
- Use **`useFocusTrap`** + **`aria-modal`** in every modal
- Use **Tailwind utilities** for layout and spacing; use CSS vars only for theme-dependent values
- Test all 6 theme variants when adding new visual components

### ❌ Don't

- **Never** use hardcoded hex colors (`#10B981`, `#EF4444`, etc.) — use semantic tokens
- **Never** create icon-only buttons without `aria-label`
- **Never** use `<div>` or `<span>` for clickable elements — use `<button>`
- **Never** define CSS classes more than once — the cascade will silently break them
- **Never** use `font-family` declarations on individual components — it inherits from `body`
- **Never** skip the `htmlFor` attribute on form labels
- **Never** leave a loading state with a hardcoded background color — use theme variables

### CSS Layer Precedence

The design system CSS is organized in explicit `@layer` order:

```
1. base           → themes, body, scrollbars, typography, responsive
2. animations     → all @keyframes
3. components     → glass classes, buttons, inputs, modals, cards
4. utilities      → animation utility classes, layout, stagger delays
5. theme-overrides → per-theme .glass-btn-primary variations
```

When adding new CSS, place it in the appropriate layer. Layers ensure predictable precedence regardless of source order.
