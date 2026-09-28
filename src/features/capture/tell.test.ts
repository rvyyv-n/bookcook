import { describe, expect, it } from 'vitest';
import { advance, cleanAuthor, cleanTitle, hear, spokenSection, type TellState } from './tell';

const start = (stage: TellState['stage'], recipe: TellState['recipe'] = {}): TellState => ({ stage, recipe });

function changed(state: TellState, text: string): TellState {
  const r = hear(state, text);
  if (r.kind !== 'changed') throw new Error(`expected a change, got ${r.kind}`);
  return r.state;
}

describe('Tell it', () => {
  it('tidies short answers', () => {
    expect(cleanTitle("it's chicken biryani.")).toBe('Chicken biryani');
    expect(cleanAuthor("it's my mom's recipe")).toBe('My mom');
    expect(cleanAuthor('Nani')).toBe('Nani');
  });

  it('moves on after a short answer', () => {
    const r = hear(start('title'), 'chicken biryani');
    expect(r).toMatchObject({ kind: 'changed', advance: true, state: { recipe: { title: 'Chicken biryani' } } });
  });

  it('needs a number for servings', () => {
    expect(hear(start('servings'), 'quite a lot').kind).toBe('unclear');
    expect(changed(start('servings'), 'about six people').recipe.servings).toBe(6);
  });

  it('adds one ingredient per phrase, split on "next", with sections', () => {
    let s = changed(start('ingredients'), 'for the marinade');
    s = changed(s, 'a kilo of chicken next one cup yogurt');
    expect(s.recipe.ingredients?.map((i) => [i.quantity, i.unit, i.name, i.section])).toEqual([
      [1, 'kg', 'chicken', 'Marinade'],
      [1, 'cup', 'yogurt', 'Marinade'],
    ]);
    expect(spokenSection('for the 2 onions')).toBeUndefined();
  });

  it('builds a step until "next", and finds its timer', () => {
    let s = changed(start('steps'), 'boil the rice');
    s = changed(s, 'for 7 minutes then drain');
    expect(s.open).toBe('boil the rice for 7 minutes then drain');
    const r = hear(s, 'next');
    expect(r.kind).toBe('changed');
    const steps = (r as { state: TellState }).state.recipe.steps!;
    expect(steps[0]).toMatchObject({ text: 'Boil the rice for 7 minutes then drain.', timerSeconds: 420 });
  });

  it('closes an open step when moving on', () => {
    const r = advance({ ...start('steps'), open: 'serve hot' });
    expect(r.state.stage).toBe('tips');
    expect(r.state.recipe.steps?.[0]?.text).toBe('Serve hot.');
  });

  it('steers with commands', () => {
    expect(hear(start('ingredients'), 'undo').kind).toBe('undo');
    expect(hear(start('ingredients'), 'next').kind).toBe('nothing');
    expect(hear(start('ingredients'), "that's it")).toMatchObject({ kind: 'advance', state: { stage: 'steps' } });
    expect(hear(start('story'), 'done').kind).toBe('finish');
  });

  it('keeps what was said as the transcript', () => {
    let s = changed(start('tips'), "don't stir after layering");
    s = changed(s, 'just trust it');
    expect(s.recipe.tips).toBe("Don't stir after layering. Just trust it.");
    expect(s.recipe.transcript).toBe("don't stir after layering\njust trust it");
  });
});
