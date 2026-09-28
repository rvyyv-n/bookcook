# Bookcook — Design Brief

> The original brief given to the design tool. The design handoff it produced, in [`design/`](design/), supersedes it wherever they differ (copy, sizes, icons, components).

## 0. How to work through this brief
Don't design everything at once. Work in this order, and ask me any questions you need before starting each stage:
1. **Directions:** show **3 distinct visual directions** for just **cook mode** and **recipe detail**, at phone size. Offer the accent (tomato vs saffron) as a tweak rather than separate designs. I'll pick one.
2. **Design system:** turn the chosen direction into tokens (named exactly as in section 9) and the component sheet (section 7), with every state.
3. **Hero screens:** the three ★ screens in section 6, phone first, then desktop and tablet.
4. **Remaining screens**, then the stress tests: Huge text, dark cook mode, empty and error states.

Treat the accessibility rules in section 4 and the sample content in section 8 as standing rules for every screen.

---

## 1. The product in one paragraph
**Bookcook** is a modern, minimal cookbook app for recipes that only live in someone's head. Anyone can **say** a recipe out loud or **type** it naturally, and the app turns it into a clean, structured recipe. Later, they cook from it **hands-free**: the app reads each step aloud and listens for "next". It began as a way to save one mom's recipes before they're lost, so it is designed **first for older, non-technical users** while staying beautiful and fast for everyone. It keeps the *person* as well as the recipe: their name, their voice notes, their exact words, and the story behind each dish.

**Tagline:** *A cookbook you can talk to.*

## 2. Who it's for
- **Primary: "Mom," 55–75.** Cooks from memory and doesn't write recipes down. Comfortable with WhatsApp and not much else. Reading glasses. Busy hands in the kitchen.
- **Secondary: her son or daughter, 18–30.** Wants to save her recipes and cook them alone later. Uses a laptop and a phone, and expects a polished modern app.
- **Everyone else:** people who want a calm, ad-free personal cookbook.

## 3. Platforms and sizes to design
| Frame | Size | Notes |
|---|---|---|
| Phone | **390 × 844** | Primary. Bottom tab bar. |
| Tablet (landscape) | 1180 × 820 | Mainly for cook mode propped on a counter. |
| Desktop | **1440 × 900** | Three-pane layout, keyboard-first. |

It ships as a web app (PWA), an Android app and an installed desktop web app, all from one design.

## 4. Visual direction: "warm editorial minimalism"
The warmth of a beautifully printed cookbook, with the calm and restraint of Things 3.

- **References:** Mela (layout restraint), Crouton (cook mode), NYT Cooking (editorial typography), StoryWorth (gentle one-question-at-a-time tone), Things 3 (calm interaction polish).
- **Avoid:** a generic SaaS or shadcn look, heavy gradients, glassmorphism, busy food-delivery aesthetics, tiny grey text, icon-only buttons.
- **Mood words:** warm, calm, heirloom, generous whitespace, confident type, tactile paper.

### Colour (starting point; refine freely, but keep AAA text contrast)
These values are only a starting point: propose better ones if the direction calls for it. The full list of colour tokens the code expects is in section 9.
| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#FBF7F0` | `#171411` | App background |
| `surface` | `#FFFFFF` | `#211D19` | Cards, sheets |
| `ink` | `#1F1B16` | `#F3EDE4` | Body text (≥ 7:1 contrast) |
| `ink-muted` | `#5A5148` | `#B9AFA3` | Secondary text (still ≥ 4.5:1) |
| `line` | `#E8E0D4` | `#332D27` | Hairlines, dividers |
| `accent` | tomato **or** saffron (explore both) | lighter variant | Primary actions, mic, highlights |
| `accent-ink` | text colour on accent | | Must pass AA at minimum |
| `success` / `danger` | muted herb green / brick red | | Check-offs, destructive actions |

### Typography
- **Display and titles:** **Fraunces** (soft serif; use its optical size and "soft" axes).
- **Everything else:** **Atkinson Hyperlegible Next** (designed for low-vision readers).
- **Base body size is 18px, not 16px.** Suggested scale: 14 (caption, rare) · 18 (body) · 22 · 28 · 36 · 48 · 64 (cook-mode step).
- **Text size setting:** Normal / Large (×1.2) / Huge (×1.45). Show at least one screen at **Huge** to prove the layout holds.

