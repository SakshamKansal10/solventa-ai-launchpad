import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout, type LegalSection } from "@/components/solventia/LegalPageLayout";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    const canonical = `${url.replace(/\/$/, "")}/privacy`;
    return {
      meta: [
        { title: "Privacy Policy | Solventia" },
        {
          name: "description",
          content:
            "How Solventia collects, uses, and protects your information, including what happens when you sign in with Google.",
        },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd("Privacy Policy", "/privacy", url)),
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
    id: "about",
    title: "1. About Solventia",
    body: (
      <p>
        Solventia provides AI-assisted business opportunity discovery, founder profiling, validation
        guidance, and adaptive execution roadmaps. This policy explains what information we collect
        through the product, why we collect it, and how you can control it. It applies to
        solventia.in and the Solventia dashboard. It does not apply to third-party sites we link to.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    body: (
      <>
        <p className="font-semibold text-sol-ink">Account information</p>
        <List
          items={[
            "Email address",
            "Name, if you provide it or it's shared by Google when you sign in with Google",
            "Authentication information needed to sign you in (managed by our authentication provider, Supabase)",
          ]}
        />
        <p className="mt-4 font-semibold text-sol-ink">Founder profile information</p>
        <p>
          Collected through the guided consultation you complete when you start using Solventia:
        </p>
        <List
          items={[
            "Age, current status (e.g. student, working professional, business owner), location, education, and languages",
            "Skills and your self-rated comfort level with each",
            "Available capital, other resources, and (if relevant) existing business revenue",
            "Weekly time available, work-style preferences, and risk appetite",
            "Goals, income targets, timeline, and constraints you tell us about (e.g. industries to avoid, relocation limits)",
          ]}
        />
        <p className="mt-4 font-semibold text-sol-ink">Product activity</p>
        <List
          items={[
            "Business opportunities generated for you, and which ones you select, save, or dismiss (and why, if you tell us)",
            "Your roadmap, its phases and weeks, task progress, and any reflections you write when a week closes",
            "Evidence you choose to record (e.g. interview notes, pricing you found, observations) tied to an opportunity",
            "Your conversations with Sol, Solventia's in-product mentor",
          ]}
        />
        <p className="mt-4 font-semibold text-sol-ink">Technical information</p>
        <p>
          As with any hosted web application, our infrastructure providers (see Section 6) may
          process standard technical information — such as IP address and browser/device information
          — as part of normal web server operation and security. Solventia does not separately
          collect analytics or tracking data about you beyond this.
        </p>
        <p className="mt-4 font-semibold text-sol-ink">Cookies and local storage</p>
        <p>
          Solventia uses a cookie to keep you signed in (set by Supabase, our authentication
          provider) and your browser's local storage to save your in-progress consultation answers
          so you don't lose them if you leave and come back. We do not use advertising or cross-site
          tracking cookies.
        </p>
      </>
    ),
  },
  {
    id: "google-sign-in",
    title: "3. Google Sign-In",
    body: (
      <>
        <p>
          If you choose <span className="font-semibold text-sol-ink">Continue with Google</span>,
          Solventia uses Google's sign-in system to authenticate you. We request only the basic
          information Google provides for standard sign-in: your Google account identifier, email
          address, and basic profile information (such as your name). Solventia does not request or
          receive access to your Gmail, Google Drive, Google Calendar, Google Contacts, or any other
          Google service.
        </p>
        <p>
          We use this information solely to create or authenticate your Solventia account and
          provide the service to you. We do not use your Google account information for advertising.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "4. How We Use Information",
    body: (
      <List
        items={[
          "Authenticate you and maintain your account",
          "Generate your Founder Genome and personalized business opportunities",
          "Build and adapt your execution roadmap as you make progress",
          "Power Ask Sol, Solventia's in-product mentor",
          "Send transactional emails related to your account and progress (see Section 7)",
          "Maintain, secure, and troubleshoot the service, and prevent misuse",
        ]}
      />
    ),
  },
  {
    id: "ai-processing",
    title: "5. AI Processing",
    body: (
      <>
        <p>
          To generate your Founder Genome, business opportunities, roadmap, and Ask Sol replies,
          relevant parts of your founder profile and product activity are sent to Google's Gemini AI
          models for processing. We only send what's needed to generate the specific output you
          requested.
        </p>
        <p>
          AI-generated output — including business ideas, analysis, and roadmap content — may be
          incomplete, generic in places, or inaccurate. It is a planning and information tool, not a
          guarantee, and you should independently evaluate it before making important business
          decisions.
        </p>
      </>
    ),
  },
  {
    id: "service-providers",
    title: "6. Service Providers",
    body: (
      <>
        <p>Solventia relies on the following service providers to operate:</p>
        <List
          items={[
            "Supabase — authentication and database hosting",
            "Google — Google sign-in, and Gemini AI models used to generate your ideas, roadmap, and Ask Sol replies",
            "Resend — delivery of transactional emails",
            "Vercel — hosting the Solventia website and application",
          ]}
        />
        <p className="mt-4">
          Each provider processes information only as needed to perform its function for Solventia.
          Solventia does not sell your personal information.
        </p>
      </>
    ),
  },
  {
    id: "transactional-emails",
    title: "7. Transactional Emails",
    body: (
      <p>
        We send service-related emails — for example, verifying your email, letting you know your
        ideas or roadmap are ready, and other account or service notifications. These are
        transactional, not marketing; Solventia does not currently send marketing email.
      </p>
    ),
  },
  {
    id: "data-retention",
    title: "8. Data Retention",
    body: (
      <p>
        We retain your account and product data for as long as your account is active or as needed
        to provide the service to you, subject to a deletion request (see Section 11) or legitimate
        operational and security requirements. We don't currently apply a fixed automatic deletion
        schedule to product data.
      </p>
    ),
  },
  {
    id: "data-security",
    title: "9. Data Security",
    body: (
      <p>
        We use reasonable technical and organizational safeguards appropriate to the service,
        including row-level security policies on our database that restrict each founder's data to
        that founder's own account. No method of transmission or storage is completely secure, and
        we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    id: "your-choices",
    title: "10. Your Choices and Rights",
    body: (
      <List
        items={[
          "Update your Founder Profile at any time from your dashboard's Settings",
          "Update your account name/email where supported",
          "Request a copy or deletion of your data (see Section 11)",
          "Contact us with any privacy question or concern",
        ]}
      />
    ),
  },
  {
    id: "account-deletion",
    title: "11. Account and Data Deletion",
    body: (
      <p>
        To request deletion of your Solventia account and associated personal data, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-sol-violet-deep underline">
          {CONTACT_EMAIL}
        </a>{" "}
        from the address on your account. See our{" "}
        <a href="/data-deletion" className="text-sol-violet-deep underline">
          Delete Your Data
        </a>{" "}
        page for what to include and what to expect.
      </p>
    ),
  },
  {
    id: "children",
    title: "12. Children",
    body: (
      <p>
        Solventia does not currently have a published minimum age policy. If you believe a child has
        provided us with personal information, please contact us at {CONTACT_EMAIL} and we will
        address it.
      </p>
    ),
  },
  {
    id: "international-processing",
    title: "13. International Processing",
    body: (
      <p>
        Our service providers (Section 6) operate cloud infrastructure that may process and store
        information in multiple regions as part of their standard hosting and delivery operations.
      </p>
    ),
  },
  {
    id: "changes",
    title: "14. Changes to This Policy",
    body: (
      <p>
        We may update this policy from time to time. The "Last updated" date at the top of this page
        reflects the most recent revision.
      </p>
    ),
  },
  {
    id: "contact",
    title: "15. Contact",
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

function PrivacyPage() {
  return (
    <LegalPageLayout
      pageLabel="Privacy Policy"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This page explains what information Solventia collects, why, and how you can control it — including exactly what happens when you sign in with Google."
      sections={SECTIONS}
    />
  );
}
