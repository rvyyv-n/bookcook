import { isTopicIcon, type TopicIconName } from '../../ui/TopicIcon';

/** Words in a collection or tag name → the icon it gets unless someone picks another. First match wins. */
const GUESSES: [RegExp, TopicIconName][] = [
  [/eid|ramadan|iftar|suhoor|diwali/, 'moon'],
  [/quick|weeknight|fast|easy|busy|minute/, 'zap'],
  [/mom|mum|mother|dad|nani|nana|dadi|grand|family|classic|favou?rite|heirloom/, 'heart'],
  [/christmas|holiday|party|birthday|festive|celebrat|guest/, 'gift'],
  [/summer|bbq|barbecue|grill|picnic/, 'sun'],
  [/bak|cake|dessert|sweet|pudding/, 'cake'],
  [/cookie|biscuit|snack/, 'cookie'],
  [/ice ?cream|frozen/, 'iceCream'],
  [/bread|loaf|pastr|breakfast|brunch/, 'croissant'],
  [/rice|biryani|pulao|pilaf|grain|pasta|noodle/, 'wheat'],
  [/soup|stew|broth|dal|daal|lentil|curry/, 'soup'],
  [/salad/, 'salad'],
  [/vegan|vegetarian|veg|plant|green/, 'leaf'],
  [/fruit/, 'apple'],
  [/egg/, 'egg'],
  [/chicken|poultry|turkey/, 'drumstick'],
  [/beef|meat|mutton|lamb|goat|pork/, 'beef'],
  [/fish|seafood|prawn|shrimp/, 'fish'],
  [/spic|hot|chilli|chili/, 'flame'],
  [/drink|tea|chai|coffee|juice/, 'coffee'],
  [/pizza/, 'pizza'],
  [/sandwich|lunch/, 'sandwich'],
];

/** The icon for a collection (its own choice, if it has one) or a tag. */
export function topicIcon(name: string, chosen?: string): TopicIconName {
  if (isTopicIcon(chosen)) return chosen;
  const n = name.toLowerCase();
  return GUESSES.find(([re]) => re.test(n))?.[1] ?? 'utensils';
}
