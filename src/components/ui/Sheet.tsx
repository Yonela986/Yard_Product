import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Bottom sheet on mobile, centred modal from 640px. Radix handles focus trap, Escape and scroll lock. */
export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-backdrop" />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] animate-sheet-up overflow-y-auto rounded-t-md border border-line bg-ground pb-safe sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-fade-in sm:rounded-md"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line py-2 pr-2 pl-4">
            <Dialog.Title className="text-body font-semibold text-ink">{title}</Dialog.Title>
            <Dialog.Close
              className="inline-flex size-11 items-center justify-center rounded-sm text-ink active:bg-line"
              aria-label="Close"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <div className="p-4">
            {description && (
              <Dialog.Description className="mb-4 text-secondary text-ink-muted">
                {description}
              </Dialog.Description>
            )}
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
