import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RootPage from "./Root";

const authMocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
  landlord: {
    data: null as { onboarding_completed_at: string | null } | null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
  navigate: vi.fn(),
}));

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ user: authMocks.user, isLoading: authMocks.isLoading }),
}));

vi.mock("@/features/auth/hooks", () => ({
  useLandlord: () => authMocks.landlord,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => authMocks.navigate,
}));

describe("root landing route", () => {
  beforeEach(() => {
    authMocks.user = null;
    authMocks.isLoading = false;
    authMocks.landlord.data = null;
    authMocks.landlord.isPending = false;
    authMocks.landlord.isError = false;
    authMocks.navigate.mockReset();
    authMocks.landlord.refetch.mockReset();
  });

  it("shows the landing page when signed out", async () => {
    render(<RootPage />);
    expect(
      await screen.findByRole("heading", { name: "Rent records for backyard rooms" }),
    ).toBeTruthy();
    const getStartedLinks = screen.getAllByRole("link", { name: "Get started" });
    expect(getStartedLinks).toHaveLength(2);
    expect(getStartedLinks.every((link) => link.getAttribute("href") === "/sign-in")).toBe(true);
    expect(screen.getByRole("link", { name: /^Sign in$/ }).getAttribute("href")).toBe("/sign-in");
    expect(authMocks.navigate).not.toHaveBeenCalled();
  });

  it("waits for auth before rendering the landing page", () => {
    authMocks.isLoading = true;
    render(<RootPage />);
    expect(screen.getByText("Loading")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Rent records for backyard rooms" })).toBeNull();
  });

  it("redirects an onboarded landlord to Home without rendering the landing page", async () => {
    authMocks.user = { id: "landlord-1" };
    authMocks.landlord.data = { onboarding_completed_at: "2026-01-01T00:00:00Z" };
    render(<RootPage />);
    await waitFor(() =>
      expect(authMocks.navigate).toHaveBeenCalledWith({ to: "/home", replace: true }),
    );
    expect(screen.queryByRole("heading", { name: "Rent records for backyard rooms" })).toBeNull();
  });

  it("redirects a signed-in landlord without completed onboarding to onboarding", async () => {
    authMocks.user = { id: "landlord-1" };
    authMocks.landlord.data = { onboarding_completed_at: null };
    render(<RootPage />);
    await waitFor(() =>
      expect(authMocks.navigate).toHaveBeenCalledWith({ to: "/onboarding", replace: true }),
    );
    expect(screen.queryByRole("heading", { name: "Rent records for backyard rooms" })).toBeNull();
  });
});
