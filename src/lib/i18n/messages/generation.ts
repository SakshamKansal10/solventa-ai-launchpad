/** Finding directions: the full-page generation screen, "Find 3 more directions" and Ask Sol's
 * "Find new directions" (owner, 2026-11-17, Jobs M and N). */
const en = {
  "gen.more.cta": "Find 3 more directions",
  "gen.more.note":
    "Three new directions that fit you, never repeating these. Takes a minute or two.",
  "gen.more.running": "Finding more directions — see progress",
  "gen.more.title": "Finding 3 more directions for you",
  "gen.refresh.title": "Finding new directions with what you told Sol",
  "gen.step.reading": "Reading your answers",
  "gen.step.fitting": "Checking what fits",
  "gen.step.writing": "Writing your directions",
  "gen.time": "This takes about a minute or two.",
  "gen.elapsed": "{s} seconds so far",
  "gen.long": "Still working — this one is taking a little longer.",
  "gen.leave":
    "You can leave this page. It keeps going, and you'll see it here when you come back.",
  "gen.done": "Your new directions are ready.",
  "gen.failed.title": "We couldn't find new directions",
  "gen.failed.body": "Nothing was lost. Try again — it picks up the same request.",
  "gen.back": "Back to directions",
  "gen.limit": "You've used today's direction searches. Try again tomorrow.",
  "gen.newSet": "New",
  "gen.earlier": "Earlier directions are kept in History.",
  "gen.earlier.link": "See earlier directions",
  "hist.sets.title": "Earlier directions",
  "hist.sets.set": "Set {n}",
  // Ask Sol: new facts about the founder.
  "sol.facts.ask": "Want me to find new directions with this?",
  "sol.facts.cta": "Find new directions",
  "sol.facts.roadmapNote": "Your current roadmap stays. These are new options to compare.",
  "sol.facts.saved": "Saved to your profile. Your earlier answers are kept.",
  "sol.facts.limit":
    "You've used today's direction searches. Try again tomorrow — your new facts are saved.",
};

const hi: Record<keyof typeof en, string> = {
  "gen.more.cta": "3 और दिशाएं खोजें",
  "gen.more.note":
    "आपके लिए सही तीन नई दिशाएं, इनमें से कोई दोहराई नहीं जाएगी। इसमें एक-दो मिनट लगते हैं।",
  "gen.more.running": "और दिशाएं खोजी जा रही हैं — प्रगति देखें",
  "gen.more.title": "आपके लिए 3 और दिशाएं खोज रहे हैं",
  "gen.refresh.title": "आपने Sol को जो बताया, उसके साथ नई दिशाएं खोज रहे हैं",
  "gen.step.reading": "आपके जवाब पढ़ रहे हैं",
  "gen.step.fitting": "देख रहे हैं कि क्या सही बैठता है",
  "gen.step.writing": "आपकी दिशाएं लिख रहे हैं",
  "gen.time": "इसमें लगभग एक-दो मिनट लगते हैं।",
  "gen.elapsed": "अब तक {s} सेकंड",
  "gen.long": "काम अभी जारी है — इस बार थोड़ा ज़्यादा समय लग रहा है।",
  "gen.leave": "आप यह पेज छोड़ सकते हैं। काम चलता रहेगा, और लौटने पर आप इसे यहीं देखेंगे।",
  "gen.done": "आपकी नई दिशाएं तैयार हैं।",
  "gen.failed.title": "नई दिशाएं नहीं खोज पाए",
  "gen.failed.body": "कुछ भी खोया नहीं है। फिर कोशिश करें — यह उसी अनुरोध को आगे बढ़ाएगा।",
  "gen.back": "दिशाओं पर वापस जाएं",
  "gen.limit": "आज की दिशा-खोज पूरी हो गई। कल फिर कोशिश करें।",
  "gen.newSet": "नई",
  "gen.earlier": "पहले की दिशाएं इतिहास में रखी हैं।",
  "gen.earlier.link": "पहले की दिशाएं देखें",
  "hist.sets.title": "पहले की दिशाएं",
  "hist.sets.set": "सेट {n}",
  "sol.facts.ask": "क्या मैं इसके साथ नई दिशाएं खोजूं?",
  "sol.facts.cta": "नई दिशाएं खोजें",
  "sol.facts.roadmapNote": "आपका मौजूदा रोडमैप बना रहेगा। ये तुलना के लिए नए विकल्प हैं।",
  "sol.facts.saved": "आपकी प्रोफ़ाइल में सेव हो गया। आपके पुराने जवाब भी रखे गए हैं।",
  "sol.facts.limit": "आज की दिशा-खोज पूरी हो गई। कल फिर कोशिश करें — आपकी नई जानकारी सेव है।",
};

export default { en, hi };
