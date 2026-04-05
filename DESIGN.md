```markdown
# Design System Strategy: The Kinetic Ink Protocol

## 1. Overview & Creative North Star
This design system is not a static interface; it is a **"Kinetic Dossier."** It rejects the soft, rounded "safety" of modern SaaS in favor of the aggressive, high-contrast technicality found in 90s cyberpunk manga and tactical HUDs. 

### The Creative North Star: "Tactical Ink"
The system draws its soul from the tension between analog ink-work and digital precision. We move beyond the "template" look by utilizing intentional asymmetry, diagonal structural slashes, and "broken" layouts where elements bleed across boundaries. The experience should feel like a high-speed data stream intercepted by a rebel operative—raw, energetic, and unapologetically technical.

---

## 2. Colors & Environmental Tones
Our palette is rooted in the depth of a traditional manga page, punctuated by the high-voltage "neon bleed" of a cyberpunk cityscape.

*   **Foundation:** A base of `surface` (#131313) and `on_surface` (#e5e2e1) provides the high-contrast "Ink and Paper" foundation.
*   **The Neon Pulse:** 
    *   **Electric Cyan** (`primary_container` #00F0FF): Use for primary technical data and high-priority UI triggers.
    *   **Acid Green** (`secondary_container` #CCFF00): Use for "System Ready" states and secondary success actions.
    *   **Magenta** (`tertiary_container` #ffc9f4): Reserved for "Rebellious" highlights, alerts, and breaking the monotony.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. They are the hallmark of generic design. Boundaries must be defined by:
1.  **Tonal Shifts:** A `surface_container_low` section sitting against a `surface` background.
2.  **Graphic Slashes:** Heavy, diagonal decorative bars (inspired by the reference image) to separate content blocks.
3.  **Negative Space:** Large, intentional gaps that force the eye to group elements.

### Signature Textures (Screentones)
To achieve the manga aesthetic, use the `outline_variant` token to create "Screentone" patterns (dot grids or 45-degree diagonal hatches). Apply these as background fills for sidebars or "disabled" states to provide a tactile, printed-matter quality that flat hex codes cannot replicate.

---

## 3. Typography: The Tactical HUD
Typography is our primary tool for conveying "Intelligence." We pair a bold, assertive sans-serif with a technical, high-precision monospace.

*   **Display & Headlines (Epilogue):** These should feel editorial and loud. Use `display-lg` and `headline-lg` with tight letter spacing. Don't be afraid to overlap headlines with background graphic elements to create depth.
*   **Technical Data (Space Grotesk):** All body text, labels, and metadata must use Space Grotesk. This font acts as our "HUD," providing a clean, monospace-adjacent feel that suggests every piece of data is being computed in real-time.
*   **Vertical Orientation:** In the spirit of Japanese typesetting, use vertical text orientations for labels or decorative side-tags (e.g., "SYSTEM_ID: 098") to break the horizontal grid.

---

## 4. Elevation & Depth: Tonal Layering
In this system, we do not use "elevation" in the Material sense. We use **Layering.**

*   **The Layering Principle:** Depth is achieved by stacking `surface-container` tiers. Place a `surface_container_highest` module on top of a `surface_container_low` section to create a "tactical lift." 
*   **Ambient Shadows:** If a floating element (like a context menu) requires a shadow, it must be massive and diffused. Use the `on_surface` color at 5% opacity with a 40px–60px blur. This creates a "glow" or "environmental occlusion" rather than a drop shadow.
*   **The "Ghost Border" Fallback:** For high-density data tables where separation is critical, use a "Ghost Border"—the `outline_variant` token at 15% opacity. It should be felt, not seen.
*   **Glassmorphism:** Use `surface_bright` with a 12px backdrop-blur and 60% opacity for floating tactical panels. This allows the underlying "screentone" textures and diagonal slashes to bleed through, integrating the UI layers.

---

## 5. Components

### The "Zero-Radius" Mandate
All components—buttons, inputs, cards—must have a **0px border radius**. Sharp corners communicate precision and aggression.

*   **Buttons:**
    *   **Primary:** Solid `primary_container` (Cyan) with `on_primary_fixed` text. Add a 2px offset "shadow" of pure Black (#000000) to give it a 2D pop-art feel.
    *   **Secondary:** Solid `secondary_container` (Acid Green).
    *   **Tertiary:** `outline` text with a 45-degree "Screentone" hover state.
*   **Input Fields:**
    *   Use a bottom-only 2px border using `primary`. The label should be in `label-sm` (Space Grotesk) and always visible, like a technical readout.
*   **Chips:**
    *   Sharp-edged rectangles. Use `secondary_fixed` for active states. Include a small "X" or "+" icon that looks like a crosshair.
*   **Cards:**
    *   Forbid dividers. Separate content using `surface_container_lowest` for the card body and `surface_container_highest` for the card header. Use a diagonal "clipped corner" graphic (via CSS clip-path) to reinforce the cyberpunk aesthetic.
*   **Tactical HUD Elements (Additional):**
    *   **Progress Bars:** Instead of a smooth fill, use segmented blocks (e.g., 10 blocks) to indicate completion, mimicking old-school digital readouts.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use diagonal layout elements. A 5-degree tilt on background containers can transform a boring list into a dynamic experience.
*   **Do** embrace asymmetry. Balance a large content block on the left with a tiny, technical monospace vertical label on the right.
*   **Do** use "Ink-Black" strokes (4px+) for decorative framing, but never for standard UI borders.

### Don't:
*   **Don't** use any border-radius. Ever. 
*   **Don't** use generic grey shadows. Use tinted, low-opacity environmental glows.
*   **Don't** use standard "Soft" transitions. Animations should be "Snap and Slide"—quick, linear, and high-energy (e.g., 150ms Cubic-Bezier(0.4, 0, 0.2, 1)).
*   **Don't** clutter the screen with dividers. If you need a line, make it a design statement—thick, bold, and intentionally placed.

---
*Director's Note: Remember, we are not building a dashboard; we are building an interface for the future. Every pixel should feel like it was placed with tactical intent.*```