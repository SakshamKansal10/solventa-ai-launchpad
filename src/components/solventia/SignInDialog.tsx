import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
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

export function SignInDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast("Sign-in isn't connected yet", {
      description: "Solventia's account system is still being built — check back soon.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl border-border/70 bg-card sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">Welcome back</DialogTitle>
          <DialogDescription>Sign in to continue building with Solventia.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signin-email">Email</Label>
            <Input id="signin-email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signin-password">Password</Label>
            <Input id="signin-password" type="password" placeholder="••••••••" required />
          </div>
          <PremiumButton
            type="submit"
            tone="solid"
            shape="rounded"
            size="sm"
            className="mt-2 w-full"
          >
            Sign In
          </PremiumButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
