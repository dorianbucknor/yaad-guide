import { ARCHIVE_DAYS } from "./archive";

type DbError = { message: string } | null;

/** The minimal slice of the service-role client the purge uses, so tests can inject a fake. */
export type PurgeClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: DbError }>;
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        maybeSingle(): PromiseLike<{
          data: { profile_status: string; archived_at: string | null } | null;
          error: DbError;
        }>;
      };
    };
  };
  storage: {
    from(bucket: string): {
      list(
        path: string,
        options?: { limit?: number },
      ): PromiseLike<{ data: { name: string; id: string | null }[] | null; error: DbError }>;
      remove(paths: string[]): PromiseLike<{ error: DbError }>;
    };
  };
  auth: { admin: { deleteUser(id: string): PromiseLike<{ error: DbError }> } };
};

export type PurgeResult = {
  purged: string[];
  failed: { id: string; message: string }[];
};

const BUCKETS = ["avatars", "vendor-documents"] as const;
const PAGE = 100;
const MAX_PAGES = 50;
const WINDOW_MS = ARCHIVE_DAYS * 24 * 60 * 60 * 1000;

function fail(message: string, error: DbError): never {
  throw new Error(`${message}: ${error?.message ?? "unknown"}`);
}

/** Removes every file under `prefix`, descending into folders. */
async function removeFolder(client: PurgeClient, bucket: string, prefix: string): Promise<void> {
  const storage = client.storage.from(bucket);
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await storage.list(prefix, { limit: PAGE });
    if (error) fail(`Listing ${bucket}/${prefix} failed`, error);
    const entries = data ?? [];
    if (entries.length === 0) return;

    const files = entries.filter((e) => e.id !== null).map((e) => `${prefix}/${e.name}`);
    for (const folder of entries.filter((e) => e.id === null)) {
      await removeFolder(client, bucket, `${prefix}/${folder.name}`);
    }
    if (files.length > 0) {
      const { error: removeError } = await storage.remove(files);
      if (removeError) fail(`Removing files from ${bucket} failed`, removeError);
    } else {
      return;
    }
  }
}

async function scrubAudit(client: PurgeClient, id: string): Promise<void> {
  const { error } = await client.rpc("scrub_audit_for_account", { p_account_id: id });
  if (error) fail("Scrubbing audit rows failed", error);
}

async function purgeOne(client: PurgeClient, id: string): Promise<boolean> {
  // Re-check right before deleting: a restore may have raced the job.
  const { data: profile, error } = await client
    .from("profiles")
    .select("profile_status, archived_at")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("Re-checking the profile failed", error);
  if (!profile || profile.profile_status !== "archived" || !profile.archived_at) return false;
  if (Date.now() - new Date(profile.archived_at).getTime() < WINDOW_MS) return false;

  await scrubAudit(client, id);

  for (const bucket of BUCKETS) await removeFolder(client, bucket, id);

  const { error: deleteError } = await client.auth.admin.deleteUser(id);
  if (deleteError) fail("Deleting the user failed", deleteError);

  // The delete cascades and the audit triggers record the old values: scrub those too.
  await scrubAudit(client, id);
  return true;
}

/** Permanently deletes accounts archived more than seven days ago. One failure never stops the rest. */
export async function purgeArchivedAccounts(client: PurgeClient): Promise<PurgeResult> {
  const { data, error } = await client.rpc("accounts_due_for_purge", {
    p_older_than: `${ARCHIVE_DAYS} days`,
  });
  if (error) fail("Listing accounts due for purge failed", error);

  const result: PurgeResult = { purged: [], failed: [] };
  for (const id of (data as string[] | null) ?? []) {
    try {
      if (await purgeOne(client, id)) result.purged.push(id);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      console.error(`Purging account ${id} failed: ${message}`);
      result.failed.push({ id, message });
    }
  }
  return result;
}
