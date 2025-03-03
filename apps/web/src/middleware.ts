import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authMiddleware, redirectToSignIn } from "@clerk/nextjs";
import { createI18nMiddleware } from 'next-international/middleware'

import { db, eq } from "@openstatus/db";
import {
  monitor,
  user,
  usersToWorkspaces,
  workspace,
} from "@openstatus/db/src/schema";

import { env } from "./env";

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'es', 'fr', 'de'],
  defaultLocale: 'en',
  urlMappingStrategy: 'rewriteDefault'
})

const before = (req: NextRequest) => {
  const url = req.nextUrl.clone();

  if (url.pathname.includes("api/trpc")) {
    return NextResponse.next();
  }

  const host = req.headers.get("host");
  const subdomain = getValidSubdomain(host);
  if (subdomain) {
    // Subdomain available, rewriting
    console.log(
      `>>> Rewriting: ${url.pathname} to /status-page/${subdomain}${url.pathname}`,
    );
    url.pathname = `/status-page/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
};

export const getValidSubdomain = (host?: string | null) => {
  let subdomain: string | null = null;
  if (!host && typeof window !== "undefined") {
    // On client side, get the host from window
    host = window.location.host;
  }
  // we should improve here for custom vercel deploy page
  if (host && host.includes(".") && !host.includes(".vercel.app")) {
    const candidate = host.split(".")[0];
    if (candidate && !candidate.includes("www")) {
      // Valid candidate
      subdomain = candidate;
    }
  }
  if (host && host.includes("ngrok-free.app")) {
    return null;
  }
  // In case the host is a custom domain
  if (
    host &&
    !(host?.includes(env.NEXT_PUBLIC_URL) || host?.endsWith(".vercel.app"))
  ) {
    subdomain = host;
  }
  return subdomain;
};

export default authMiddleware({
  publicRoutes: [
    "/",
    "/play",
    "/play/(.*)",
    "/monitor/(.*)",
    "/api/(.*)",
    "/api/webhook/clerk",
    "/api/checker/regions/(.*)",
    "/api/checker/cron/10m",
    "/blog",
    "/blog/(.*)",
    "/legal/(.*)",
    "/discord",
    "/github",
    "/oss-friends",
    "/status-page/(.*)",
    "/incidents", // used when trying subdomain slug via status.documenso.com/incidents
  ],
  ignoredRoutes: ["/api/og", "/discord", "github"], // FIXME: we should check the `publicRoutes`
  beforeAuth: before,
  debug: false,
  async afterAuth(auth, req) {

    const host = req.headers.get("host");
    const subdomain = getValidSubdomain(host);
    if (subdomain || req.nextUrl.pathname.includes('/status-page/')) {
      return I18nMiddleware(req)
    }

    // handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // redirect them to organization selection page
    if (
      auth.userId &&
      (req.nextUrl.pathname === "/app" || req.nextUrl.pathname === "/app/")
    ) {
      console.log('>>> Redirecting to "/app/workspace"');
      // improve on sign-up if the webhook has not been triggered yet
      const userQuery = db
        .select()
        .from(user)
        .where(eq(user.tenantId, auth.userId))
        .as("userQuery");
      const result = await db
        .select()
        .from(usersToWorkspaces)
        .innerJoin(userQuery, eq(userQuery.id, usersToWorkspaces.userId))
        .all();
      if (result.length > 0) {
        console.log(">>> User has workspace");
        const currentWorkspace = await db
          .select()
          .from(workspace)
          .where(eq(workspace.id, result[0].users_to_workspaces.workspaceId))
          .get();
        if (currentWorkspace) {
          const firstMonitor = await db
            .select()
            .from(monitor)
            .where(eq(monitor.workspaceId, currentWorkspace.id))
            .get();

          if (!firstMonitor) {
            console.log(`>>> Redirecting to onboarding`);
            const onboarding = new URL(
              `/app/onboarding?workspaceSlug=${currentWorkspace.slug}`,
              req.url,
            );
            return NextResponse.redirect(onboarding);
          }

          const orgSelection = new URL(
            `/app/${currentWorkspace.slug}/monitors`,
            req.url,
          );
          console.log(`>>> Redirecting to ${orgSelection}`);
          return NextResponse.redirect(orgSelection);
        }
      } else {
        console.log("redirecting to onboarding");
        // return NextResponse.redirect(new URL("/app/onboarding", req.url));
        // probably redirect to onboarding
        // or find a way to wait for the webhook
      }
      console.log("redirecting to onboarding");
      return;
    }
    if (
      auth.userId &&
      req.nextUrl.pathname === "/app/integrations/vercel/configure"
    ) {
      const userQuery = db
        .select()
        .from(user)
        .where(eq(user.tenantId, auth.userId))
        .as("userQuery");
      const result = await db
        .select()
        .from(usersToWorkspaces)
        .innerJoin(userQuery, eq(userQuery.id, usersToWorkspaces.userId))
        .all();
      if (result.length > 0) {
        const currentWorkspace = await db
          .select()
          .from(workspace)
          .where(eq(workspace.id, result[0].users_to_workspaces.workspaceId))
          .get();
        if (currentWorkspace) {
          const configure = new URL(
            `/app/${currentWorkspace.slug}/integrations/vercel/configure`,
            req.url,
          );
          return NextResponse.redirect(configure);
        }
      }
    }
  },
});

export const config = {
  matcher: [
    "/((?!api|assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    "/",
    "/app/integrations/vercel/configure",
    "/(api/webhook|api/trpc)(.*)",
    "/(!api/checker/:path*|!api/og|!api/ping)",
    "/api/analytics", // used for tracking vercel beta integration click events
  ],
};