import { Loader2 } from "lucide-react";

export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-busy="true">
      <Loader2 aria-hidden className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
