import type { Locale } from "./dictionary";

/** Same raw-English-string-as-key pattern as onboarding-dictionary.ts,
 * applied to the dashboard/opportunity/roadmap UI chrome — navigation,
 * section headers, action buttons, empty/loading states, roadmap stage
 * and week UI, reflection/blocker prompts. Never the AI-GENERATED
 * content itself (opportunity titles/summaries, founderDNA, roadmap
 * mission/task text) — that's a separate, deliberately different
 * mechanism (see the AI-output-language work in intelligence-package.ts
 * / roadmap-generation.ts), since generated text needs the model to
 * write DIRECTLY in the founder's chosen language, not a lookup table
 * translating fixed UI strings. */
export const DASHBOARD_DICTIONARY: Record<string, string> = {
  // ---- Sidebar navigation ----
  "Command Center": "कमांड सेंटर",
  Ideas: "आइडिया",
  Roadmap: "रोडमैप",
  Proof: "प्रमाण",
  History: "इतिहास",
  Settings: "सेटिंग्स",
  "View profile": "प्रोफ़ाइल देखें",
  "Sign Out": "साइन आउट करें",
  Founder: "फाउंडर",
  "Opening your workspace…": "आपका वर्कस्पेस खोला जा रहा है…",
  "Something went wrong loading your dashboard.": "आपका डैशबोर्ड लोड करने में कुछ गड़बड़ी हुई।",
  "Build your roadmap after selecting a direction.": "दिशा चुनने के बाद अपना रोडमैप बनाएं।",

  // ---- Dashboard home ----
  "Good morning": "सुप्रभात",
  "Good afternoon": "नमस्कार",
  "Good evening": "शुभ संध्या",
  "Let's find your direction.": "चलिए आपकी दिशा खोजते हैं।",
  "Time to build your roadmap.": "अब आपका रोडमैप बनाने का समय है।",
  "Your next move is clear.": "आपका अगला कदम स्पष्ट है।",
  "Sol has a set of directions worth considering below.":
    "नीचे Sol ने कुछ दिशाएं सुझाई हैं जिन पर विचार करने लायक है।",
  "We haven't found a strong enough match yet.": "अभी तक कोई पर्याप्त मज़बूत मेल नहीं मिला है।",
  "Let's explore a wider set of possibilities, or refine your profile.":
    "चलिए और संभावनाएं देखते हैं, या अपनी प्रोफ़ाइल को बेहतर करते हैं।",
  "Explore More Ideas": "और आइडिया देखें",
  "Refine My Profile": "मेरी प्रोफ़ाइल सुधारें",
  "Your Strongest Founder Match": "आपका सबसे मज़बूत फाउंडर मैच",
  "View Full Opportunity": "पूरा अवसर देखें",
  "Why now — ": "अभी क्यों — ",
  "Ready to Execute": "निष्पादन के लिए तैयार",
  "Turn this into a week-by-week plan.": "इसे हफ़्ते-दर-हफ़्ते योजना में बदलें।",
  "Sol designs it around your real time and capital — it unlocks one week at a time as you make progress.":
    "Sol इसे आपके वास्तविक समय और पूंजी के हिसाब से डिज़ाइन करता है — यह आपकी प्रगति के साथ एक-एक करके हफ़्ता खोलता है।",
  "Build My Roadmap": "मेरा रोडमैप बनाएं",
  "This Week": "इस हफ़्ते",
  Continue: "जारी रखें",
  "Alternative Founder Paths": "वैकल्पिक फाउंडर रास्ते",
  Explore: "देखें",
  "Choose Direction": "यह दिशा चुनें",
  "Not seeing yourself in these?": "इनमें अपनी झलक नहीं दिख रही?",
  "Explore More Opportunities": "और अवसर देखें",
  Capital: "पूंजी",
  Time: "समय",
  Risk: "जोखिम",
  "Skill Gap": "कौशल अंतर",

  // ---- Opportunity detail page ----
  Overview: "अवलोकन",
  "Founder Fit": "फाउंडर फ़िट",
  Market: "बाज़ार",
  Fit: "फ़िट",
  Problem: "समस्या",
  "Your Service": "आपकी सेवा",
  Customer: "ग्राहक",
  Revenue: "राजस्व",

  // ---- Dismiss-idea reasons ----
  "Too expensive": "बहुत महंगा",
  "Doesn't interest me": "मुझे दिलचस्पी नहीं",
  "Too difficult": "बहुत कठिन",
  "Doesn't fit my time": "मेरे समय में फिट नहीं बैठता",
  "Doesn't fit my location": "मेरे स्थान के अनुकूल नहीं",
  "Not aligned with my goals": "मेरे लक्ष्यों से मेल नहीं खाता",
  Other: "अन्य",

  // ---- Market evidence tone labels ----
  Strong: "मज़बूत",
  "Early signal": "शुरुआती संकेत",
  Emerging: "उभरता हुआ",
  Competitive: "प्रतिस्पर्धी",
  "Needs validation": "परखना ज़रूरी",
  "Limited evidence": "सीमित प्रमाण",
  Risks: "जोखिम",
  "Selected. Build your roadmap to start executing.":
    "चुना गया। निष्पादन शुरू करने के लिए अपना रोडमैप बनाएं।",
  "Ready to commit to this opportunity?": "इस अवसर के लिए प्रतिबद्ध होने को तैयार हैं?",

  // ---- Evidence Vault ----
  "Evidence Vault": "प्रमाण भंडार",
  "Real-world signal you've actually collected — interviews, observations, pricing reactions. Never AI-generated.":
    "आपके द्वारा वाकई जुटाए गए असली संकेत — इंटरव्यू, अवलोकन, मूल्य प्रतिक्रियाएं। कभी AI-जनित नहीं।",
  "Add Evidence": "प्रमाण जोड़ें",
  Entries: "प्रविष्टियां",
  Interviews: "इंटरव्यू",
  "Paying signals": "भुगतान के संकेत",
  Interview: "इंटरव्यू",
  Note: "नोट",
  Observation: "अवलोकन",
  Low: "कम",
  Medium: "मध्यम",
  High: "उच्च",
  Yes: "हां",
  No: "नहीं",
  Maybe: "शायद",
  "What did you learn or observe?": "आपने क्या सीखा या देखा?",
  "Who did you talk to? (e.g. restaurant owner)": "आपने किससे बात की? (जैसे: रेस्टोरेंट मालिक)",
  "A key quote (optional)": "एक अहम उद्धरण (वैकल्पिक)",
  "Pain:": "समस्या की तीव्रता:",
  "Workaround:": "फ़िलहाल यह करते हैं:",
  "Would pay:": "भुगतान करेंगे:",
  "Save Evidence": "प्रमाण सहेजें",
  "Loading…": "लोड हो रहा है…",
  "Nothing logged yet. Your first interview, test, or observation goes here.":
    "अभी तक कुछ दर्ज नहीं हुआ। आपका पहला इंटरव्यू, परीक्षण, या अवलोकन यहां आएगा।",
  "Would pay": "भुगतान करेंगे",
  "Select this as my opportunity": "इसे मेरा अवसर चुनें",
  Interested: "दिलचस्पी है",
  Save: "सहेजें",
  "Not for me": "मेरे लिए नहीं",
  "Refresh Market Evidence": "बाज़ार का प्रमाण ताज़ा करें",
  "Proof & What Still Needs Validation": "प्रमाण और अभी क्या परखना बाकी है",
  "Needs Validation": "परखना ज़रूरी",
  "Your First Experiment": "आपका पहला प्रयोग",

  // ---- Roadmap ----
  "Execution Roadmap": "निष्पादन रोडमैप",
  Phase: "चरण",
  Progress: "प्रगति",
  "Estimated Path": "अनुमानित रास्ता",
  "Next milestone:": "अगला पड़ाव:",
  Current: "मौजूदा",
  "Ask Sol about this stage": "इस चरण के बारे में Sol से पूछें",
  Mission: "मिशन",
  "This week worked if…": "यह हफ़्ता सफल रहा अगर…",
  "Evidence to capture": "जो प्रमाण जुटाना है",
  Avoid: "इनसे बचें",
  "Your reflection": "आपका आकलन",
  Week: "हफ़्ता",
  done: "पूरा",
  "Next Milestone": "अगला पड़ाव",
  "No roadmap yet.": "अभी कोई रोडमैप नहीं है।",
  "Select an opportunity from your dashboard and Sol will build a roadmap around it.":
    "अपने डैशबोर्ड से एक अवसर चुनें और Sol उसके आसपास एक रोडमैप बनाएगा।",
  "Go to Dashboard": "डैशबोर्ड पर जाएं",
  "Opening your roadmap…": "आपका रोडमैप खोला जा रहा है…",
  "Your Roadmap": "आपका रोडमैप",
  "Your personalized execution plan.": "आपकी व्यक्तिगत निष्पादन योजना।",
  "Why this matters": "यह क्यों मायने रखता है",
  How: "कैसे",
  Resource: "संसाधन",
  "Done when": "पूरा तब माना जाएगा जब",
  Optional: "वैकल्पिक",
  Required: "ज़रूरी",
  Due: "देय तारीख",
  "Depends on:": "इस पर निर्भर:",
  "Blocked — Sol has replanned what's ahead.": "अटका हुआ — Sol ने आगे की योजना फिर से बना दी है।",
  "Mark Complete": "पूरा किया गया चिह्नित करें",
  "Mark Not Done": "पूरा नहीं हुआ चिह्नित करें",
  "I'm stuck on this": "मैं इसमें अटक गया हूं",
  "What got in the way?": "क्या रुकावट आई?",
  "Let Sol replan": "Sol को फिर से योजना बनाने दें",
  "Anything else Sol should know? (optional)": "और कुछ जो Sol को पता होना चाहिए? (वैकल्पिक)",
  "This finishes the week. How did it actually go?":
    "इससे यह हफ़्ता पूरा हो जाएगा। असल में कैसा रहा?",
  "Anything in your way? (optional)": "कोई रुकावट थी? (वैकल्पिक)",
  "Prepare Next Week": "अगला हफ़्ता तैयार करें",
  Cancel: "रद्द करें",
  Completed: "पूरा हुआ",
  "Sol couldn't prepare this week — try again.":
    "Sol इस हफ़्ते को तैयार नहीं कर सका — फिर कोशिश करें।",
  Retry: "फिर कोशिश करें",
  "Sol is preparing this week's mission…": "Sol इस हफ़्ते का मिशन तैयार कर रहा है…",

  // ---- Blocker reasons ----
  Money: "पैसा",
  Difficulty: "कठिनाई",
  Confusion: "उलझन",
  Motivation: "प्रेरणा",
  Access: "पहुंच",
  "Something else": "कुछ और",

  // ---- Reflection ratings ----
  "Stronger than expected": "उम्मीद से बेहतर",
  "About as expected": "जैसा सोचा था वैसा ही",
  "Weaker than expected": "उम्मीद से कमज़ोर",
  Mixed: "मिला-जुला",

  // ---- Roadmap building page ----
  "Map the long-term direction": "लंबी अवधि की दिशा तय करना",
  "Structure your first stage": "आपका पहला चरण तैयार करना",
  "Design Week 1": "पहला हफ़्ता डिज़ाइन करना",
  "Prepare the evidence plan": "प्रमाण की योजना बनाना",
  Ready: "तैयार",
  "Building your first founder mission.": "आपका पहला फाउंडर मिशन बनाया जा रहा है।",
  "Your long-term direction is mapped. We're making Week 1 specific.":
    "आपकी लंबी अवधि की दिशा तय हो चुकी है। अब हफ़्ता 1 को विशिष्ट बनाया जा रहा है।",
  "We couldn't finish this mission yet.": "हम अभी यह मिशन पूरा नहीं कर सके।",
  "Nothing about your selection or your profile was lost — Sol just couldn't finish building the roadmap this time.":
    "आपके चुनाव या प्रोफ़ाइल का कुछ भी नहीं खोया — इस बार Sol बस रोडमैप बनाना पूरा नहीं कर सका।",
  "Try Again": "फिर कोशिश करें",
  "Back to Opportunity": "अवसर पर वापस जाएं",

  // ---- Roadmap building micro-status ----
  "Calibrating workload…": "कार्यभार तय किया जा रहा है…",
  "Checking dependencies…": "निर्भरताएं जांची जा रही हैं…",
  "Defining proof thresholds…": "प्रमाण की सीमा तय की जा रही है…",
  "Sequencing the first actions…": "पहले कदमों का क्रम तय किया जा रहा है…",
  "Checking your constraints…": "आपकी सीमाएं जांची जा रही हैं…",
  "Preparing the evidence target…": "प्रमाण का लक्ष्य तैयार किया जा रहा है…",
};

/** Falls back to the original English string when a key hasn't been
 * translated (deep opportunity-tab detail, settings, history, inbox —
 * disclosed scope boundary, see the final report) — same
 * partial-coverage safety as translateOnboardingText. */
export function translateDashboardText(
  text: string | undefined,
  locale: Locale,
): string | undefined {
  if (!text) return text;
  if (locale !== "hi") return text;
  return DASHBOARD_DICTIONARY[text] ?? text;
}
