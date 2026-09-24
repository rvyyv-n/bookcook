import { createBrowserRouter, Outlet, RouterProvider, useRouteError } from 'react-router';
import { RecipeDetailPage } from '../features/recipe/RecipeDetail';
import { SettingsPage } from '../features/settings/SettingsPage';
import { useT } from '../i18n';
import { ButtonLink } from '../ui/Button';
import { Providers } from './providers';
import { AppShell, LibraryHome } from './Shell';

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
      <ButtonLink href="/" variant="primary" icon="book">
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
      <pre className="overflow-auto rounded-md bg-sunk p-3 text-sm">{error instanceof Error ? error.message : String(error)}</pre>
      <a href="/" className="font-bold underline">
        Go to your cookbook
      </a>
    </main>
  );
}

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-3xl">{title}</h1>;
}

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { path: '/r/:id/cook', element: <Placeholder title="Cook mode" /> },
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <LibraryHome /> },
          { path: '/r/:id', element: <RecipeDetailPage /> },
          { path: '/r/:id/edit', element: <Placeholder title="Edit recipe" /> },
          { path: '/new', element: <Placeholder title="New recipe" /> },
          { path: '/new/tell', element: <Placeholder title="Tell it" /> },
          { path: '/new/talk', element: <Placeholder title="Just talk" /> },
          { path: '/new/type', element: <Placeholder title="Type it" /> },
          { path: '/new/paste', element: <Placeholder title="Paste it" /> },
          { path: '/new/link', element: <Placeholder title="From a link" /> },
          { path: '/grocery', element: <Placeholder title="Grocery list" /> },
          { path: '/requests', element: <Placeholder title="Recipe requests" /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/import', element: <Placeholder title="Add to my cookbook" /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
