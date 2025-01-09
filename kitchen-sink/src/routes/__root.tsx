import React from 'react';
import {
  createRootRoute,
  Link,
  Outlet,
  useRouter,
} from '@tanstack/react-router';
// import { TanStackRouterDevtools } from '@tanstack/router-devtools';

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
        <Outlet />
        {/* <TanStackRouterDevtools /> */}
        <div className="absolute bottom-0 left-0 right-0">
          <hr />
          <div className="p-2 flex gap-2">
            {routes.map((route, i) => (
              <React.Fragment key={route.path}>
                <Link to={route.path} className="[&.active]:font-bold">
                  {route.label}
                </Link>
                {i < routes.length - 1 && <span className="opacity-20">|</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </>
    );
  },
});
