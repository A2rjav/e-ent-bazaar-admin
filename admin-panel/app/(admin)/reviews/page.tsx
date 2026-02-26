"use client";

import { Construction, Star, MessageSquare, TrendingUp } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="relative mb-8">
        <div className="absolute -inset-4 rounded-full bg-primary/5 animate-pulse" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
          <Construction className="w-10 h-10 text-primary" />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-center">
        Coming Soon
      </h1>
      <p className="mt-3 text-muted-foreground text-center max-w-md">
        We&apos;re building a powerful ratings & reviews management system. Stay tuned!
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center">
          <Star className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium">Ratings</span>
          <span className="text-xs text-muted-foreground">View & moderate</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">Reviews</span>
          <span className="text-xs text-muted-foreground">Manage feedback</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium">Analytics</span>
          <span className="text-xs text-muted-foreground">Track trends</span>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        This feature is under active development
      </p>
    </div>
  );
}
