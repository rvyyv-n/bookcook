import { cookMode } from './cook';
import { hearHeadline, momsCard } from './hero';
import { looks } from './looks';
import { deckTilt, getbar, pageColour, pointerFills, risingHeadings, scrollMoments, stickyNav } from './motion';
import { drawIcons, reducedMotion } from './site';
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
const card = momsCard();
void document.fonts.ready.then(async () => {
  if (reducedMotion()) {
    card.deal();
    card.start();
    return void hearHeadline();
  }
  const heard = hearHeadline();
  setTimeout(() => card.deal(), 900);
  await heard;
  card.start();
});
