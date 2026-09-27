// The mocks use Material Symbols Rounded. The build uses lucide-react.
// This is the agreed mapping. Every icon sits next to a visible text label,
// so these are always decorative (aria-hidden).
//
// Rendering rules (to match the mocks' weight and size):
// - size 24 (26 in cook controls, 48 in BigMicButton), strokeWidth 2
// - "active / current" states in the mocks used FILL 1. In lucide, use
//   strokeWidth 2.5 for the current tab/sidebar item; use fill="currentColor"
//   only for Star (rating), Play/Pause and the recording dot.
import {
  AlarmClock, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, AudioLines, BookOpen, Camera,
  Check, CheckCheck, ChevronRight, ChevronUp, CircleDot, CircleHelp, CircleStop, ClipboardPaste,
  CloudCheck, CloudUpload, CookingPot, Download, Frown, GitFork, GripVertical, HandHeart, Heading,
  ImagePlus, Keyboard, Library, Link, ListChecks, ListX, Mic, MicOff, Minus, NotebookPen, PartyPopper,
  Pause, Pencil, Play, Plus, Printer, Quote, RotateCw, Search, Send, Settings, Share, ShoppingBasket,
  ShoppingCart, SkipForward, Star, Tag, Timer, Undo2, Volume2, WandSparkles, X,
  type LucideIcon,
} from 'lucide-react';

export const icons = {
  mic: Mic,                       // mic
  micOff: MicOff,                 // mic_off
  listening: AudioLines,          // graphic_eq
  keyboard: Keyboard,             // keyboard
  paste: ClipboardPaste,          // content_paste
  link: Link,                     // link
  close: X,                       // close
  back: ArrowLeft,                // arrow_back
  next: ArrowRight,               // arrow_forward
  up: ArrowUp,                    // arrow_upward (Move → Up)
  down: ArrowDown,                // arrow_downward (Move → Down)
  read: Volume2,                  // volume_up
  stop: CircleStop,               // stop_circle
  madeIt: PartyPopper,            // celebration
  ingredients: ListChecks,        // checklist
  timer: Timer,                   // timer
  alarm: AlarmClock,              // alarm (hot / finished timer)
  check: Check,                   // check
  undo: Undo2,                    // undo
  saved: CloudCheck,              // cloud_done
  add: Plus,                      // add
  remove: Minus,                  // remove
  drag: GripVertical,             // drag_indicator
  addPhoto: ImagePlus,            // add_a_photo
  camera: Camera,                 // photo_camera
  section: Heading,               // title
  skip: SkipForward,              // skip_next
  done: CheckCheck,               // done_all
  record: CircleDot,              // radio_button_checked
  checkThis: CircleHelp,          // help
  retry: RotateCw,                // refresh
  tidy: WandSparkles,             // auto_fix_high
  download: Download,             // download
  failed: Frown,                  // sentiment_dissatisfied
  edit: Pencil,                   // edit
  myVersion: GitFork,             // call_split
  addToGrocery: ShoppingCart,     // add_shopping_cart
  share: Share,                   // ios_share
  print: Printer,                 // print
  play: Play,                     // play_arrow
  pause: Pause,                   // pause
  transcript: Quote,              // format_quote
  collapse: ChevronUp,            // expand_less
  chevron: ChevronRight,          // chevron_right
  star: Star,                     // star
  startCooking: CookingPot,       // skillet
  cookbook: BookOpen,             // menu_book
  grocery: ShoppingBasket,        // shopping_basket
  requests: HandHeart,            // volunteer_activism
  settings: Settings,             // settings
  collections: Library,           // collections_bookmark
  tags: Tag,                      // sell
  search: Search,                 // search
  sort: ArrowUpDown,              // swap_vert
  send: Send,                     // send
  draft: NotebookPen,             // edit_note
  clearChecked: ListX,            // remove_done
  backup: CloudUpload,            // cloud_upload
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
