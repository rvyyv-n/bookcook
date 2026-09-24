import { createBrowserRouter, Link, Outlet, RouterProvider, useParams } from 'react-router';

function Stub({ name }: { name: string }) {
  const params = useParams();
  return (
    <main>
      <h1>{name}</h1>
      {params.id && <p>Recipe {params.id}</p>}
    </main>
  );
}

function Shell() {
  return (
    <>
      <nav>
        <Link to="/">Cookbook</Link> <Link to="/grocery">Grocery</Link> <Link to="/new">New recipe</Link>{' '}
        <Link to="/requests">Requests</Link> <Link to="/settings">Settings</Link>
      </nav>
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Stub name="Cookbook" /> },
      { path: '/r/:id', element: <Stub name="Recipe" /> },
      { path: '/r/:id/edit', element: <Stub name="Edit recipe" /> },
      { path: '/r/:id/cook', element: <Stub name="Cook mode" /> },
      { path: '/new', element: <Stub name="New recipe" /> },
      { path: '/new/tell', element: <Stub name="Tell it" /> },
      { path: '/new/talk', element: <Stub name="Just talk" /> },
      { path: '/new/type', element: <Stub name="Type it" /> },
      { path: '/new/paste', element: <Stub name="Paste it" /> },
      { path: '/new/link', element: <Stub name="From a link" /> },
      { path: '/grocery', element: <Stub name="Grocery list" /> },
      { path: '/requests', element: <Stub name="Recipe requests" /> },
      { path: '/settings', element: <Stub name="Settings" /> },
      { path: '/import', element: <Stub name="Add to my cookbook" /> },
      { path: '*', element: <Stub name="Page not found" /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
