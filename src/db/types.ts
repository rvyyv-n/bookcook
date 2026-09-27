import type { ParseCheck, Quantity } from '../lib/parse/types';

export type RecipeSource = 'voice' | 'typed' | 'pasted' | 'web' | 'imported';

export interface Ingredient {
  id: string;
  quantity?: Quantity;
  unit?: string;
  name: string;
  note?: string;
  section?: string;
  /** Drafts only: set by the parser for Review, dropped when the recipe is saved. */
  check?: ParseCheck;
}

export interface Step {
  id: string;
  text: string;
  timerSeconds?: number;
  photoId?: string;
  /** Drafts only: set by the parser for Review, dropped when the recipe is saved. */
  check?: ParseCheck;
}

export interface StoryAnswer {
  prompt: string;
  answer: string;
  audioId?: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  lang: string;
  tags: string[];
  collectionIds: string[];
  ingredients: Ingredient[];
  steps: Step[];
  tips?: string;
  /** "In her words": the raw transcript. */
  transcript?: string;
  story?: StoryAnswer[];
  photoIds: string[];
  originalCardPhotoIds: string[];
  voiceNoteIds: string[];
  /** The voice note recorded for the tips (one of `voiceNoteIds`). */
  tipsAudioId?: string;
  source: RecipeSource;
  sourceUrl?: string;
  /** "My version": the recipe this one was forked from. */
  forkedFromId?: string;
  cookedCount: number;
  lastCookedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type DraftMode = 'tell' | 'talk' | 'type' | 'paste' | 'link' | 'edit';

export interface Draft {
  id: string;
  mode: DraftMode;
  recipe: Partial<Recipe>;
  /** Where the user was in a guided flow (e.g. "ingredients"). */
  step?: string;
  /** For drafts that edit an existing recipe. */
  recipeId?: string;
  /** For drafts started from a request. */
  requestId?: string;
  /** Ingredient lines exactly as typed (the editor's source of truth). */
  ingredientLines?: { id: string; text: string }[];
  /** Guided-capture progress that isn't part of the recipe (e.g. the story prompt being answered). */
  progress?: Record<string, unknown>;
  updatedAt: number;
}

export interface CookLog {
  id: string;
  recipeId: string;
  cookedAt: number;
  rating?: number;
  note?: string;
  photoId?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  /** Ranges are kept: "1–2 lemons" + "1 lemon" = "2–3 lemons". */
  quantity?: Quantity;
  unit?: string;
  aisle?: string;
  checked: boolean;
  fromRecipeIds: string[];
  order: number;
}

export type RequestDirection = 'incoming' | 'outgoing';

export interface RecipeRequest {
  id: string;
  title: string;
  /** incoming: someone wants this recipe from you. outgoing: you asked someone for it. */
  direction: RequestDirection;
  /** Incoming: who asked. */
  requestedBy?: string;
  /** Outgoing: who you asked. */
  askedOf?: string;
  note?: string;
  createdAt: number;
  fulfilledRecipeId?: string;
}

export interface Collection {
  id: string;
  name: string;
  order: number;
  /** A topic icon name (src/ui/TopicIcon.tsx) picked for it. Without one, it's guessed from the name. */
  icon?: string;
}

export type MediaKind = 'photo' | 'audio';

export interface Media {
  id: string;
  recipeId?: string;
  kind: MediaKind;
  blob: Blob;
  mime: string;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}
