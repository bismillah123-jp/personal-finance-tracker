import { useState } from "react";
import { ArrowLeftRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/forms/transaction-form";

interface AddTransactionFABProps {
  canCreateTransaction?: boolean;
  disabledReason?: string;
  onSaved?: () => void;
}

export function AddTransactionFAB({
  canCreateTransaction = true,
  disabledReason = "Tambahkan dompet terlebih dahulu agar transaksi dapat disimpan.",
  onSaved,
}: AddTransactionFABProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");

  const handleOpen = (nextType: "income" | "expense" = "expense") => {
    if (!canCreateTransaction) {
      window.alert(disabledReason);
      return;
    }

    setType(nextType);
    setOpen(true);
  };

  return (
    <>
      <div className="hidden lg:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl"
          onClick={() => handleOpen("income")}
        >
          <Plus className="w-4 h-4" />
          Pemasukan
        </Button>
        <Button
          size="sm"
          variant="expense"
          className="gap-2 rounded-xl"
          onClick={() => handleOpen("expense")}
        >
          <Minus className="w-4 h-4" />
          Pengeluaran
        </Button>
      </div>

      <Button
        className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-2xl shadow-xl shadow-primary/25 lg:hidden"
        onClick={() => handleOpen("expense")}
        aria-label="Tambah transaksi"
      >
        <ArrowLeftRight className="w-6 h-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat transaksi</DialogTitle>
            <DialogDescription>
              Tambahkan transaksi baru ke catatan keuangan Anda.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            defaultType={type}
            onSuccess={() => {
              setOpen(false);
              onSaved?.();
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
