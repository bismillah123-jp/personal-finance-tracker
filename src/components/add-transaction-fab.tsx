"use client";

import { useState } from "react";
import { Plus, Minus, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/forms/transaction-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function AddTransactionFAB() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");

  return (
    <>
      {/* Desktop Button */}
      <div className="hidden lg:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => { setType("income"); setOpen(true); }}
        >
          <Plus className="w-4 h-4" />
          Pemasukan
        </Button>
        <Button
          size="sm"
          variant="expense"
          className="gap-2"
          onClick={() => { setType("expense"); setOpen(true); }}
        >
          <Minus className="w-4 h-4" />
          Pengeluaran
        </Button>
      </div>

      {/* Mobile FAB */}
      <Button
        className="lg:hidden fixed bottom-24 right-6 h-14 w-14 rounded-2xl shadow-xl shadow-primary/25 z-40"
        onClick={() => setOpen(true)}
      >
        <ArrowLeftRight className="w-6 h-6" />
      </Button>

      {/* Transaction Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Transaksi</DialogTitle>
            <DialogDescription>
              Tambahkan transaksi baru ke dalam catatan keuangan Anda
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            defaultType={type}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
