import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches payment recording and detail pages inside the landlord area", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/tenants/tenant-1/payments/new").at(-1)?.routeId).toBe(
      "/_landlord/tenants/$tenantId/payments/new",
    );
    expect(router.matchRoutes("/tenants/tenant-1/payments/payment-1").at(-1)?.routeId).toBe(
      "/_landlord/tenants/$tenantId/payments/$paymentId",
    );
  });

  it("opens room, utility and income pages as their own pages", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const leaf = (p: string) => router.matchRoutes(p).at(-1)?.routeId;

    expect(leaf("/rooms")).toBe("/_landlord/rooms/");
    expect(leaf("/rooms/room-1")).toBe("/_landlord/rooms/$roomId");
    expect(leaf("/money")).toBe("/_landlord/money/");
    expect(leaf("/money/utilities")).toBe("/_landlord/money/utilities/");
    expect(leaf("/money/utilities/new")).toBe("/_landlord/money/utilities/new");
    expect(leaf("/money/income/2026-10")).toBe("/_landlord/money/income/$month");
  });
});
