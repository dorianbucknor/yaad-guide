import { getHeaderViewer } from "@/lib/auth/header-viewer";

import { SiteHeader } from "./site-header";

/** Dynamic: reads the session. Render inside <Suspense> with a guest <SiteHeader /> fallback. */
export async function SiteHeaderWithViewer(): Promise<React.JSX.Element> {
  return <SiteHeader viewer={await getHeaderViewer()} />;
}
