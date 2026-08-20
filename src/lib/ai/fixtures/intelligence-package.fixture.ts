import type { SolventiaIntelligencePackage } from "@/lib/ai/schemas";

/**
 * DEV/TEST FIXTURE — NOT AI OUTPUT, NEVER A PRODUCTION FALLBACK.
 *
 * A hand-written object that conforms to SolventiaIntelligencePackageSchema
 * (verified by intelligence-package.fixture.test.ts, which parses it
 * through the real schema), used to exercise the full downstream UI
 * (dashboard, opportunity detail, roadmap, task interactions) without
 * spending a Gemini request. Nothing in production code imports this file
 * — the only importer is scripts/seed-fixture.ts, a standalone dev tool.
 * If you ever see this content in a real user's dashboard, that's a bug:
 * check whether something outside scripts/ started importing this file.
 */
export const FIXTURE_PROFILE_ANSWERS: Record<string, unknown> = {
  age: "26",
  country: "India",
  state: "Maharashtra",
  city: "Pune",
  currentStatus: "Working Professional",
  yearsExperience: "3–5 years",
  annualIncome: "₹5–10L",
  skills: [
    { name: "Web Development", level: "intermediate" },
    { name: "Digital Marketing", level: "beginner" },
  ],
  investmentBudget: "₹50,000 – ₹2,00,000",
  timeAvailableWeekly: "10–20 hrs",
  riskAppetite: "Balanced",
  workLocation: "Remote",
  soloOrTeam: "Solo",
  goals: ["A second income stream"],
  monthlyIncomeGoal: "₹20,000 – ₹50,000",
  timeline: "6–12 months",
  biggestMotivation:
    "I want more control over my time and income instead of relying only on my job.",
};

