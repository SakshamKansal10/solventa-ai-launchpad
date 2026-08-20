import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumButton } from "./PremiumButton";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { signIn } from "@/lib/actions/auth";

export function SignInDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn({ data: { email, password } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // A different account may be signing in on a tab that still has a
      // previous account's cached data — never show it to the new user.
      queryClient.clear();
      setOpen(false);
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("[sign-in] failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl border-border/70 bg-card sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">Welcome back</DialogTitle>
          <DialogDescription>Sign in to continue building with Solventia.</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <GoogleSignInButton redirectPath="/auth/callback" />
        </div>
        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[0.75rem] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-[0.82rem] text-destructive">{error}</p>}
          <PremiumButton
            type="submit"
            tone="solid"
            shape="rounded"
            size="sm"
            className="mt-2 w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Sign In
          </PremiumButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
