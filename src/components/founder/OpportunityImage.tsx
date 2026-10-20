import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, RefreshCw } from "lucide-react";

import {
  ensureOpportunityImage,
  getOpportunityImages,
  type OpportunityImageResult,
} from "@/lib/actions/opportunity-images";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Ideas this browser session has already auto-generated for. A failure is never
 * retried automatically — the founder presses Try again — so a broken key or a
 * quota error cannot turn into a loop of paid requests. */
const attempted = new Set<string>();

/** The cached photo for an idea. With `generate`, an idea that has none gets ONE
 * automatic generation attempt; without it the hook only ever reads. */
export function useOpportunityImage(id: string, { generate = false } = {}) {
  const queryClient = useQueryClient();
  const key = qk.opportunityImage(id);
  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<OpportunityImageResult> =>
      (await getOpportunityImages({ data: { ids: [id] } }))[id] ?? { status: "none" },
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
  const mutation = useMutation({
    mutationFn: (regenerate: boolean) => ensureOpportunityImage({ data: { id, regenerate } }),
    onSuccess: (res) => queryClient.setQueryData(key, res),
    onError: (err) => console.error("[opportunity-image] generation failed:", err),
  });

  const status = query.data?.status;
  const { mutate, isPending } = mutation;
  useEffect(() => {
    if (generate && status === "none" && !isPending && !attempted.has(id)) {
      attempted.add(id);
      mutate(false);
    }
  }, [generate, status, isPending, id, mutate]);

  const url = query.data?.status === "ready" ? query.data.url : null;
  return {
    url,
    loading: query.isPending,
    generating: isPending,
    failed: mutation.isError,
    unavailable: status === "unavailable",
    generate: () => mutation.mutate(false),
    regenerate: () => mutation.mutate(true),
  };
}

type ImageState = ReturnType<typeof useOpportunityImage>;

/** The photo, or a neutral placeholder while it loads / when it could not be made.
 * Fills its parent; the parent decides size and crop. */
export function OpportunityPhoto({
  image,
  title,
  className,
  compact = false,
}: {
  image: ImageState;
  title: string;
  className?: string;
  /** Thumbnails: no status text, no buttons. */
  compact?: boolean;
}) {
  const { t } = useLocale();
  if (image.url) {
    return (
      <img
        src={image.url}
        alt={t("img.alt", { title })}
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover", className)}
      />
    );
  }
  const busy = image.loading || image.generating;
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-sol-cobalt-ultralight to-sol-ivory-light px-3 text-center text-sol-secondary",
        busy && "animate-pulse",
        className,
      )}
      role={busy ? "status" : undefined}
      data-testid="idea-image-placeholder"
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin text-sol-cobalt" aria-hidden="true" />
      ) : (
        <ImageIcon className="size-5" aria-hidden="true" />
      )}
      {!compact && image.generating && <p className="text-[0.875rem]">{t("img.generating")}</p>}
      {!compact && image.failed && !image.generating && (
        <>
          <p className="text-[0.875rem]">{t("img.failed")}</p>
          <button
            type="button"
            onClick={image.generate}
            className="rounded-full border border-sol-border bg-white px-3 py-1 text-[0.875rem] font-medium text-sol-ink hover:border-sol-cobalt/50"
          >
            {t("img.retry")}
          </button>
        </>
      )}
    </div>
  );
}

/** Small, explicit regenerate control — the only way a paid image call is made
 * for an idea that already has a photo. */
export function RegenerateImageButton({ image }: { image: ImageState }) {
  const { t } = useLocale();
  if (!image.url || image.unavailable) return null;
  return (
    <button
      type="button"
      onClick={image.regenerate}
      disabled={image.generating}
      aria-label={t("img.regenerate")}
      title={t("img.regenerate")}
      className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full border border-sol-border bg-white/90 text-sol-ink opacity-0 transition-opacity hover:border-sol-cobalt/50 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-100"
      data-testid="regenerate-image"
    >
      <RefreshCw className={cn("size-4", image.generating && "animate-spin")} aria-hidden="true" />
    </button>
  );
}

/** The Command Center hero: title and short description at ~60%, the photo at
 * ~40% fading into the card. Stacks on mobile with the title first. */
export function IdeaHero({
  id,
  title,
  description,
  badge,
  actions,
  titleTestId,
  aside,
}: {
  id: string;
  title: string;
  description: string | null;
  badge?: React.ReactNode;
  actions: React.ReactNode;
  titleTestId?: string;
  aside?: React.ReactNode;
}) {
  const { t } = useLocale();
  const image = useOpportunityImage(id, { generate: true });
  const showImage = !image.unavailable;
  return (
    <section
      className="group relative grid overflow-hidden rounded-[1.5rem] border border-sol-border bg-sol-surface md:min-h-[17rem] md:grid-cols-[3fr_2fr]"
      data-testid="idea-hero"
    >
      <div className="relative z-10 flex flex-col justify-center gap-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="sol-eyebrow">{t("cc.hero.label")}</p>
          {badge}
        </div>
        <h2
          className="max-w-[26ch] font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-semibold leading-[1.1] text-sol-ink"
          data-testid={titleTestId}
        >
          {title}
        </h2>
        {description && (
          <p className="line-clamp-3 max-w-[56ch] text-[1.0625rem] leading-snug text-sol-secondary">
            {description}
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">{actions}</div>
      </div>
      {aside && (
        <div className="relative z-20 px-6 pb-2 sm:px-8 md:absolute md:right-5 md:top-5 md:w-[17rem] md:p-0">
          {aside}
        </div>
      )}
      {showImage && (
        <div
          className="relative h-44 sm:h-52 md:order-last md:h-auto"
          data-testid="idea-hero-image"
        >
          <OpportunityPhoto image={image} title={title} />
          <div
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-sol-surface via-transparent to-transparent md:block"
            aria-hidden="true"
          />
          <RegenerateImageButton image={image} />
        </div>
      )}
    </section>
  );
}
