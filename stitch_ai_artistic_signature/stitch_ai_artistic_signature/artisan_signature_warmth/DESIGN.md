---
name: Artisan Signature Warmth
colors:
  surface: '#fef9ef'
  surface-dim: '#ded9d1'
  surface-bright: '#fef9ef'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3ea'
  surface-container: '#f2ede4'
  surface-container-high: '#ede8df'
  surface-container-highest: '#e7e2d9'
  on-surface: '#1d1c16'
  on-surface-variant: '#454742'
  inverse-surface: '#32302a'
  inverse-on-surface: '#f5f0e7'
  outline: '#767872'
  outline-variant: '#c6c7c0'
  surface-tint: '#5e5e5c'
  primary: '#5e5e5c'
  on-primary: '#ffffff'
  primary-container: '#fdfbf7'
  on-primary-container: '#747471'
  inverse-primary: '#c8c6c3'
  secondary: '#635d5a'
  on-secondary: '#ffffff'
  secondary-container: '#e6ded9'
  on-secondary-container: '#67625e'
  tertiary: '#775a19'
  on-tertiary: '#ffffff'
  tertiary-container: '#fffaf8'
  on-tertiary-container: '#8f6e2d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e2de'
  primary-fixed-dim: '#c8c6c3'
  on-primary-fixed: '#1b1c1a'
  on-primary-fixed-variant: '#474744'
  secondary-fixed: '#e9e1dc'
  secondary-fixed-dim: '#cdc5c0'
  on-secondary-fixed: '#1e1b18'
  on-secondary-fixed-variant: '#4b4642'
  tertiary-fixed: '#ffdea5'
  tertiary-fixed-dim: '#e9c176'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4201'
  background: '#fef9ef'
  on-background: '#1d1c16'
  surface-variant: '#e7e2d9'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.01em
  display-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-sm:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  container-max: 1120px
  gutter: 24px
---

## Brand & Style
The design system is centered on the "Artist’s Studio" aesthetic—an environment that is curated, intimate, and deeply personal. It bridges the gap between historical craftsmanship and modern digital precision. The goal is to evoke a sense of quiet luxury and intentionality, moving away from corporate sterility toward a tactile, human-centric experience.

The style is **Editorial Minimalism** with **Tactile** influences. It utilizes generous whitespace to allow content to breathe, much like a high-end art monograph. Subtle grain textures are applied to surfaces to mimic premium heavy-stock paper, breaking the flatness of the digital screen and providing a grounded, physical presence.

## Colors
The palette is inspired by natural pigments and raw materials. 

- **Primary Surface (#FDFBF7):** A warm, unbleached cream that serves as the "paper" for the UI. It reduces eye strain and provides a softer backdrop than pure white.
- **Ink (#2D2926):** A deep, charcoal-sepia used for text and primary iconography. It maintains high contrast while feeling more organic than true black.
- **Accent Gold (#C5A059):** A muted ochre used sparingly for highlights, primary actions, and decorative flourishes. It represents the "artisan's touch."
- **Muted Neutral (#E9E4DB):** Used for subtle dividers, secondary containers, and disabled states to maintain the warm temperature of the system.

## Typography
The typography strategy creates a dialogue between the old world and the new. 

**Libre Caslon Text** is used for headlines and display elements. Its high contrast and classical proportions suggest tradition and authority. For large display titles, a slight negative letter-spacing is applied to enhance the editorial feel.

**Hanken Grotesk** handles the utilitarian aspects of the UI. It is a clean, contemporary sans-serif that ensures readability in data-heavy or functional areas. Labels and small caps should utilize increased letter-spacing to maintain a sophisticated, airy appearance.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Content is centered within a maximum width of 1120px on desktop to maintain a readable line length and a premium "centered" feel. 

Spacing is governed by a 4px baseline grid, emphasizing "Golden Ratio" inspired breathing room rather than dense packing. 
- **Margins:** 24px on mobile, scaling to 64px+ on large screens to frame the content like a mat around a painting.
- **Vertical Spacing:** Generous use of `xxl` (64px) spacing between major sections to denote a shift in narrative or topic.

## Elevation & Depth
This design system avoids heavy shadows in favor of **Tonal Layering** and **Subtle Outlines**. 

Depth is achieved through:
1.  **Layered Surfaces:** A slightly darker neutral (#E9E4DB) is used for cards or "inset" areas against the primary surface.
2.  **Fine-Grained Texture:** A global 5% opacity noise overlay is applied to all surfaces to provide a tactile, paper-like feel.
3.  **Soft Inset Shadows:** Only used for interactive input fields to suggest they are "stamped" into the paper.
4.  **Hairline Borders:** 1px borders in a slightly darker tint of the background color are used to define boundaries without adding visual weight.

## Shapes
The shape language is **Soft and Organic**. Sharp corners are avoided to maintain the friendly, artisanal feel, while overly pill-shaped elements are avoided to keep the system looking sophisticated rather than "bubbly."

Standard components use a 0.25rem (4px) radius. Larger containers, such as modal overlays or featured cards, use a 0.75rem (12px) radius to emphasize their importance and provide a gentle frame for imagery.

## Components
- **Buttons:** Primary buttons are solid "Ink" (#2D2926) with "Cream" (#FDFBF7) text. Secondary buttons use a hairline border. Hover states should subtly shift toward the "Accent Gold."
- **Input Fields:** These should look like traditional ledger lines or subtle boxes with a bottom border. Focus states use the Accent Gold.
- **Cards:** Cards should not have shadows. Instead, they use a 1px border of #E9E4DB or a slightly darker background fill to distinguish themselves from the main canvas.
- **Chips/Tags:** Small, Hanken Grotesk labels in all caps with wide letter-spacing, set against a very light wash of the Accent Gold color at 10% opacity.
- **Lists:** Separated by elegant, thin horizontal rules that do not span the full width of the container, creating an airy, manuscript-like flow.
- **Imagery:** Photos should have a slight warm filter or desaturation to align with the sepia/cream palette. Use organic, soft-focus photography where possible.