### Shape, space, motion
- 4px spacing grid, generous padding. Radius about 14–20px on cards and 999px on pills and the mic button.
- Soft paper-like elevation (subtle, warm shadows). No hard drop shadows.
- Motion: calm and short (150–250ms). The mic "breathes" while listening, steps slide in cook mode, and checking something off gives a satisfying small animation. Everything must also work with reduced motion.

### Accessibility rules (non-negotiable)
- Tap targets **≥ 56px**. Primary actions are large and labelled with text; **every icon has a visible label**.
- No hidden gestures (no swipe-only actions). Destructive actions use an **Undo toast**, not a confirm dialog.
- Visible, attractive focus rings (desktop keyboard use).
- Plain-language labels: "Save recipe", "Tell me a recipe", "Start cooking". Never "Submit" or "Proceed".
- One clear primary action per screen.

## 5. Navigation
- **Phone:** bottom tab bar with **Cookbook · Grocery · [ + ] · Requests · Settings**. The centre **+** is a large raised accent button that opens *New recipe*.
- **Desktop:**
  - **Left sidebar:** New recipe button, Cookbook, Collections, Tags, Grocery, Requests, Settings.
  - **Middle pane:** searchable recipe list.
  - **Right pane:** the selected recipe or the editor.
  - A `?` sheet lists keyboard shortcuts.

---

## 6. Screens to design (in priority order)

Use the realistic sample content in section 8. For each screen, design **phone and desktop** unless noted, in **light mode**, plus the listed extra states.

### ★1. Voice capture: guided "Tell it" (hero screen)
One question at a time, like a gentle interview.
- **Top:** a progress indicator (e.g. "Ingredients · step 4 of 7") and a quiet "Exit" (the draft is saved).
- **Centre:** the question in large Fraunces, e.g. *"Tell me the ingredients, one at a time."*, with a helper line: *Say "next" after each one, "done" when you're finished.*
- **The big mic button** (≥ 120px), labelled "Tap to talk" or "Listening…".
- **Live transcript** (partial speech in muted text as she talks).
- **A list of parsed rows** appearing as she speaks: `2 · cups · basmati rice`, `1 · tbsp · ginger garlic paste`, `a handful · coriander leaves`. The newest row is highlighted briefly.
- **Secondary controls:** a "Hands-free" toggle, "Undo last", and "Type instead".
- **States to show:** idle · **listening** · processing · mic permission denied (friendly help) · speech not supported (points to typing).
- Also show the steps question, where each spoken step becomes a card and "10 minutes" becomes a **timer chip**.
- Also show the tips question with **Record a voice note**, and one **story prompt** ("Who taught you this?").

### 1b. Voice capture: "Just talk" (secondary mode)
A secondary option, not a hero screen: keep it simple and reuse the Tell it components. The app sorts the monologue into a rough draft, so set expectations honestly ("Just talk. We'll sort it out, then you check it."). The alternative to the guided interview: one free-flowing monologue while cooking. A big mic button, a running live transcript, a timer showing how long they've been talking, and a **Done** button that goes to Review. It should feel relaxed, not like a form.

### ★2. Cook mode (hero screen)
Hands-free, readable from 1–2 metres away.
- **One step at a time in very large text** (about 48–64px). Step X of Y and a progress bar.
- Ingredient names in the step are **highlighted**; tapping one shows its amount in a small popover.
- An optional **step photo** ("It should look like this").
- **Pinned timers** at the top. Several can run at once, each with a label and time left, and one should be close to finishing.
- **A voice indicator** ("Listening for: next · back · repeat · timer"), plus large **Back / Next** buttons and a **Read aloud** button.
- **Ingredients sheet** with a checklist, a servings scaler (− 4 +) and a Metric/Imperial toggle.
- **Frames:** phone portrait, **tablet landscape** (ingredients checklist pinned left, huge step right), and desktop.
- **States:** timer finished (a loud but friendly full-width alert) · last step → **"I made it!"** sheet (rating, add photo, note like "less chilli next time").
- Also show **dark mode** for this screen.

### ★3. Typed editor ("Type it")
It must feel smart and fast, never like a plain form.
- **Title, author** ("From ___'s kitchen"), servings, prep and cook time, hero photo.
- **Smart ingredient lines:** the user types `2 cups basmati rice, washed`, and a small **live preview** under the line shows how it was understood: **2** · **cups** · basmati rice · *washed*.
  - Show one line mid-typing with the preview, and one with an **autocomplete** dropdown.
  - Show a **section heading** row ("For the marinade:").
