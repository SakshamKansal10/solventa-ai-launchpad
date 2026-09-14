import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { scrollToSection } from "@/hooks/use-active-section";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const CONTACT_EMAIL = "solventia.in@gmail.com";

const FOOTER_LINKS: {
  labelKey: string;
  id?: string;
  to?:
    | "/find-my-business-idea"
    | "/how-it-works"
    | "/for-organizations"
    | "/about"
    | "/sign-in"
    | "/privacy"
    | "/terms";
}[] = [
  { labelKey: "nav.product", id: "founder-signal" },
  { labelKey: "nav.findMyBusinessIdea", to: "/find-my-business-idea" },
  { labelKey: "nav.howItWorks", to: "/how-it-works" },
  { labelKey: "nav.forOrganizations", to: "/for-organizations" },
  { labelKey: "footer.aboutSolventia", to: "/about" },
  { labelKey: "nav.signIn", to: "/sign-in" },
  { labelKey: "footer.privacy", to: "/privacy" },
  { labelKey: "footer.terms", to: "/terms" },
];

/** Simple, on purpose — not another marketing block. No social icons:
 * this product has no real, live social presence yet, and a row of
 * placeholder links would be exactly the kind of unsupported claim the
 * rest of this homepage was rebuilt to remove. */
export function Footer() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  return (
    <footer
      className="bg-sol-footer px-[18px] py-11 sm:px-10"
      style={{ borderTop: "1px solid #DDD4CA" }}
    >
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
                {t("footer.tagline")}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-2">
            {FOOTER_LINKS.map((link) =>
              link.id ? (
                <button
                  key={link.labelKey}
                  type="button"
                  onClick={() =>
                    isHome ? scrollToSection(link.id!) : navigate({ to: "/", hash: link.id })
                  }
                  className="text-[0.85rem] font-medium text-sol-secondary transition-colors hover:text-sol-ink"
                >
                  {t(link.labelKey)}
                </button>
              ) : (
                <Link
                  key={link.labelKey}
                  to={link.to!}
                  className="text-[0.85rem] font-medium text-sol-secondary transition-colors hover:text-sol-ink"
                >
                  {t(link.labelKey)}
                </Link>
              ),
            )}
          </nav>

          <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
            <p className="text-[0.78rem] text-sol-secondary">{t("footer.contactPrompt")}</p>
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
          <p>
            © {new Date().getFullYear()} Solventia. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="transition-colors hover:text-sol-ink">
              {t("footer.privacy")}
            </Link>
            <Link to="/terms" className="transition-colors hover:text-sol-ink">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
