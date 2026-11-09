"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ticketFieldsSchema, type TicketFieldsInput, type TicketFieldsOutput } from "@/lib/schemas/vibe";
import { deleteTicketTypeAction, saveTicketTypeAction } from "@/lib/vibe/actions";
import { VIBE_CONFIG } from "@/lib/vibe/config";
import { formatPrice } from "@/lib/vibe/format";
import { discountedPrice, isFree } from "@/lib/vibe/pricing";
import type { Currency, TicketType, VibeListingView } from "@/lib/vibe/types";

import { FreeTicketDialog } from "./free-ticket-dialog";

const optionalNumber = (value: unknown): number | null =>
  value === "" || value === null || value === undefined ? null : Number(value);

function Price({ ticket, currency }: { ticket: TicketType; currency: Currency }): React.JSX.Element {
  if (isFree(ticket.price)) return <Badge variant="outline">Free</Badge>;
  if (!ticket.discountPercent) return <span className="font-medium tabular-nums">{formatPrice(ticket.price, currency)}</span>;
  return (
    <span className="flex flex-wrap items-baseline gap-2 tabular-nums">
      <span className="sr-only">Was {formatPrice(ticket.price, currency)}, now</span>
      <s aria-hidden className="text-sm text-muted-foreground">
        {formatPrice(ticket.price, currency)}
      </s>
      <span className="font-medium">{formatPrice(discountedPrice(ticket.price, ticket.discountPercent), currency)}</span>
      <Badge variant="outline">{ticket.discountPercent}% off</Badge>
    </span>
  );
}

function TicketForm({
  listing,
  ticket,
  onDone,
}: {
  listing: VibeListingView;
  ticket: TicketType | null;
  onDone: () => void;
}): React.JSX.Element {
  const { pending, run } = useSave();
  const [askFree, setAskFree] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    getValues,
    formState: { errors },
  } = useForm<TicketFieldsInput, unknown, TicketFieldsOutput>({
    resolver: zodResolver(ticketFieldsSchema),
    defaultValues: {
      name: ticket?.name ?? "",
      description: ticket?.description ?? "",
      price: ticket?.price ?? (undefined as unknown as number),
      discountPercent: ticket?.discountPercent ?? null,
      maxPerBooking: ticket?.maxPerBooking ?? null,
      confirmFree: false,
    },
  });
  const description = watch("description") ?? "";
  const price = Number(watch("price"));
  const free = price === 0;
  const alreadyFree = ticket !== null && isFree(ticket.price);

  const save = (values: TicketFieldsOutput, confirmFree: boolean): void =>
    run(
      () =>
        saveTicketTypeAction(listing.id, {
          ...values,
          id: ticket?.id ?? null,
          discountPercent: values.price === 0 ? null : values.discountPercent,
          confirmFree,
        }),
      {
        success: ticket ? "Saved" : "Added",
        onDone: () => {
          setAskFree(false);
          onDone();
        },
        onFail: (result) => applyFailure(result, setError),
      },
    );

  // A new free ticket, or a paid one made free, is confirmed first. One that was already free is not asked again.
  const submit = handleSubmit((values) => {
    if (values.price === 0 && !alreadyFree) {
      setAskFree(true);
      return;
    }
    save(values, values.price === 0);
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5">
      <h3 className="text-base font-medium">{ticket ? `Edit ${ticket.name}` : "Add a ticket"}</h3>
      <FieldGroup>
        <TextField
          id="ticket-name"
          label="Name"
          description="For example Adult, Child, Local resident or VIP."
          error={errors.name?.message}
          {...register("name")}
        />
        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor="ticket-description">Description (optional)</FieldLabel>
          <Textarea
            id="ticket-description"
            rows={2}
            maxLength={VIBE_CONFIG.ticketDescriptionMax}
            aria-invalid={errors.description ? true : undefined}
            {...register("description")}
          />
          {errors.description ? (
            <FieldError>{errors.description.message}</FieldError>
          ) : (
            <FieldDescription>
              Shown under the name, for example “Includes lunch” or “Ages 3 to 12”. {description.length}/{VIBE_CONFIG.ticketDescriptionMax}
            </FieldDescription>
          )}
        </Field>
        <TextField
          id="ticket-price"
          label={`Price (${listing.currency.toUpperCase()})`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          description="Enter 0 for a free ticket."
          error={errors.price?.message}
          {...register("price", { valueAsNumber: true })}
        />
        {free ? null : (
          <TextField
            id="ticket-discount"
            label="Discount (optional, %)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={99.99}
            description="Leave it empty for no discount. Travelers see the original price struck through."
            error={errors.discountPercent?.message}
            {...register("discountPercent", { setValueAs: optionalNumber })}
          />
        )}
        <TextField
          id="ticket-max"
          label="Most per booking (optional)"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          error={errors.maxPerBooking?.message}
          {...register("maxPerBooking", { setValueAs: optionalNumber })}
        />
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : ticket ? "Save ticket" : "Add ticket"}
          </Button>
          {ticket ? (
            <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
              Cancel
            </Button>
          ) : null}
        </Field>
      </FieldGroup>
      <FreeTicketDialog
        open={askFree}
        onOpenChange={setAskFree}
        pending={pending}
        onConfirm={() => save(getValues() as unknown as TicketFieldsOutput, true)}
      />
    </form>
  );
}

export function TicketsTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const ticket = listing.tickets.find((t) => t.id === editing) ?? null;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section aria-labelledby="tickets-heading" className="flex flex-col gap-4">
        <h2 id="tickets-heading" className="text-xl font-semibold">
          Tickets
        </h2>
        {listing.tickets.length === 0 ? (
          <p className="text-muted-foreground">No tickets yet. Add your first ticket below.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {listing.tickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium">{t.name}</p>
                  {t.description ? <p className="max-w-[55ch] text-sm text-muted-foreground">{t.description}</p> : null}
                  {t.maxPerBooking ? <p className="text-sm text-muted-foreground">Up to {t.maxPerBooking} per booking</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Price ticket={t} currency={listing.currency} />
                  <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setEditing(t.id)}>
                    Edit
                  </Button>
                  {confirmRemove === t.id ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => deleteTicketTypeAction(t.id), {
                          success: "Removed",
                          onDone: () => setConfirmRemove(null),
                        })
                      }
                    >
                      Confirm remove
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmRemove(t.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Remount when switching between adding and editing, so the fields start from the right ticket. */}
      <TicketForm key={ticket?.id ?? "new"} listing={listing} ticket={ticket} onDone={() => setEditing(null)} />
    </div>
  );
}
