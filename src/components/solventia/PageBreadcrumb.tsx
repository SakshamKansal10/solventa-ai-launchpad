import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Small, quiet page-relationship signal for public subpages — "Solventia
 * > This Page" — not decoration, and not shown on the homepage itself or
 * on utility pages (sign-in) where it adds nothing. */
export function PageBreadcrumb({ page }: { page: string }) {
  return (
    <Breadcrumb className="mb-5">
      <BreadcrumbList className="text-[0.8rem]">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="text-sol-secondary transition-colors hover:text-sol-ink">
              Solventia
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="text-sol-muted [&>svg]:size-3.5" />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium text-sol-ink">{page}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
