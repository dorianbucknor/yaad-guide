"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ButtonDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button>Plan my trip</Button>
      <Button variant="secondary">Plan my trip</Button>
      <Button variant="outline">Save for later</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Cancel booking</Button>
      <Button variant="link">View policy</Button>
      <Button disabled>Select a date</Button>
    </div>
  );
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.success("Booked")}>
        Success toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("Your driver has 24 hours to respond")}
      >
        Info toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning("Only 2 tickets left for this slot")}
      >
        Warning toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error("Payment failed. Check your card and try again.")}
      >
        Error toast
      </Button>
    </div>
  );
}

/** One button that exercises both: hover or focus for the tooltip, click for the toast. */
export function TooltipToastTest() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="secondary"
            onClick={() => toast.success("Tooltip and toast both work")}
          />
        }
      >
        Test tooltip and toast
      </TooltipTrigger>
      <TooltipContent>Hover or focus shows this. Click shows a toast.</TooltipContent>
    </Tooltip>
  );
}

export function TooltipDemo() {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>
        Hover or focus me
      </TooltipTrigger>
      <TooltipContent>Verified by YaadGuide</TooltipContent>
    </Tooltip>
  );
}
