import {
  Apple,
  Beef,
  Cake,
  Carrot,
  Coffee,
  Cookie,
  Croissant,
  Drumstick,
  Egg,
  Fish,
  Flame,
  Gift,
  Heart,
  IceCreamCone,
  Leaf,
  Moon,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Star,
  Sun,
  Utensils,
  Wheat,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

/**
 * Icons for collections and tags, from the same lucide set and drawn the same way as `Icon`. They sit
 * next to the collection or tag name, so they're hidden from assistive tech.
 */
export const topicIcons = {
  utensils: Utensils,
  heart: Heart,
  star: Star,
  zap: Zap,
  moon: Moon,
  sun: Sun,
  gift: Gift,
  cake: Cake,
  cookie: Cookie,
  iceCream: IceCreamCone,
  croissant: Croissant,
  wheat: Wheat,
  soup: Soup,
  salad: Salad,
  leaf: Leaf,
  carrot: Carrot,
  apple: Apple,
  egg: Egg,
  drumstick: Drumstick,
  beef: Beef,
  fish: Fish,
  flame: Flame,
  coffee: Coffee,
  pizza: Pizza,
  sandwich: Sandwich,
} satisfies Record<string, LucideIcon>;

export type TopicIconName = keyof typeof topicIcons;
export const TOPIC_ICONS = Object.keys(topicIcons) as TopicIconName[];

export const isTopicIcon = (name: string | undefined): name is TopicIconName => !!name && name in topicIcons;

export function TopicIcon({ name, size = 24, ...rest }: { name: TopicIconName; size?: number | string } & Omit<LucideProps, 'ref'>) {
  const Glyph = topicIcons[name];
  return <Glyph size={size} strokeWidth={2} aria-hidden="true" focusable="false" {...rest} />;
}
