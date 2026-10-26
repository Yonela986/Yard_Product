import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProofViewer } from "./ProofViewer";

vi.mock("@/features/payments/api", () => ({
  confirmPendingPayment: vi.fn(),
  createPayment: vi.fn(),
  createProofSignedUrl: vi.fn(async () => "https://storage.example/proof"),
  declinePendingPayment: vi.fn(),
  getPayment: vi.fn(),
  listPendingPayments: vi.fn(),
  listTenantPayments: vi.fn(),
  voidPayment: vi.fn(),
}));

function renderProof(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProofViewer path={path} />
    </QueryClientProvider>,
  );
}

describe("ProofViewer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["proof"]),
      })),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:proof"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  it("opens PDF proof inside the sheet and provides a separate download action", async () => {
    renderProof("tenant-1/proof.pdf");

    fireEvent.click(await screen.findByRole("button", { name: "View PDF" }));

    expect((await screen.findByTitle("Payment proof PDF")).getAttribute("src")).toBe(
      "https://storage.example/proof",
    );
    fireEvent.click(screen.getByRole("button", { name: "Download proof" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("https://storage.example/proof"));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("opens image proof in the same sheet with a download action", async () => {
    renderProof("tenant-1/proof.jpg");

    fireEvent.click(await screen.findByRole("button", { name: "Open payment proof" }));

    expect((await screen.findByRole("img", { name: "Payment proof" })).getAttribute("src")).toBe(
      "https://storage.example/proof",
    );
    expect(screen.getByRole("button", { name: "Download proof" })).toBeTruthy();
  });
});
