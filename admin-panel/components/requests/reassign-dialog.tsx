"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface ReassignDialogProps {
  orderId: string;
  currentManufacturerId: string;
}

export function ReassignDialog({
  orderId,
  currentManufacturerId,
}: ReassignDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMfg, setSelectedMfg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: manufacturers } = useQuery({
    queryKey: ["manufacturer-options"],
    queryFn: api.getManufacturerOptions,
    enabled: open,
  });

  const availableManufacturers = manufacturers?.filter(
    (m) => m.id !== currentManufacturerId
  );

  const handleReassign = async () => {
    if (!selectedMfg) return;
    setIsSubmitting(true);
    await api.reassignManufacturer(orderId, selectedMfg);
    setIsSubmitting(false);
    setOpen(false);
    setSelectedMfg("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reassign Manufacturer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Manufacturer</DialogTitle>
          <DialogDescription>
            Select a new manufacturer for order {orderId}. This will reset
            the order status to Pending.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedMfg} onValueChange={setSelectedMfg}>
            <SelectTrigger>
              <SelectValue placeholder="Select a manufacturer" />
            </SelectTrigger>
            <SelectContent>
              {availableManufacturers?.map((mfg) => (
                <SelectItem key={mfg.id} value={mfg.id}>
                  {mfg.companyName} — {mfg.state}, {mfg.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedMfg || isSubmitting}
          >
            {isSubmitting ? "Reassigning..." : "Confirm Reassignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