- **Steps:** numbered, with drag handles, inline **timer chips** ("⏱ 20 min"), highlighted ingredient mentions, and an "Add photo to this step" affordance.
- **Every text field has a small mic "dictate" button.**
- **Phone:** one section at a time (Details → Ingredients → Steps → Story) with a sticky **Save recipe** bar.
- **Desktop:** ingredients and steps **side by side**, with a subtle keyboard hint ("Enter for next line · Ctrl+S to save").
- **States:** "Draft saved" indicator; an **Undo toast** after deleting a line.

### 4. Recipe detail
- **Hero photo**, title, "*From Mom's kitchen*", time and servings meta, and tags.
- **"The story"** card near the top: a short quote in Fraunces italic, e.g. *"My mother made this every Eid. I learned by watching her hands, not measuring."*, with a small voice-note play button.
- **Ingredients** with the servings scaler and Metric/Imperial toggle, then numbered **Steps**.
- **Tips**, and **"In her words"**: a collapsible raw transcript in a softer, handwritten-adjacent style (still legible).
- **Original card photo** (a photo of a handwritten notebook page).
- **"I made it" log** (dates, ratings, notes), and "**Based on** Mom's Biryani" for forked recipes.
- **Actions:** **Start cooking** (primary), Edit, Make my version, Add to grocery list, Share, Print.

