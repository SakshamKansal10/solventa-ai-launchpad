import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { scrollToSection } from "@/hooks/use-active-section";

const CONTACT_EMAIL = "solventia.in@gmail.com";

const FOOTER_LINKS: {
  label: string;
  id?: string;
  to?: "/about" | "/for-organizations" | "/privacy" | "/terms";
}[] = [
  { label: "Product", id: "founder-signal" },
  { label: "How It Works", id: "how-it-works" },
  { label: "For Organizations", to: "/for-organizations" },
  { label: "About", to: "/about" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

/** Simple, on purpose — not another marketing block. No social icons:
 * this product has no real, live social presence yet, and a row of
 * placeholder links would be exactly the kind of unsupported claim the
 * rest of this homepage was rebuilt to remove. */
export function Footer() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  return (
    <footer className="bg-sol-footer px-[18px] py-12 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src={mark}
              alt="Solventia"
              width={298}
              height={436}
              loading="lazy"
              className="h-9 w-auto"
            />
            <div className="leading-tight">
              <p className="font-display text-[1rem] font-semibold tracking-[0.1em] text-sol-ink">
                SOLVENTIA
              </p>
              <p className="mt-0.5 text-[0.62rem] font-medium tracking-[0.28em] text-sol-champagne-deep">
                VALIDATE • BUILD • ELEVATE
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-2">
            {FOOTER_LINKS.map((link) =>
              link.id ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={() =>
                    isHome ? scrollToSection(link.id!) : navigate({ to: "/", hash: link.id })
                  }
                  className="text-[0.85rem] font-medium text-sol-secondary transition-colors hover:text-sol-ink"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.to!}
                  className="text-[0.85rem] font-medium text-sol-secondary transition-colors hover:text-sol-ink"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
            <p className="text-[0.78rem] text-sol-secondary">
              Questions, partnerships or feedback?
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-2 text-[0.88rem] font-medium text-sol-ink transition-colors hover:text-sol-violet-deep sm:justify-end"
            >
              <Mail className="size-4" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="mt-9 flex flex-col items-center gap-3 border-t border-sol-border pt-6 text-[0.78rem] text-sol-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Solventia. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="transition-colors hover:text-sol-ink">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-sol-ink">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
