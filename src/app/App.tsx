import type { ComponentType } from 'react';
import { createBrowserRouter, Outlet, RouterProvider, useLoaderData, useRouteError } from 'react-router';
import { firstRunLoader } from '../features/onboarding/firstRun';
import { WelcomePage } from '../features/onboarding/Welcome';
import { CookbookPage } from '../features/library/Cookbook';
import { useT } from '../i18n';
import { ButtonLink } from '../ui/Button';
import { MovedSheet, movedLoader } from './moved';
import { Providers } from './providers';
import { AppShell } from './Shell';

/**
 * Loads a screen's code the first time it's opened, so the first screen draws sooner.
 * The cookbook, the welcome and the app shell stay in the main bundle.
 */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return async () => ({ Component: (await load())[name] as ComponentType });
}

function BootScreen() {
  return (
    <div className="boot" aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" />
    </div>
  );
}

function Root() {
  const moved = useLoaderData<typeof movedLoader>();
  return (
    <Providers>
      <Outlet />
      {moved && <MovedSheet />}
    </Providers>
  );
}

function NotFound() {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-3xl">{t.ui.common.notFound}</h1>
      <ButtonLink href="/" variant="primary" icon="cookbook">
        {t.ui.common.goHome}
      </ButtonLink>
    </div>
  );
}

function RouteError() {
  const error = useRouteError();
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="text-ink-muted">Your recipes are safe. Reload the page to try again.</p>
      <pre className="overflow-auto rounded-md bg-sunk p-3 text-[0.875rem]">{error instanceof Error ? error.message : String(error)}</pre>
      <a href={import.meta.env.BASE_URL} className="font-bold underline">
        Go to your cookbook
      </a>
    </main>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <Root />,
      loader: movedLoader,
      errorElement: <RouteError />,
      // The first-run check reads the database before drawing; meanwhile the loading screen from index.html stays.
      HydrateFallback: BootScreen,
      children: [
        // Full-screen, no app shell: cook mode, Tell it, Just talk, Check your recipe and the welcome.
        { path: '/r/:id/cook', lazy: page(() => import('../features/cook/CookMode'), 'CookModePage') },
        { path: '/new/tell/:draftId', lazy: page(() => import('../features/capture/TellIt'), 'TellItPage') },
        { path: '/new/talk/:draftId', lazy: page(() => import('../features/capture/JustTalk'), 'JustTalkPage') },
        { path: '/new/review/:draftId', lazy: page(() => import('../features/editor/Review'), 'ReviewPage') },
        { path: '/print', lazy: page(() => import('../features/print/PrintPage'), 'PrintPage') },
        { path: '/welcome', element: <WelcomePage /> },
        {
          element: <AppShell />,
          children: [
            { path: '/', element: <CookbookPage />, loader: firstRunLoader },
            { path: '/r/:id', lazy: page(() => import('../features/recipe/RecipeDetail'), 'RecipeDetailPage') },
            { path: '/r/:id/edit', lazy: page(() => import('../features/editor/RecipeEditor'), 'EditRecipePage') },
            { path: '/new', lazy: page(() => import('../features/capture/NewRecipe'), 'NewRecipePage') },
            { path: '/new/type/:draftId', lazy: page(() => import('../features/editor/RecipeEditor'), 'TypeItPage') },
            { path: '/new/paste/:draftId', lazy: page(() => import('../features/capture/PasteIt'), 'PasteItPage') },
            { path: '/new/link/:draftId', lazy: page(() => import('../features/capture/FromLink'), 'FromLinkPage') },
            { path: '/c', lazy: page(() => import('../features/library/Browse'), 'CollectionsPage') },
            { path: '/c/:id', lazy: page(() => import('../features/library/Browse'), 'CollectionPage') },
            { path: '/t', lazy: page(() => import('../features/library/Browse'), 'TagsPage') },
            { path: '/t/:tag', lazy: page(() => import('../features/library/Browse'), 'TagPage') },
            { path: '/grocery', lazy: page(() => import('../features/grocery/GroceryPage'), 'GroceryPage') },
            { path: '/requests', lazy: page(() => import('../features/requests/RequestsPage'), 'RequestsPage') },
            { path: '/settings', lazy: page(() => import('../features/settings/SettingsPage'), 'SettingsPage') },
            { path: '/import', lazy: page(() => import('../features/requests/ImportPage'), 'ImportPage') },
            { path: '*', element: <NotFound /> },
          ],
        },
      ],
    },
  ],
  {
    // "/bookcook/" on GitHub Pages, "/" everywhere else.
    basename: import.meta.env.BASE_URL,
  },
);

export function App() {
  return <RouterProvider router={router} />;
}
