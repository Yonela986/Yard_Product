import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { usePaymentProofUrl } from "@/features/payments/hooks";

function proofFileName(path: string): string {
  const extension = path
    .split(/[./\\]/)
    .pop()
    ?.toLowerCase();
  const safeExtension = ["pdf", "jpg", "jpeg", "png", "webp"].includes(extension ?? "")
    ? extension
    : "file";
  return `payment-proof.${safeExtension}`;
}

export function ProofViewer({ path }: { path: string | null }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const proof = usePaymentProofUrl(path);
  if (!path) return null;
  if (proof.isPending) return <p className="text-secondary text-ink-muted">Loading proof...</p>;
  if (proof.isError) {
    return (
      <p role="alert" className="text-secondary text-ink">
        Payment proof could not be loaded.
      </p>
    );
  }
  if (!proof.data) {
    return (
      <p role="alert" className="text-secondary text-ink">
        Payment proof could not be loaded.
      </p>
    );
  }

  const proofPath = path;
  const proofUrl = proof.data;
  const isPdf = /\.pdf(?:$|[?#])/i.test(path);

  async function downloadProof() {
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(proofUrl);
      if (!response.ok) throw new Error(`Proof download failed with status ${response.status}.`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = proofFileName(proofPath);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("The proof could not be downloaded. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {isPdf ? (
        <Button variant="quiet" className="p-0 underline" onClick={() => setOpen(true)}>
          View PDF
        </Button>
      ) : (
        <Button
          variant="quiet"
          className="p-0"
          onClick={() => setOpen(true)}
          aria-label="Open payment proof"
        >
          <img
            src={proofUrl}
            alt="Payment proof"
            className="max-h-48 max-w-full rounded-sm border border-line object-contain"
          />
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="Payment proof">
        <div className="space-y-4">
          {isPdf ? (
            <iframe
              src={proofUrl}
              title="Payment proof PDF"
              className="h-[65dvh] min-h-80 w-full border border-line"
            />
          ) : (
            <img
              src={proof.data}
              alt="Payment proof"
              className="max-h-[65dvh] w-full object-contain"
            />
          )}
          <Button
            fullWidth
            variant="secondary"
            loading={downloading}
            loadingLabel="Preparing download"
            onClick={() => void downloadProof()}
          >
            Download proof
          </Button>
          {error && (
            <p role="alert" className="text-secondary text-ink">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
