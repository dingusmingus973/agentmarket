// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/sell(.*)",
  "/purchase(.*)",
  "/api/listings/create(.*)",
  "/api/purchases(.*)",
  "/api/agents/run(.*)",
  "/api/sellers(.*)",
  "/api/admin(.*)",
]);

// Public routes — no auth needed
const isPublicRoute = createRouteMatcher([
  "/",
  "/marketplace(.*)",
  "/agent/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/listings",
  "/api/listings/(.*)",  // GET listing detail is public
  "/api/sandbox(.*)",    // sandbox runs allowed unauthenticated (IP limited)
  "/api/webhooks/(.*)",  // webhooks must be public
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
