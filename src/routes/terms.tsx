import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout, type LegalSection } from "@/components/solventia/LegalPageLayout";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    const canonical = `${url.replace(/\/$/, "")}/terms`;
    return {
      meta: [
        { title: "Terms of Service | Solventia" },
        {
          name: "description",
          content: "The terms that govern your use of Solventia, including our AI disclaimer.",
        },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd("Terms of Service", "/terms", url)),
        },
      ],
    };
  },
});

const LAST_UPDATED = "September 10, 2026";
const CONTACT_EMAIL = "solventia.in@gmail.com";

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-5 marker:text-sol-champagne-deep">
      {items.map((item) => (
        <li key={item} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: <p>By creating an account or using Solventia, you agree to these Terms of Service.</p>,
  },
  {
    id: "what-solventia-provides",
    title: "2. What Solventia Provides",
    body: (
      <p>
        Solventia provides AI-assisted founder profiling, business opportunity generation and
        analysis, validation guidance, adaptive execution roadmaps, and related founder tools.
        Solventia does not guarantee any particular business outcome, including profitability,
        funding, customers, or market demand.
      </p>
    ),
  },
  {
    id: "ai-generated-information",
    title: "3. AI-Generated Information",
    body: (
      <>
        <p>
          Much of what Solventia shows you — ideas, analysis, roadmaps, and Ask Sol replies — is
          AI-assisted. Please keep in mind:
        </p>
        <List
          items={[
            "AI output can be incomplete, generic, or inaccurate",
            "It's an informational and planning tool, not professional advice or a guarantee",
            "You should independently validate important assumptions before acting on them",
            "Solventia does not guarantee profitability, funding, customer demand, or business success",
          ]}
        />
      </>
    ),
  },
  {
    id: "no-professional-advice",
    title: "4. No Professional Advice",
    body: (
      <p>
        Solventia does not provide legal, tax, financial, investment, or accounting advice. Nothing
        on Solventia should be treated as such. Please consult a qualified professional before
        making decisions that require that kind of advice.
      </p>
    ),
  },
  {
    id: "user-responsibilities",
    title: "5. User Responsibilities",
    body: (
      <List
        items={[
          "Provide accurate, lawful information",
          "Use Solventia lawfully and not to harm the service or other users",
          "Independently evaluate important business decisions before acting on them",
          "Keep your account credentials secure",
        ]}
      />
    ),
  },
  {
    id: "accounts",
    title: "6. Accounts",
    body: (
      <p>
        You're responsible for activity under your account. Keep the information on your account
        reasonably accurate, and let us know at {CONTACT_EMAIL} if you believe your account has been
        accessed without your permission.
      </p>
    ),
  },
  {
    id: "intellectual-property",
    title: "7. Intellectual Property",
    body: (
      <p>
        The Solventia brand, logo, software, design, and original website content are owned by
        Solventia. Nothing in these Terms transfers ownership of that to you. We don't claim
        ownership of the personal information or founder-profile answers you provide — see our{" "}
        <a href="/privacy" className="text-sol-violet-deep underline">
          Privacy Policy
        </a>{" "}
        for how that's used.
      </p>
    ),
  },
  {
    id: "user-content",
    title: "8. User Content",
    body: (
      <p>
        You retain rights to the information and content you submit to Solventia (such as
        consultation answers and evidence you record), subject to the permission you give us to
        process it in order to operate the service and generate your ideas, roadmap, and Ask Sol
        replies for you. We don't grant ourselves a broader license to use your content beyond that.
      </p>
    ),
  },
  {
    id: "third-party-services",
    title: "9. Third-Party Services",
    body: (
      <p>
        Solventia relies on third-party infrastructure and services (see our{" "}
        <a href="/privacy" className="text-sol-violet-deep underline">
          Privacy Policy
        </a>{" "}
        for the current list). Those providers have their own terms and policies, which apply to
        their part of the service.
      </p>
    ),
  },
  {
    id: "availability",
    title: "10. Availability and Changes",
    body: (
      <p>
        Solventia's features may change or evolve over time, and the service may occasionally be
        unavailable for maintenance or reasons outside our control. We don't promise uninterrupted
        or error-free availability.
      </p>
    ),
  },
  {
    id: "fees",
    title: "11. Fees and Payments",
    body: (
      <p>
        Solventia currently has no paid plans or checkout. If paid features are introduced in the
        future, their pricing and terms will be clearly disclosed before you're asked to pay
        anything.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "12. Suspension and Termination",
    body: (
      <p>
        We may suspend or terminate access to Solventia for misuse, security concerns, or as
        required by law. You may stop using Solventia, and request account deletion, at any time
        (see our{" "}
        <a href="/data-deletion" className="text-sol-violet-deep underline">
          Delete Your Data
        </a>{" "}
        page).
      </p>
    ),
  },
  {
    id: "warranties",
    title: "13. Disclaimer of Warranties",
    body: (
      <p>
        Solventia is provided "as is," without warranties of any kind, to the extent permitted by
        law. We don't warrant that the service, or any AI-generated output, will be error-free,
        uninterrupted, or fit for a particular purpose.
      </p>
    ),
  },
  {
    id: "liability",
    title: "14. Limitation of Liability",
    body: (
      <p>
        To the extent permitted by law, Solventia is not liable for indirect, incidental, or
        consequential damages arising from your use of the service, including business decisions
        made based on AI-generated output. A specific liability cap and governing jurisdiction have
        not yet been finalized for Solventia and will be added here once established.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "15. Governing Law",
    body: (
      <p>
        Solventia's governing law and jurisdiction have not yet been formally established and will
        be added here once determined. Until then, these Terms should be read in good faith and
        interpreted reasonably by both parties.
      </p>
    ),
  },
  {
    id: "changes-to-terms",
    title: "16. Changes to These Terms",
    body: (
      <p>
        We may update these Terms from time to time. The "Last updated" date at the top of this page
        reflects the most recent revision.
      </p>
    ),
  },
  {
    id: "contact",
    title: "17. Contact",
    body: (
      <p>
        Solventia
        <br />
        Email:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-sol-violet-deep underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    ),
  },
];

function TermsPage() {
  return (
    <LegalPageLayout
      pageLabel="Terms of Service"
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of Solventia, including how we treat AI-generated output and what to expect if paid features are ever introduced."
      sections={SECTIONS}
    />
  );
}
