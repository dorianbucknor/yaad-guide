"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { savePreferenceAction } from "@/lib/settings/actions";
import {
  CATEGORY_LABELS,
  CHANNELS,
  type Channel,
  type NotificationCategory,
} from "@/lib/settings/notifications";

type Entry = {
  category: NotificationCategory;
  channel: Channel;
  enabled: boolean;
  locked: boolean;
};

const CHANNEL_LABEL: Record<Channel, string> = { email: "Email", sms: "Text message" };
const keyOf = (category: NotificationCategory, channel: Channel) => `${category}:${channel}`;

export function PreferencesTable({
  entries,
  phoneVerified,
}: {
  entries: Entry[];
  phoneVerified: boolean;
}): React.JSX.Element {
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(entries.map((e) => [keyOf(e.category, e.channel), e.enabled])),
  );
  const categories = [...new Set(entries.map((e) => e.category))];

  async function change(category: NotificationCategory, channel: Channel, enabled: boolean) {
    const key = keyOf(category, channel);
    const previous = values[key];
    setValues((current) => ({ ...current, [key]: enabled }));
    const result = await savePreferenceAction({ category, channel, enabled });
    if (result.ok) {
      toast.success("Saved");
    } else {
      setValues((current) => ({ ...current, [key]: previous }));
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!phoneVerified ? (
        <p id="sms-hint" className="max-w-[65ch] text-sm text-muted-foreground">
          Verify your phone to turn on text messages.{" "}
          <Link
            href="/auth/phone?next=%2Fsettings%2Fnotifications"
            className="font-medium text-brand underline underline-offset-4 dark:text-primary"
          >
            Verify your phone
          </Link>
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>What to send</TableHead>
            {CHANNELS.map((channel) => (
              <TableHead key={channel} className="w-20 text-center">
                {CHANNEL_LABEL[channel]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => {
            const { label, description } = CATEGORY_LABELS[category];
            return (
              <TableRow key={category}>
                <TableCell className="whitespace-normal">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </TableCell>
                {CHANNELS.map((channel) => {
                  const entry = entries.find((e) => e.category === category && e.channel === channel);
                  const smsBlocked = channel === "sms" && !phoneVerified;
                  return (
                    <TableCell key={channel} className="text-center">
                      <Switch
                        aria-label={`${label} by ${CHANNEL_LABEL[channel].toLowerCase()}`}
                        aria-describedby={smsBlocked ? "sms-hint" : undefined}
                        checked={values[keyOf(category, channel)] ?? false}
                        disabled={entry?.locked || smsBlocked}
                        onCheckedChange={(checked) => change(category, channel, checked)}
                      />
                      {entry?.locked ? (
                        <p className="mt-1 text-xs text-muted-foreground">Always on</p>
                      ) : null}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
