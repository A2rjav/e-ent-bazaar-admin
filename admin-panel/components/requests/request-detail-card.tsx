"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RequestStatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";
import type { OrderDetail } from "@/lib/types";

interface RequestDetailCardProps {
  request: OrderDetail;
}

export function RequestDetailCard({ request }: RequestDetailCardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Order Summary */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{request.id}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {request.product?.name || 'N/A'} — Qty: {request.quantity?.toLocaleString("en-IN") || '0'}
            </p>
          </div>
          <RequestStatusBadge status={request.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="Product" value={request.product?.name || 'N/A'} />
            <InfoItem label="Category" value={request.product?.category || 'N/A'} />
            <InfoItem
              label="Quantity"
              value={request.quantity.toLocaleString("en-IN")}
            />
            <InfoItem
              label="Price"
              value={request.price != null ? formatCurrency(request.price) : "Not set"}
            />
            <InfoItem
              label="Total Amount"
              value={request.totalAmount != null ? formatCurrency(request.totalAmount) : "Not set"}
            />
            <InfoItem label="Created At" value={formatDate(request.createdAt)} />
          </div>

          {request.deliveryAddress && (
            <>
              <Separator />
              <InfoItem label="Delivery Address" value={request.deliveryAddress} />
            </>
          )}

          {request.contactNumber && (
            <InfoItem label="Contact Number" value={request.contactNumber} />
          )}

          {request.orderType === "SAMPLE" && request.adminResponse && (
            <>
              <Separator />
              <InfoItem label="Admin Response" value={request.adminResponse} />
            </>
          )}

          {request.orderType === "NORMAL" && request.trackingNumber && (
            <>
              <Separator />
              <InfoItem label="Tracking Number" value={request.trackingNumber} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{request.customer?.companyName || request.customer?.name || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">{request.customer?.name || ''}</p>
            <p className="text-sm text-muted-foreground">{request.customer?.email || ''}</p>
            <p className="text-sm text-muted-foreground">{formatPhone(request.customer?.phone || '')}</p>
            <p className="text-sm text-muted-foreground">
              {[request.customer?.city, request.customer?.district, request.customer?.state].filter(Boolean).join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manufacturer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{request.manufacturer?.companyName || request.manufacturer?.name || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">
              {request.manufacturer?.name || ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {request.manufacturer?.email || ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatPhone(request.manufacturer?.phone || '')}
            </p>
            <p className="text-sm text-muted-foreground">
              {[request.manufacturer?.city, request.manufacturer?.district, request.manufacturer?.state].filter(Boolean).join(", ")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
