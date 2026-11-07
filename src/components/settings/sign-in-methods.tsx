import { CheckCircle2Icon } from "lucide-react";

/** Read-only list of how this account signs in. */
export function SignInMethods({ methods }: { methods: string[] }): React.JSX.Element {
  if (methods.length === 0) {
    return <p className="text-sm text-muted-foreground">No sign-in methods found.</p>;
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {methods.map((method) => (
        <li key={method} className="flex min-h-11 items-center gap-2 md:min-h-8">
          <CheckCircle2Icon className="size-4 text-success" aria-hidden="true" />
          <span>{method}</span>
        </li>
      ))}
    </ul>
  );
}
