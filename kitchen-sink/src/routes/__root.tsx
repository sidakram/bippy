import React from 'react';
import {
  createRootRoute,
  Link,
  Outlet,
  useRouter,
} from '@tanstack/react-router';

interface RouteInfo {
  path: string;
  label: string;
}

interface RouteChild {
  path?: string;
}

export const Route = createRootRoute({
  component: () => {
    const router = useRouter();
    const routes = Object.entries(router.routeTree.children ?? {})
      .map(([_, route]) => {
        const routeChild = route as RouteChild;
        const path = routeChild.path;
        if (!path) return null;
        return {
          path,
          label: path,
        };
      })
      .filter((route): route is RouteInfo => route !== null)
      .sort((a, b) =>
        a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path),
      );

    return (
      <>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t fixed w-full bg-white z-50 bottom-0">
              <div className="p-2 flex flex-wrap gap-2">
                {routes.map((route, i) => (
                  <React.Fragment key={route.path}>
                    <Link
                      to={route.path}
                      className="[&.active]:font-bold underline hover:bg-black hover:text-white"
                    >
                      {route.label}
                    </Link>
                    {i < routes.length - 1 && (
                      <div className="w-px bg-gray-300 h-4 my-auto" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  },
});
