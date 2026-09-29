import { cookMode } from './cook';
import { hearHeadline, momsCard } from './hero';
import { looks } from './looks';
import { deckTilt, getbar, pageColour, pointerFills, risingHeadings, scrollMoments, stickyNav } from './motion';
import { drawIcons, onScreen, reducedMotion, wait } from './site';
import { sizeControls } from './size';
import { tellIt } from './tell';

drawIcons();

// Follow the device between light and dark while the page is open.
const dark = matchMedia('(prefers-color-scheme: dark)');
dark.addEventListener('change', () => (document.documentElement.dataset.theme = dark.matches ? 'dark' : 'light'));

stickyNav();
pageColour();
pointerFills();
sizeControls();
risingHeadings();
scrollMoments();
deckTilt();
getbar();
tellIt();
cookMode();
looks();

// The opening, once the fonts are in so nothing shifts: the headline is heard, then Mom's card deals in and writes itself.
// On a phone the card sits below the headline: it deals in once it peeks onto the screen, and talks once it's scrolled to.
const card = momsCard();
void document.fonts.ready.then(async () => {
  if (reducedMotion()) {
    card.deal();
    card.start();
    return void hearHeadline();
  }
  const heard = hearHeadline();
  await Promise.all([wait(900), onScreen(document.querySelector('.deck')!, 0)]);
  card.deal();
  await Promise.all([heard, wait(900), onScreen(document.getElementById('transcript')!, 0.6)]);
  card.start();
});
