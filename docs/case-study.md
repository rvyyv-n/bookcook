# Bookcook: case study outline

An outline to write up alongside a demo video. The facts from the build are filled in; the parts marked _To write_ need your own account of testing it with Mom and what changed.

## 1. The problem

- Family recipes often live only in one person's head, and they're lost when that person can no longer cook or tell them.
- The people who hold them are mostly 55 to 75. Many wear reading glasses, cook with wet or busy hands, and don't want to type on a phone.
- Recipe apps assume a written recipe to copy in, small text and a lot of tapping.
- _To write:_ the moment this became personal: which recipe, and whose.

## 2. Who it's for

- The teller: says the recipe out loud, the way they'd tell a friend.
- The learner: cooks from it, hands-free, reading from across the kitchen.
- _To write:_ Mom, briefly: how she cooks, what she found hard with other apps.

## 3. Constraints I set

- **No backend and no accounts.** Everything stays on the device (IndexedDB); share and request links carry the recipe after the `#`.
- **No AI and no paid services.** A rule-based parser turns speech and typing into ingredients, steps and timers.
- **Voice and typing are equal.** Neither is a fallback; both feed one parser, one draft and one editor.
- **Large and calm.** 16px body text at the smallest setting, 56px targets, three text sizes up to Huge, one primary button per screen.

## 4. How it was made

- A written plan and design brief, then a visual design handoff with five skins, tokens and an acceptance checklist.
- Built in phases on branches, each reviewed before merging: parser, design system and library, typed entry, voice capture, cook mode, kitchen extras, safety and sharing, Android app, polish.
- The parser was built test-first against a fixture corpus, with a held-out set that was scored before any tuning.

## 5. Key decisions

- **Tell it as an interview.** One question at a time, with "next" and "done", so each answer is short enough to parse and easy to check. Just talk is there for people who'd rather ramble.
- **"Check this", never an error.** When the parser isn't sure, the line is kept as said and marked for a look.
- **The teller's own words.** The story and any talk around the recipe are kept verbatim as "In her words".
- **Cook mode built for distance.** One step at a time in the largest type in the app, voice commands, several timers that survive a reload, and the screen kept awake.
- **Skins as tokens.** The same components wear five looks; a skin changes values, not layouts.

## 6. Testing with Mom

- _To write:_ the set-up (her phone or yours, which recipe, Tell it or Just talk).
- _To write:_ what she did without help.
- _To write:_ where she got stuck, in her words if you can.
- _To write:_ what surprised you.

## 7. What changed

- _To write:_ the changes that came from watching her, before and after.
- Changes made during the build's own review, for reference:
  - A three-step welcome that sets the text size first and asks for the microphone with plain help if it's blocked.
  - Every target raised to at least 56px and every label to at least 14px after the accessibility pass.
  - Phone wording for a blocked microphone in the Android app, instead of browser steps.

## 8. Results

- Parser: 214 of 214 fixture cases; 72% on held-out text before tuning.
- Lighthouse on the live site: Accessibility, Best practices and SEO 100 on mobile and desktop; Performance 98 on desktop and 75 on mobile.
- An automated accessibility audit of every screen in every skin, light and dark, at Normal and Huge, finds no problems.
- _To write:_ what Mom said at the end, and whether the recipe is now saved.

## 9. What's next

- Split the app's script by screen, to speed up the first visit on phones.
- Move hosting to Cloudflare Pages so importing from a link works on the live site.
- Later: meal planning, scanning printed recipes, optional family sync, more languages.

## Demo video

- _To write:_ link, and a shot list: Tell it a recipe, check it, cook from it hands-free with a timer, share it.
