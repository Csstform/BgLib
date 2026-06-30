import { AlertCircle } from "lucide-react";

export function SetupBanner() {
  return (
    <div className="mx-4 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-200">Database not configured</p>
          <p className="mt-1 text-sm text-muted">
            Copy <code className="text-foreground">.env.local.example</code> to{" "}
            <code className="text-foreground">.env.local</code>, add your
            Supabase credentials, and run the SQL in{" "}
            <code className="text-foreground">supabase/schema.sql</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
