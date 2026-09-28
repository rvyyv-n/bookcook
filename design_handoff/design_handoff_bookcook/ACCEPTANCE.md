# Bookcook — acceptance checklist

Run this on **every screen** before calling it done. Test on a 390×844 phone viewport and a 1280×800 desktop viewport. Test cook mode on a 1180×820 tablet as well.

## Theming
- [ ] Looks right in all 5 skins: quiet, heirloom, spice-tin, colour-coded, colour-field. Compare with `screenshots/`.
- [ ] Light and dark both work, and **System** follows the OS live.
- [ ] Tomato and saffron both work. In colour-field, the accent control shows "Tomato (fixed)" and the setting is ignored.
- [ ] Ingredient colours on and off both work in every skin. Quiet and heirloom show a dot and hairline, with the text staying ink. The tin family shows tinted pills. With fewer than 2 sections, nothing is coloured.
- [ ] No colour, size or font is hard-coded outside `src/design/`.

## Text size
- [ ] **Normal, Large and Huge** all reflow: nothing is clipped, truncated, overlapping or scrolling sideways (except the chip row, which scrolls on purpose).
- [ ] At Huge, the cook-mode step text, timers and Back / Read / Next still fit on a 390px phone. Timers may stack.
- [ ] Changing the text size in Settings updates the preview and the whole app immediately.

## Accessibility
- [ ] Body text is 18px or larger at Normal. Ink on paper is 7:1 or more (AAA). Muted text is 4.5:1 or more and is never needed to act. Check with the tokens' contrast audit in `docs/themes.md`.
- [ ] Every target is 56px or more in both directions (tab items 64, cook controls 76, mic 120). Whole rows are targets.
- [ ] Every icon has a visible text label. There are no icon-only buttons.
- [ ] There's exactly **one** primary (accent) button per screen.
- [ ] You can use everything from the keyboard: logical tab order, a visible 3px focus ring offset 3px, Esc closes sheets and popovers, and sheets trap focus.
- [ ] Every drag has a button alternative (Move → Up / Down). No action is swipe-only.
- [ ] Destructive actions show an UndoToast (6s, pauses on hover or focus, `role="status"`). There are no confirm dialogs.
- [ ] Screen reader: timers read like "Rice timer, 42 seconds left, almost done". Mentions read like "chicken, 1 kg". The servings value is `aria-live="polite"`. The timer alert is `role="alert"`. Read / Stop and the mic use `aria-pressed`. Hands-free and the settings switches use `role="switch"`.
- [ ] With reduced motion, there's no breathing, sliding or popping, but every state change still happens and is still announced.

## Voice
- [ ] The mic is always a single tap to toggle, never press-and-hold.
- [ ] Mic **denied** shows the friendly 3-step help with Try again and Type instead. Speech **unsupported** hides the mic, and Type it becomes the primary action.
- [ ] The cook-mode indicator is just a pulse plus one word. The commands (next, back, repeat, timer, stop) are never listed on screen.
- [ ] Read becomes Stop while speaking. Next stops speech first. On the last step, Next becomes "I made it".
- [ ] A timer finishing is both shown (full-width alert) and spoken, repeats until stopped, and saying "stop" silences it.
- [ ] Live words are muted and turn to ink once understood.

## Copy
- [ ] The copy matches the mocks word for word. Short, one-word actions (Save, Edit, Read, Next, Back, Undo, Speak, Move). It's "Read", never "Read aloud", and never Submit, Proceed, OK or Confirm.
- [ ] Sentence case everywhere (heirloom small caps come from a token). No exclamation marks and no emoji.

## Cook mode (hero)
- [ ] Readable from 2 metres at Normal on a phone.
- [ ] Back and Read are equal width, and Next is 1.5×.
- [ ] Several timers can run at once. Under a minute a timer goes hot, and running timers survive a reload.
- [ ] The mention popover shows the **scaled** amount (it follows the servings stepper and Metric/Imperial).
- [ ] The step photo follows its setting. With the setting off, there's no empty gap.
- [ ] Colour-field cook mode is fully on the accent field (`data-surface="field"`) in both light and dark.

## Print
- [ ] Always black on white, whatever the mode, accent or skin. Only the display face changes.
- [ ] Letter and A4 both paginate cleanly: one recipe per page start, and no orphaned headings.
