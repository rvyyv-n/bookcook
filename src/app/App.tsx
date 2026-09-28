import { createBrowserRouter, Outlet, RouterProvider, useRouteError } from 'react-router';
import { FromLinkPage } from '../features/capture/FromLink';
import { NewRecipePage } from '../features/capture/NewRecipe';
import { JustTalkPage } from '../features/capture/JustTalk';
import { PasteItPage } from '../features/capture/PasteIt';
import { TellItPage } from '../features/capture/TellIt';
import { CookModePage } from '../features/cook/CookMode';
import { firstRunLoader } from '../features/onboarding/firstRun';
import { WelcomePage } from '../features/onboarding/Welcome';
import { PrintPage } from '../features/print/PrintPage';
import { GroceryPage } from '../features/grocery/GroceryPage';
import { EditRecipePage, TypeItPage } from '../features/editor/RecipeEditor';
import { ReviewPage } from '../features/editor/Review';
import { CollectionPage, CollectionsPage, TagPage, TagsPage } from '../features/library/Browse';
import { CookbookPage } from '../features/library/Cookbook';
import { RecipeDetailPage } from '../features/recipe/RecipeDetail';
import { ImportPage } from '../features/requests/ImportPage';
import { RequestsPage } from '../features/requests/RequestsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { useT } from '../i18n';
import { ButtonLink } from '../ui/Button';
import { Providers } from './providers';
import { AppShell } from './Shell';

function Root() {
  return (
    <Providers>
      <Outlet />
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
      errorElement: <RouteError />,
      // The first-run check reads the database before drawing, so there's nothing to show meanwhile.
      HydrateFallback: () => null,
      children: [
        // Full-screen, no app shell: cook mode, Tell it, Just talk, Check your recipe and the welcome.
        { path: '/r/:id/cook', element: <CookModePage /> },
        { path: '/new/tell/:draftId', element: <TellItPage /> },
        { path: '/new/talk/:draftId', element: <JustTalkPage /> },
        { path: '/new/review/:draftId', element: <ReviewPage /> },
        { path: '/print', element: <PrintPage /> },
        { path: '/welcome', element: <WelcomePage /> },
        {
          element: <AppShell />,
          children: [
            { path: '/', element: <CookbookPage />, loader: firstRunLoader },
            { path: '/r/:id', element: <RecipeDetailPage /> },
            { path: '/r/:id/edit', element: <EditRecipePage /> },
            { path: '/new', element: <NewRecipePage /> },
            { path: '/new/type/:draftId', element: <TypeItPage /> },
            { path: '/new/paste/:draftId', element: <PasteItPage /> },
            { path: '/new/link/:draftId', element: <FromLinkPage /> },
            { path: '/c', element: <CollectionsPage /> },
            { path: '/c/:id', element: <CollectionPage /> },
            { path: '/t', element: <TagsPage /> },
            { path: '/t/:tag', element: <TagPage /> },
            { path: '/grocery', element: <GroceryPage /> },
            { path: '/requests', element: <RequestsPage /> },
            { path: '/settings', element: <SettingsPage /> },
            { path: '/import', element: <ImportPage /> },
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
