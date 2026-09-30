import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Disclosure } from 'react-aria-components';
import { useLocation, useNavigate } from 'react-router';
import { useRecipe } from '../../db/hooks';
import { addSharedRecipe } from '../../db/recipes';
import { addRequest, getRequest } from '../../db/requests';
import { useT } from '../../i18n';
import { requestPersistentStorage } from '../../lib/platform/storagePersist';
import { readRecipeLink, readRequestLink, type SharedRecipe, type SharedRequest } from '../../lib/shareLink';
import { formatIngredient } from '../../lib/parse/ingredient';
import { Button, ButtonLink } from '../../ui/Button';
import { FoldPanel } from '../../ui/Fold';
import { FoldRow } from '../../ui/Rows';
import { useToast } from '../../ui/Toast';
import { useTellIt } from '../library/SpecialCards';

/** Keeps a request from a link, once (the sender's id is reused, so a second open changes nothing). */
async function keep(shared: SharedRequest): Promise<void> {
  if (await getRequest(shared.id)) return;
  await addRequest({
    id: shared.id,
    title: shared.title,
    direction: 'incoming',
    ...(shared.from ? { requestedBy: shared.from } : {}),
    ...(shared.note ? { note: shared.note } : {}),
  });
}

/** `/import#recipe=…` or `/import#request=…`: a recipe someone shared, or a request for one. */
export function ImportPage() {
  const t = useT();
  const { hash } = useLocation();
  const recipe = useMemo(() => readRecipeLink(hash), [hash]);
  const request = useMemo(() => (recipe ? undefined : readRequestLink(hash)), [hash, recipe]);
  if (recipe) return <SharedRecipePage shared={recipe} />;
  if (request) return <SharedRequestPage shared={request} />;
  return (
    <div className="flex max-w-xl flex-col items-start gap-4 py-10">
      <h1 className="text-3xl leading-none">{t.ui.requests.badTitle}</h1>
      <p className="text-lg">{t.ui.requests.badLink}</p>
      <ButtonLink href="/" variant="primary" icon="cookbook">
        {t.ui.common.goHome}
      </ButtonLink>
    </div>
  );
}

/** Someone shared a recipe: Add to my cookbook, or Open it if it's already there. */
function SharedRecipePage({ shared }: { shared: SharedRecipe }) {
  const t = useT();
  const tr = t.ui.requests;
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const have = useRecipe(shared.id);
  const request = useLiveQuery(async () => (shared.requestId ? ((await getRequest(shared.requestId)) ?? null) : null), [shared.requestId]);
  const { recipe } = shared;
  const story = recipe.story?.find((st) => st.answer.trim())?.answer;
  const answers = request?.direction === 'outgoing' && request.fulfilledRecipeId !== shared.id;

  return (
    <div className="flex max-w-xl flex-col gap-5 py-6 desk:py-10">
      <h1 className="text-3xl leading-none tracking-[-0.02em]">{tr.recipeTitle}</h1>
      <article className="flex flex-col gap-2.5 rounded-lg bg-accent-soft p-4.5">
        {recipe.author && <p className="type-display italic">{t.ui.common.fromKitchen(recipe.author)}</p>}
        <h2 className="type-display text-2xl leading-[1.05]">{recipe.title}</h2>
        {recipe.description && <p>{recipe.description}</p>}
        <p className="text-ink-muted">{tr.recipeCounts(recipe.ingredients?.length ?? 0, recipe.steps?.length ?? 0)}</p>
        {story && <p className="type-display text-lg leading-[1.3] italic">“{story}”</p>}
      </article>
      <RecipePreview recipe={recipe} />
      {answers && <p className="font-bold">{tr.answersRequest}</p>}
      {have === undefined ? null : have ? (
        <>
          <p className="text-ink-muted">{tr.alreadyHave}</p>
          <div>
            <ButtonLink href={`/r/${have.id}`} variant="primary" icon="cookbook">
              {tr.openIt}
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <p className="text-ink-muted">{tr.recipeBody}</p>
          <div>
            <Button
              variant="primary"
              icon="add"
              isDisabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  const { recipe: saved } = await addSharedRecipe(shared.id, recipe, shared.requestId);
                  void requestPersistentStorage();
                  toast.show({ message: tr.addedRecipe, tone: 'success' });
                  navigate(`/r/${saved.id}`, { replace: true });
                } catch {
                  toast.show({ message: tr.addFailed });
                  setBusy(false);
                }
              }}
            >
              {tr.addToCookbook}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** What's in a shared recipe, before it's added: the ingredients under their sections, and the steps folded. */
function RecipePreview({ recipe }: { recipe: SharedRecipe['recipe'] }) {
  const t = useT();
  const ingredients = recipe.ingredients ?? [];
  const steps = (recipe.steps ?? []).filter((st) => st.text.trim());
  if (!ingredients.length && !steps.length) return null;
  return (
    <div className="flex flex-col rounded-lg bg-surface px-4 shadow-paper [&>*:last-child]:border-b-0">
      {ingredients.length > 0 && (
        <section aria-labelledby="shared-ingredients" className="flex flex-col gap-1 border-b border-line py-3.5">
          <h2 id="shared-ingredients" className="type-heading text-lg">
            {t.ui.recipe.ingredients}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex flex-col">
                {ing.section && ing.section !== ingredients[i - 1]?.section && <b className="pt-2">{ing.section}</b>}
                <span>{formatIngredient(ing)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {steps.length > 0 && (
        <Disclosure className="flex flex-col">
          <FoldRow label={t.ui.recipe.steps} value={String(steps.length)} />
          <FoldPanel>
            <ol className="flex list-decimal flex-col gap-2 py-3.5 pl-6 marker:font-bold marker:text-ink-muted">
              {steps.map((st, i) => (
                <li key={i} className="pl-1">
                  {st.text}
                </li>
              ))}
            </ol>
          </FoldPanel>
        </Disclosure>
      )}
    </div>
  );
}

/** Someone would love to learn a recipe from you. */
function SharedRequestPage({ shared }: { shared: SharedRequest }) {
  const t = useT();
  const tr = t.ui.requests;
  const navigate = useNavigate();
  const toast = useToast();
  const tellIt = useTellIt();
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex max-w-xl flex-col gap-5 py-6 desk:py-10">
      <h1 className="text-3xl leading-none tracking-[-0.02em]">{tr.incomingTitle}</h1>
      <article className="flex flex-col gap-2.5 rounded-lg bg-accent-soft p-4.5">
        <p>
          {shared.from ? (
            <>
              <i className="type-display">{shared.from}</i> {tr.wouldLove}
            </>
          ) : (
            tr.incomingSomeone
          )}
        </p>
        <h2 className="type-display text-2xl leading-[1.05]">{shared.title}</h2>
        {shared.note && <p className="text-ink-muted">“{shared.note}”</p>}
      </article>
      <p className="text-ink-muted">{tr.incomingBody}</p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant="primary"
          icon="mic"
          isDisabled={busy}
          onPress={async () => {
            setBusy(true);
            await keep(shared);
            await tellIt(shared.title, shared.id);
          }}
        >
          {tr.tellItNow}
        </Button>
        <Button
          variant="secondary"
          icon="requests"
          isDisabled={busy}
          onPress={async () => {
            setBusy(true);
            await keep(shared);
            toast.show({ message: tr.added, tone: 'success' });
            navigate('/requests', { replace: true });
          }}
        >
          {tr.addToRequests}
        </Button>
      </div>
    </div>
  );
}