### 5. Library (home)
- A greeting ("Good evening"), search, collection chips (All · Mom's classics · Eid · Quick weeknights), and sort.
- Special cards at the top:
  - **Continue your draft** ("Chicken Karahi, started 2 days ago").
  - A **Recipe request**: "*Sam* would love to learn: **Nihari** · [Tell it]".
- **Recipe cards:** photo, title, author, time, "Made 12 times".
- **Desktop:** the full three-pane layout with a recipe open on the right.
- **Empty state / onboarding:** a warm illustration or typographic moment, with one big button: **"Let's save your first recipe."**

### 6. New recipe chooser (sheet or full screen)
Four large, equal choices with one-line explanations:
- 🎙 **Tell it**: "Answer a few questions out loud. We'll write it down."
- ⌨ **Type it**: "Type it the way you'd say it."
- 📋 **Paste it**: "From WhatsApp, notes or email."
- 🔗 **From a link**: "Import from a recipe website."

Below the four, a small secondary link: **"Or just talk freely"**, which opens Just talk (1b). It is deliberately quieter than the main choices.

### 6b. Paste it and From a link
**Paste it:** one large text area ("Paste a recipe from WhatsApp, notes or email") and a **Tidy it up** button that goes to Review. **From a link:** a URL field, a loading state, and a friendly failure ("We couldn't read that page. Try Paste it instead").

### 7. Review (after voice, paste or link import)
Large editable cards grouped as Details / Ingredients / Steps / Tips. Rows the parser was unsure about get a gentle "Check this" marker. Primary action: **Save recipe**.

### 8. Grocery list
Items grouped by aisle (Produce, Spices, Dairy…), merged quantities ("3 onions · from Biryani, Karahi"), satisfying check-offs, "Clear checked", and add a manual item.

### 9. Requests
A list of wished-for recipes (title, requested by, note), plus "Send request" (share link) and "Tell it now" actions. Fulfilled requests show a small celebratory state.

### 10. Settings
The **Text size** control with a **live preview** paragraph, Theme (Light / Dark / System), About you (your name, default author, cookbook title), Voice (read steps aloud, speak the questions, speech speed, voice), Backup ("Last backup: 34 days ago" with a gentle nudge, plus Restore), and Keyboard shortcuts.

### 11. Print: the family cookbook (nice to have)
A **cover page** ("Mom's Kitchen", an optional photo, the year), a contents page, and one recipe page and one story page, at A4/Letter in print-friendly black on white.

## 7. Components to define
App shell (tab bar, desktop sidebar) · Buttons (primary, secondary, quiet, destructive; sizes L/XL) · **BigMicButton** (idle, listening, processing, disabled, denied) · Text field + dictate button · **Smart ingredient line** (with parse preview and autocomplete) · Step row (drag handle, timer chip, photo) · **Timer chip** and **pinned timer** · Recipe card · Special cards (draft, request) · Chips and segmented controls (collections, Metric/Imperial, text size) · Servings stepper · Checklist item · Sheet / modal · **Undo toast** · Voice-note player · Story quote card · Empty state · Focus ring style.

## 8. Sample content (use this, not lorem ipsum)
**Mom's Chicken Biryani**. From Mom's kitchen · Serves 6 · Prep 30 min · Cook 1 hr 15 min · Tags: Rice, Eid, Mom's classics
- *For the marinade:* 1 kg chicken, bone-in · 1 cup yogurt · 1 tbsp ginger garlic paste · 2 tsp red chilli powder · 1 tsp turmeric · salt to taste
- *For the rice:* 3 cups basmati rice, washed and soaked · 4 green cardamom · 1 bay leaf
- *To finish:* 2 onions, thinly sliced and fried · a handful of mint leaves · a handful of coriander · a pinch of saffron in 2 tbsp warm milk
- **Steps:**
  1. Mix the chicken with the yogurt and all the spices and leave it for at least **30 minutes**.
  2. Boil the rice with the cardamom and bay leaf until it's about three-quarters done, around **7 minutes**, then drain.
  3. Cook the chicken on medium heat until the oil comes to the top, about **25 minutes**.
  4. Layer the rice over the chicken, then scatter the onions, mint, coriander and saffron milk.
  5. Cover tightly and keep on the lowest heat for **20 minutes** until the steam comes out.
- **Tip:** "Don't stir after layering. Just trust it."
- **Story:** *"Who taught you this?"* → "My mother, every Eid. I learned by watching her hands, not measuring."
- **In her words (transcript excerpt):** "okay so first you take the chicken, about a kilo, and put the yogurt, maybe a cup, and then the masala, you know, the red chilli, haldi, a little salt…"

**Other cards:** Sunday Lentil Soup (Dad · 40 min · Made 8 times) · Aloo Paratha (Mom · 35 min) · Grandma's Banana Bread (Nani · 1 hr 10 min · Made 15 times) · Quick Tomato Pasta (Me · 20 min, "Based on Mom's Pasta").

## 9. What to hand back to engineering
The build uses **React + Tailwind CSS v4 + React Aria Components**, so everything should be expressible as tokens and reusable components.
1. **Design tokens** as a single CSS file of custom properties, using exactly these names so it drops straight into the codebase (`src/design/tokens.css`):
   ```css
   :root {                       /* light */
     --paper; --surface; --sunk;            /* background, cards/sheets, recessed inputs/sidebar */
     --ink; --ink-muted;                    /* body text (AAA), secondary text (≥ 4.5:1) */
     --line; --line-strong;                 /* hairlines, control borders */
     --accent; --accent-strong; --accent-soft;  /* primary action + mic, hover, highlight */
     --accent-ink; --accent-text;           /* text on accent, accent used as text on paper */
     --success; --success-soft; --danger; --danger-soft;
     --focus;                               /* focus ring */
     --shadow-color;                        /* "r g b", used inside shadows */
     --font-display; --font-display-settings; --font-display-weight;
     --font-body; --font-handwritten; --font-handwritten-settings;  /* "In her words" */
     --ease-out; --dur;
   }
   :root[data-theme='dark'] { /* the same colour tokens */ }
   @theme {                      /* sizes in rem, 1rem = 18px */
     --spacing;                             /* grid unit */
     --text-sm … --text-4xl;                /* 14 18 22 28 36 48 64, each with --text-*--line-height */
     --radius-sm; --radius-md; --radius-lg; --radius-xl;
     --shadow-paper; --shadow-lift;
     --animate-breathe; --animate-rise; --animate-pop;  /* mic listening, sheets/toasts, check-offs */
   }
   ```
   Plus the font families to self-host.
2. **Component sheet** (section 7) with all states: hover, focus, pressed, disabled, and the mic's listening state.
3. **Final screens**, the ★ screens first, at 390px and 1440px (plus tablet-landscape cook mode), including the extra states listed.
4. **One screen at "Huge" text size** and **cook mode in dark mode**.
5. Short notes on anything non-obvious: animations, what the mic ring does, how parse previews appear.

Export the handoff bundle, and also download the zip as a backup.