export const FIXTURE_INTELLIGENCE_PACKAGE: SolventiaIntelligencePackage = {
  founderDNA: {
    narrativeSummary:
      "You're a working professional with real technical skills and a stable income, looking for a side venture that respects your limited weekly hours rather than demanding you quit your job. You lean toward calculated bets, not big swings.",
    strengths: [
      "Intermediate web development skills you can monetize directly",
      "Stable day-job income reduces pressure to earn immediately",
      "Comfortable working solo and remotely",
    ],
    resources: [
      "₹50,000–2,00,000 available capital",
      "10-20 hours/week outside your job",
      "A laptop and reliable internet",
    ],
    constraints: [
      "Limited weekly hours means task loads must stay realistic",
      "A day job means anything requiring daytime availability is out",
    ],
    workStyle:
      "You'll execute best on focused, solo, evening/weekend work — not team coordination overhead.",
    riskProfile:
      "Balanced — you want real upside but won't gamble your capital or your job security on it.",
    direction:
      "A second income stream in the ₹20,000–50,000/month range within 6-12 months, without quitting your job.",
    strategicSignals: [
      "Your technical skills plus a stable income mean you can afford to build something slowly and correctly rather than rushing to revenue — most people in your position over-index on speed.",
      "Solo + remote + limited hours points strongly toward productized services or digital products over anything requiring in-person presence or a team.",
    ],
  },
  opportunities: [
    {
      title: "Freelance Website Builds for Local Businesses",
      category: "digital service",
      plainEnglishSummary:
        "Build simple, professional websites for local shops and service businesses that don't have one yet.",
      customer:
        "Local shop owners, clinics, and service businesses (salons, consultants, tutors) without a website.",
      problem:
        "Most small local businesses lose customers who search online and find nothing, but can't justify hiring an agency.",
      solution:
        "Offer fixed-price, fast-turnaround websites built on a simple template you customize per client.",
      whyThisFounder: [
        "Your intermediate web development skills directly produce the deliverable — no new skill needed to start",
        "10-20 hrs/week is enough for 1-2 client projects per month at a realistic pace",
        "Solo execution fits your stated preference for working alone",
      ],
      businessModelPlainEnglish:
        "Charge a fixed price per website (e.g. ₹8,000-15,000), plus an optional small monthly fee for hosting and updates.",
      startingCapital: "₹5,000–10,000 to start (a domain, hosting, and basic tools)",
      weeklyTime: "10-15 hrs/week for one active client project",
      difficulty: "Beginner-friendly",
      skillsAlreadyOwned: ["Web Development"],
      skillsToLearn: ["Basic client sales conversations", "Simple invoicing/contracts"],
      resourceRequirements: [
        "A portfolio site of your own",
        "A template/starter kit to speed up builds",
      ],
      advantages: [
        "Immediate use of an existing skill",
        "Low starting capital",
        "Clear, easy-to-explain value proposition",
      ],
      tradeoffs: [
        "Income caps out with your available hours — it's a service, not something that scales itself",
      ],
      risks: [
        "Local businesses can be slow to pay or make decisions",
        "Price competition from freelance marketplaces",
      ],
      unknowns: [
        "Whether local businesses in your area will pay ₹8,000+ or expect it much cheaper",
      ],
      validationNeeded: [
        "Talk to 5 local business owners about their current website situation and what they'd pay",
      ],
      revenuePath:
        "Start with 1 client at ₹8,000-10,000, raise prices as you build a portfolio and referrals.",
      firstExperiment:
        "Message 5 local business owners you already know (or walk into 5 shops) and ask if they have a website — if not, offer to show them a mockup for free.",
      fitSignals: {
        requiredSkills: [{ name: "Web Development", minLevel: "intermediate" }],
        startupCapitalINR: 8000,
        weeklyHoursNeeded: 12,
        riskLevel: "cautious",
        motivationAlignment: "high",
        requiresLeadership: false,
        requiresSales: true,
        soloFriendly: true,
        relevantExperienceYears: 1,
        requiresDigitalAssets: true,
        locationFlexible: true,
      },
      roadmap: {
        phases: [
          {
            key: "validate",
            title: "Validate Demand",
            description: "Confirm local businesses actually want this before building anything.",
            tasks: [
              {
                what: "List 15 local businesses without a website",
                why: "You need real prospects before you can validate anything.",
                how: "Walk your neighborhood's main street and note every shop/service without visible web presence, or search Google Maps for local categories and check which ones lack a website link.",
                resource: null,
                timeEstimate: "1-2 hours",
                deadlineDaysFromStart: 3,
                doneWhen: "You have a list of 15 named businesses with contact info.",
                required: true,
                dependsOn: null,
              },
              {
                what: "Talk to 5 of them about their website situation",
                why: "Confirms real demand and realistic pricing expectations before you invest more time.",
                how: "Visit or call, ask: 'Do you have a website? Would you want one if it was affordable?' Note their reactions.",
                resource: null,
                timeEstimate: "2-3 hours",
                deadlineDaysFromStart: 10,
                doneWhen: "You've had 5 real conversations and written down what each said.",
                required: true,
                dependsOn: "List 15 local businesses without a website",
              },
            ],
          },
          {
            key: "build",
            title: "Build Your First Site",
            description: "Create a real, presentable portfolio piece.",
            tasks: [
              {
                what: "Learn a simple website builder or template system",
                why: "Speeds up every future build and keeps quality consistent.",
                how: "Pick one tool (e.g. a modern site builder or a simple template) and build one full practice site end to end.",
                resource: "Official documentation/tutorials for whichever builder you choose",
                timeEstimate: "4-6 hours",
                deadlineDaysFromStart: 20,
                doneWhen: "You've built one complete practice website using your chosen tool.",
                required: true,
                dependsOn: null,
              },
              {
                what: "Build your own portfolio site",
                why: "You need something real to show prospects — nobody hires a web builder with no visible site.",
                how: "Use what you just learned to build a simple one-page site showcasing your service and pricing.",
                resource: null,
                timeEstimate: "3-4 hours",
                deadlineDaysFromStart: 25,
                doneWhen: "Your portfolio site is live at a real URL.",
                required: true,
                dependsOn: "Learn a simple website builder or template system",
              },
            ],
          },
          {
            key: "launch",
            title: "Get Your First Paying Client",
            description: "Turn one of your validated conversations into a paid project.",
            tasks: [
              {
                what: "Send a firm offer to your 2 warmest leads",
                why: "Conversations without a concrete offer rarely convert.",
                how: "Message the 2 business owners who responded most positively with a specific price and turnaround time.",
                resource: null,
                timeEstimate: "1 hour",
                deadlineDaysFromStart: 30,
                doneWhen: "You've sent 2 concrete offers with price and timeline.",
                required: true,
                dependsOn: "Talk to 5 of them about their website situation",
              },
              {
                what: "Deliver your first paid website",
                why: "This is the actual first revenue and proof the business works.",
                how: "Build, review with the client, and launch their site.",
                resource: null,
                timeEstimate: "8-10 hours",
                deadlineDaysFromStart: 45,
                doneWhen: "The client's site is live and they've paid.",
                required: true,
                dependsOn: "Send a firm offer to your 2 warmest leads",
              },
            ],
          },
        ],
      },
    },
    {
      title: "Niche Digital Product: Templates for Freelancers",
      category: "digital product",
      plainEnglishSummary:
        "Create and sell a small pack of website/document templates for other freelancers in your field.",
      customer:
        "Junior freelance developers/designers who want a professional starting point without building from scratch.",
      problem:
        "Many new freelancers waste weeks rebuilding the same basic pages (portfolio, invoice, proposal) from zero.",
      solution: "Package a polished, reusable template set and sell it once, download-and-use.",
      whyThisFounder: [
        "Your web development skill lets you build genuinely usable templates, not generic ones",
        "A digital product needs almost no ongoing weekly hours once built, fitting your limited time",
        "Low starting capital matches your balanced risk appetite",
      ],
      businessModelPlainEnglish:
        "One-time purchase price per template pack (e.g. ₹999-1,999), sold through a simple storefront.",
      startingCapital: "₹3,000–7,000 (storefront tools, design assets)",
      weeklyTime:
        "15-20 hrs/week during the 6-week build, then just a few hours/week for marketing",
      difficulty: "Moderate",
      skillsAlreadyOwned: ["Web Development"],
      skillsToLearn: ["Basic marketing/content creation", "Packaging a digital product for sale"],
      resourceRequirements: ["A storefront platform", "Design/mockup tools"],
      advantages: [
        "Scales without more of your time once built",
        "Low ongoing effort after launch",
      ],
      tradeoffs: [
        "Slower to first revenue than direct client work",
        "Requires marketing skill you don't have yet",
      ],
      risks: [
        "Market may already be saturated with free alternatives",
        "No guaranteed buyers even after building it",
      ],
      unknowns: [
        "Whether freelancers in your target niche will pay for templates vs. use free ones",
      ],
      validationNeeded: [
        "Post in 2-3 freelancer communities asking if this would be useful, gauge real interest",
      ],
      revenuePath:
        "Launch at a low intro price to first buyers, raise price as reviews/proof accumulate.",
      firstExperiment:
        "Post in one freelancer Discord/community describing the template pack idea and ask who'd actually buy it at ₹999.",
      fitSignals: {
        requiredSkills: [{ name: "Web Development", minLevel: "intermediate" }],
        startupCapitalINR: 5000,
        weeklyHoursNeeded: 18,
        riskLevel: "balanced",
        motivationAlignment: "medium",
        requiresLeadership: false,
        requiresSales: false,
        soloFriendly: true,
        relevantExperienceYears: 1,
        requiresDigitalAssets: true,
        locationFlexible: true,
      },
      roadmap: {
        phases: [
          {
            key: "validate",
            title: "Test the Idea",
            description: "Confirm freelancers would actually pay before spending weeks building.",
            tasks: [
              {
                what: "Post the idea in 2 freelancer communities",
                why: "Real reactions from your target audience are worth more than guessing.",
                how: "Write a short post describing the template pack and ask who would pay ₹999 for it.",
                resource: null,
                timeEstimate: "1 hour",
                deadlineDaysFromStart: 5,
                doneWhen:
                  "You've posted in 2 communities and collected at least 10 reactions/replies.",
                required: true,
                dependsOn: null,
              },
              {
                what: "List the exact templates to include",
                why: "A vague 'template pack' doesn't sell — a specific, named list does.",
                how: "Based on the feedback, write down the 5-8 specific templates you'll build.",
                resource: null,
                timeEstimate: "1 hour",
                deadlineDaysFromStart: 7,
                doneWhen: "You have a finalized, named list of templates.",
                required: true,
                dependsOn: "Post the idea in 2 freelancer communities",
              },
            ],
          },
          {
            key: "build",
            title: "Build the Pack",
            description: "Create the actual product.",
            tasks: [
              {
                what: "Build the first 3 templates",
                why: "Starting with a subset lets you test quality and pacing before committing to the full set.",
                how: "Design and build each template to a genuinely professional standard, not a rough draft.",
                resource: null,
                timeEstimate: "10-12 hours",
                deadlineDaysFromStart: 21,
                doneWhen: "3 templates are complete and polished.",
                required: true,
                dependsOn: "List the exact templates to include",
              },
              {
                what: "Build the remaining templates and package the pack",
                why: "Completes the sellable product.",
                how: "Finish the rest of the list, then bundle everything into a clean, documented download.",
                resource: null,
                timeEstimate: "10-12 hours",
                deadlineDaysFromStart: 35,
                doneWhen: "The full pack is built, tested, and ready to sell.",
                required: true,
                dependsOn: "Build the first 3 templates",
              },
            ],
          },
          {
            key: "launch",
            title: "Launch and Sell",
            description: "Get it in front of buyers.",
            tasks: [
              {
                what: "Set up a simple storefront",
                why: "You need somewhere real to sell the pack.",
                how: "Use a simple digital-product storefront tool to list the pack with screenshots and pricing.",
                resource: null,
                timeEstimate: "2-3 hours",
                deadlineDaysFromStart: 38,
                doneWhen: "The storefront listing is live and purchasable.",
                required: true,
                dependsOn: "Build the remaining templates and package the pack",
              },
              {
                what: "Announce it to everyone who showed early interest",
                why: "Your warmest leads are the people who already reacted positively during validation.",
                how: "Message everyone who engaged with your original post, with a launch discount.",
                resource: null,
                timeEstimate: "1-2 hours",
                deadlineDaysFromStart: 40,
                doneWhen: "You've made your first sale.",
                required: true,
                dependsOn: "Set up a simple storefront",
              },
            ],
          },
        ],
      },
    },
    {
      title: "Paid Newsletter for Local Job Seekers",
      category: "content/community",
      plainEnglishSummary:
        "A weekly newsletter curating real job openings and application tips for your city.",
      customer:
        "Job seekers in your city who are tired of scattered job listings across too many platforms.",
      problem:
        "Local job seekers waste hours checking multiple sites and miss openings that get filled fast.",
      solution:
        "Curate and summarize the best local openings weekly, plus practical application advice, in one email.",
      whyThisFounder: [
        "Requires almost no technical build — mostly research and writing, testing a different muscle than your day job",
        "Fits your limited weekly hours since curation is a bounded, repeatable task",
        "Low starting capital fits your balanced risk profile",
      ],
      businessModelPlainEnglish:
        "Free tier to build an audience, paid tier (₹99-199/month) for early access and personalized tips.",
      startingCapital: "₹2,000–5,000 (email tool subscription)",
      weeklyTime: "8-10 hrs/week for research and writing",
      difficulty: "Beginner-friendly",
      skillsAlreadyOwned: ["Digital Marketing"],
      skillsToLearn: ["Newsletter writing/curation", "Basic audience-building tactics"],
      resourceRequirements: [
        "An email newsletter platform",
        "A short list of job-source websites to monitor",
      ],
      advantages: ["Very low starting cost", "Directly serves a clear, recurring need"],
      tradeoffs: [
        "Takes longer to reach meaningful subscriber revenue than a service you can sell directly",
      ],
      risks: [
        "Free job boards may reduce willingness to pay",
        "Requires consistent weekly output to keep subscribers",
      ],
      unknowns: ["Whether local job seekers will pay for curation vs. use free listings"],
      validationNeeded: [
        "Run 4 free weekly issues and measure real open/click rates before adding a paid tier",
      ],
      firstExperiment:
        "Publish one free sample issue curating 10 real local job openings and share it in 2 local community groups.",
      revenuePath:
        "Grow a free list to 200+ engaged readers first, then introduce a modest paid tier.",
      fitSignals: {
        requiredSkills: [{ name: "Digital Marketing", minLevel: "beginner" }],
        startupCapitalINR: 3000,
        weeklyHoursNeeded: 9,
        riskLevel: "cautious",
        motivationAlignment: "medium",
        requiresLeadership: false,
        requiresSales: false,
        soloFriendly: true,
        relevantExperienceYears: 0,
        requiresDigitalAssets: true,
        locationFlexible: true,
      },
      roadmap: {
        phases: [
          {
            key: "understand",
            title: "Understand the Format",
            description: "Learn what makes a newsletter people actually open and read.",
            tasks: [
              {
                what: "Subscribe to 3 similar newsletters in other cities",
                why: "You need a real model for structure and tone before writing your own.",
                how: "Search for 'job newsletter [other city]' and subscribe to a few to study their format.",
                resource: null,
                timeEstimate: "1 hour",
                deadlineDaysFromStart: 3,
                doneWhen: "You've subscribed to 3 and noted what you like/dislike about each.",
                required: true,
                dependsOn: null,
              },
              {
                what: "List 8 sources of real local job openings",
                why: "You need reliable sources to curate from every week.",
                how: "Identify company career pages, local job boards, and LinkedIn searches specific to your city.",
                resource: null,
                timeEstimate: "1-2 hours",
                deadlineDaysFromStart: 5,
                doneWhen: "You have 8 named sources bookmarked.",
                required: true,
                dependsOn: null,
              },
            ],
          },
          {
            key: "build",
            title: "Publish Your First Issues",
            description: "Prove you can consistently produce a real issue.",
            tasks: [
              {
                what: "Set up your newsletter platform",
                why: "You need real infrastructure before publishing.",
                how: "Sign up for a newsletter tool and set up your sending list and basic branding.",
                resource: null,
                timeEstimate: "2 hours",
                deadlineDaysFromStart: 8,
                doneWhen: "Your newsletter platform account is set up and ready to send.",
                required: true,
                dependsOn: "List 8 sources of real local job openings",
              },
              {
                what: "Write and send your first issue",
                why: "This is the actual product — everything else is preparation.",
                how: "Curate 10 real openings with 1-2 lines of context each, plus one practical tip.",
                resource: null,
                timeEstimate: "3-4 hours",
                deadlineDaysFromStart: 12,
                doneWhen: "Issue #1 is sent to your initial list.",
                required: true,
                dependsOn: "Set up your newsletter platform",
              },
            ],
          },
          {
            key: "improve",
            title: "Grow and Refine",
            description: "Build a real, engaged audience.",
            tasks: [
              {
                what: "Share each issue in 2 local community groups",
                why: "Organic distribution in relevant communities is the cheapest way to grow.",
                how: "Post a short summary + signup link in relevant local Facebook/WhatsApp/Reddit groups each week.",
                resource: null,
                timeEstimate: "30 min/week",
                deadlineDaysFromStart: 14,
                doneWhen: "You've shared at least 4 consecutive issues in community groups.",
                required: true,
                dependsOn: "Write and send your first issue",
              },
              {
                what: "Review open/click rates after 4 issues",
                why: "Real engagement data tells you whether this is working before you invest more time.",
                how: "Check your newsletter platform's analytics and compare against typical benchmarks.",
                resource: null,
                timeEstimate: "1 hour",
                deadlineDaysFromStart: 35,
                doneWhen:
                  "You've reviewed 4 issues of data and decided whether to continue as-is or adjust.",
                required: false,
                dependsOn: "Share each issue in 2 local community groups",
              },
            ],
          },
        ],
      },
    },
  ],
};
