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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [reason, setReason] = useState("");
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
    if (!selectedMfg || !reason.trim()) return;
    setIsSubmitting(true);
    try {
      await api.reassignManufacturer(orderId, selectedMfg, reason.trim());
    } finally {
      setIsSubmitting(false);
    }
    setOpen(false);
    setSelectedMfg("");
    setReason("");
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
            Select a new manufacturer for this request. This will reset
            the order status to Pending.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manufacturer-select">New Manufacturer</Label>
            <Select value={selectedMfg} onValueChange={setSelectedMfg}>
              <SelectTrigger id="manufacturer-select">
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
          <div className="space-y-2">
            <Label htmlFor="reassign-reason">Reason for Reassignment</Label>
            <Textarea
              id="reassign-reason"
              placeholder="Enter reason for reassigning this order..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedMfg || !reason.trim() || isSubmitting}
          >
            {isSubmitting ? "Reassigning..." : "Confirm Reassignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
