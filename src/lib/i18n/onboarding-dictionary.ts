import type { Locale } from "./dictionary";

/** English -> natural Hindi, for the consultation flow specifically.
 * Keyed by the EXACT English string already used as a question's `label`/
 * `helper`/`placeholder`/option text throughout onboarding-steps.ts and
 * its renderers — never a restructuring of those files, so the founder's
 * ANSWER (the raw English option string passed to setAnswer) is never
 * touched, only what's displayed. That matters beyond cosmetics:
 * normalizeProfile's bracket/enum lookups (WEEKLY_HOURS_MIDPOINT,
 * RISK_APPETITE_MAP, bracketValue, etc.) and the AI prompt itself depend
 * on receiving the exact English canonical strings regardless of display
 * language — translating the stored value would silently break scoring
 * and the founder-profile prompt.
 *
 * Deliberately NOT translated here (English stays, by design — see the
 * final report for the full rationale): individual skill names
 * (SKILL_CATEGORIES, 150+ entries), MAJOR_OPTIONS, INDUSTRY_OPTIONS,
 * country/language names, and the dynamically-composed per-founder
 * "insight"/"processing" lines in onboarding-insights.ts (template text
 * built from the founder's own answers, closer to AI-generated content
 * than static UI chrome). Every one of those falls back to English via
 * translateOnboardingText's own fallback, never a blank string. */
export const ONBOARDING_DICTIONARY: Record<string, string> = {
  // ---- Section intros ----
  Foundation: "आधार",
  "Let's start with the basics — who you are, where you're based, and where you stand today.":
    "चलिए शुरुआती बातों से शुरू करते हैं — आप कौन हैं, कहाँ से हैं, और आज आप कहाँ खड़े हैं।",
  "Your Edge": "आपकी खासियत",
  "Don't worry if you don't have professional experience yet — curiosity and willingness to learn matter just as much.":
    "अगर अभी आपके पास प्रोफेशनल अनुभव नहीं है तो चिंता न करें — जिज्ञासा और सीखने की इच्छा भी उतनी ही मायने रखती है।",
  "Your Resources": "आपके संसाधन",
  "Money is only one resource. Many successful founders started with little capital — we'll design a journey around your current situation.":
    "पैसा सिर्फ़ एक संसाधन है। कई सफल फाउंडरों ने बहुत कम पूंजी से शुरुआत की — हम आपकी मौजूदा स्थिति के हिसाब से रास्ता बनाएंगे।",
  "Your Risk": "आपका जोखिम",
  "There's no wrong answer here — how you handle exposure and uncertainty shapes what kind of venture will actually feel right to run.":
    "यहाँ कोई गलत जवाब नहीं है — आप अनिश्चितता को कैसे संभालते हैं, यही तय करता है कि किस तरह का बिज़नेस आपके लिए सही रहेगा।",
  "Your Motivation": "आपकी प्रेरणा",
  "This is the part most tools skip. There's no scoring here — we just want to understand what's actually driving you.":
    "ज़्यादातर टूल्स इस हिस्से को छोड़ देते हैं। यहाँ कोई स्कोरिंग नहीं है — हम बस यह समझना चाहते हैं कि असल में आपको क्या आगे बढ़ा रहा है।",
  "Your Reality": "आपकी हकीकत",
  "Real plans account for real limits. Nothing here disqualifies you — it just shows exactly how much room you have to maneuver.":
    "असली योजनाएं असली सीमाओं को ध्यान में रखती हैं। यहाँ कुछ भी आपको अयोग्य नहीं ठहराता — यह बस दिखाता है कि आपके पास कितनी गुंजाइश है।",
  "Your Direction": "आपकी दिशा",
  "What does success actually look like for you? Be honest — there's no prize for the most ambitious answer. This is where everything starts converging.":
    "आपके लिए सफलता असल में कैसी दिखती है? ईमानदार रहें — सबसे महत्वाकांक्षी जवाब देने पर कोई इनाम नहीं है। यहीं से सब कुछ एक साथ आना शुरू होता है।",

  // ---- Section-intro theme opener/feeling ----
  "Let's understand you.": "चलिए आपको समझते हैं।",
  Discovery: "खोज",
  "Let's uncover your strengths.": "चलिए आपकी ताकतों को उजागर करते हैं।",
  Potential: "क्षमता",
  "Let's understand your resources.": "चलिए आपके संसाधनों को समझते हैं।",
  Growth: "विकास",
  "Let's understand how you make decisions.": "चलिए समझते हैं कि आप फैसले कैसे लेते हैं।",
  Decision: "निर्णय",
  "Let's talk about what's really driving you.":
    "चलिए बात करते हैं कि असल में आपको क्या आगे बढ़ा रहा है।",
  "Inner Drive": "भीतरी जज़्बा",
  "Let's get practical about your limits.":
    "चलिए आपकी सीमाओं के बारे में व्यावहारिक रूप से बात करते हैं।",
  Clarity: "स्पष्टता",
  "Let's define where you want to go.": "चलिए तय करते हैं कि आप कहाँ पहुँचना चाहते हैं।",
  Elevation: "ऊँचाई",

  // ---- Question labels ----
  "How old are you?": "आपकी उम्र क्या है?",
  "Which country are you based in?": "आप किस देश में हैं?",
  "Where are you based?": "आप कहाँ स्थित हैं?",
  "What's your highest completed education?": "आपकी सबसे ऊँची पूरी की गई पढ़ाई क्या है?",
  "Which of these best describes where you are right now?":
    "इनमें से कौन-सा आपकी वर्तमान स्थिति को सबसे अच्छी तरह बताता है?",
  "What best describes where you are right now?":
    "आपकी वर्तमान स्थिति को सबसे अच्छी तरह क्या बताता है?",
  "Which languages are you comfortable working in?": "आप किन भाषाओं में सहजता से काम कर सकते हैं?",
  "Where are you studying?": "आप कहाँ पढ़ाई कर रहे हैं?",
  "What's your major or specialization?": "आपका विषय या विशेषज्ञता क्या है?",
  "What industry are you in?": "आप किस इंडस्ट्री में हैं?",
  "How many years of experience do you have?": "आपके पास कितने साल का अनुभव है?",
  "What's your approximate annual income?": "आपकी अनुमानित सालाना आय क्या है?",
  "What's your current business's approximate annual revenue?":
    "आपके मौजूदा बिज़नेस का अनुमानित सालाना राजस्व क्या है?",
  "Who are your current customers?": "आपके मौजूदा ग्राहक कौन हैं?",
  "How many hours a week can you realistically give to a new venture?":
    "आप एक नए वेंचर को हफ़्ते में वास्तव में कितने घंटे दे सकते हैं?",
  "What are you good at?": "आप किसमें अच्छे हैं?",
  "How much could you realistically invest to get started?":
    "शुरुआत करने के लिए आप वास्तव में कितना निवेश कर सकते हैं?",
  "Roughly how much could you realistically invest?": "मोटे तौर पर आप कितना निवेश कर सकते हैं?",
  "Do you have access to any of these?": "क्या आपके पास इनमें से किसी तक पहुंच है?",
  "How reliable is your internet access?": "आपकी इंटरनेट सुविधा कितनी भरोसेमंद है?",
  "How easily can you travel to meet people or run errands?":
    "आप लोगों से मिलने या काम निपटाने के लिए कितनी आसानी से यात्रा कर सकते हैं?",
  "Remote or in person?": "रिमोट या आमने-सामने?",
  "What kind of venture excites you most?": "किस तरह का वेंचर आपको सबसे ज़्यादा उत्साहित करता है?",
  "Building this alone or with others?": "इसे अकेले बनाएंगे या दूसरों के साथ?",
  "How comfortable are you leading others?":
    "दूसरों का नेतृत्व करने में आप कितना सहज महसूस करते हैं?",
  "How do you feel about selling or pitching?": "बेचने या पिच करने के बारे में आपको कैसा लगता है?",
  "How comfortable are you with uncertainty?": "अनिश्चितता के साथ आप कितना सहज हैं?",
  "What would genuinely drive you to build this?": "इसे बनाने के लिए वाकई आपको क्या प्रेरित करेगा?",
  "What genuinely drives you to build this?": "इसे बनाने के लिए वाकई आपको क्या प्रेरित करता है?",
  "Which problem areas resonate with you?": "कौन-से समस्या क्षेत्र आपसे जुड़ते हैं?",
  "What specific problem bothers you?": "कौन-सी खास समस्या आपको परेशान करती है?",
  "Any industries or types of business you'd rather avoid?":
    "कोई ऐसी इंडस्ट्री या बिज़नेस जिससे आप बचना चाहेंगे?",
  "What other industries or business types would you rather avoid?":
    "और कौन-सी इंडस्ट्री या बिज़नेस प्रकार से आप बचना चाहेंगे?",
  "Could you relocate if a real opportunity required it?":
    "अगर किसी असली अवसर के लिए ज़रूरी हो तो क्या आप स्थानांतरित हो सकते हैं?",
  "Anything that shapes your realistic starting point?":
    "क्या कुछ है जो आपकी वास्तविक शुरुआत को प्रभावित करता है?",
  "What else should Sol know?": "Sol को और क्या पता होना चाहिए?",
  "Would you consider leaving your job for this, if it worked out?":
    "अगर यह सफल हो जाए, तो क्या आप इसके लिए अपनी नौकरी छोड़ने पर विचार करेंगे?",
  "What are you hoping this leads to?": "आप उम्मीद करते हैं कि यह किस ओर ले जाएगा?",
  "What monthly income would feel like a real win, a year from now?":
    "एक साल बाद, कौन-सी महीने की आय आपको असली जीत जैसी लगेगी?",
  "What timeline feels realistic to you?": "आपको कौन-सा समयसीमा यथार्थवादी लगता है?",

  // ---- Helper text ----
  "Search, select, or add your own.": "खोजें, चुनें, या अपना खुद जोड़ें।",
  "Search for your college or university.": "अपने कॉलेज या यूनिवर्सिटी को खोजें।",
  "Search, select, and rate your comfort level. Add your own if it's missing.":
    "खोजें, चुनें, और अपने सहज स्तर को रेट करें। अगर मौजूद नहीं है तो अपना खुद जोड़ें।",
  "An approximate amount is perfectly fine.": "अनुमानित राशि भी बिल्कुल ठीक है।",
  "Pick everything that's true for you.": "जो भी आपके लिए सच है, वह सब चुनें।",
  "There's no wrong answer — pick whatever genuinely stands out.":
    "कोई गलत जवाब नहीं है — जो भी वाकई आपको सबसे ज़्यादा लगे, वह चुनें।",
  "Health, scheduling, family commitments — pick whatever applies.":
    "स्वास्थ्य, समय-सीमा, पारिवारिक ज़िम्मेदारियां — जो भी लागू हो वह चुनें।",

  // ---- Placeholders ----
  "e.g. Vocational certification, trade school": "जैसे: व्यावसायिक प्रमाणपत्र, ट्रेड स्कूल",
  "e.g. Full-time caregiver, between opportunities": "जैसे: पूर्णकालिक देखभालकर्ता, अवसरों के बीच",
  "e.g. Marine biology, urban planning": "जैसे: समुद्री जीव विज्ञान, शहरी योजना",
  "e.g. Renewable energy, aerospace": "जैसे: नवीकरणीय ऊर्जा, एयरोस्पेस",
  "e.g. 25,000": "जैसे: 25,000",
  "In a few words…": "कुछ शब्दों में…",

  // ---- Options: education ----
  "Below 10th": "10वीं से कम",
  "10th Pass": "10वीं पास",
  "12th Pass": "12वीं पास",
  Diploma: "डिप्लोमा",
  "Bachelor's Degree": "स्नातक (Bachelor's)",
  "Master's Degree": "स्नातकोत्तर (Master's)",
  Doctorate: "डॉक्टरेट",
  Other: "अन्य",

  // ---- Options: current status ----
  "School Student": "स्कूल छात्र",
  "College Student": "कॉलेज छात्र",
  "Working Professional": "कामकाजी पेशेवर",
  "Business Owner": "व्यवसाय स्वामी",
  Freelancer: "फ्रीलांसर",
  Unemployed: "बेरोज़गार",
  "Career Break": "करियर ब्रेक",

  // ---- Options: experience / customers ----
  "Under 1 year": "1 साल से कम",
  "1–3 years": "1–3 साल",
  "3–5 years": "3–5 साल",
  "5–10 years": "5–10 साल",
  "10+ years": "10+ साल",
  "Individual consumers": "व्यक्तिगत उपभोक्ता",
  "Local businesses": "स्थानीय व्यवसाय",
  "Other businesses (B2B)": "अन्य व्यवसाय (B2B)",
  "Government or institutions": "सरकार या संस्थान",
  "Online & global customers": "ऑनलाइन और वैश्विक ग्राहक",

  // ---- Options: weekly hours ----
  "Under 5 hrs": "5 घंटे से कम",
  "5–10 hrs": "5–10 घंटे",
  "10–20 hrs": "10–20 घंटे",
  "20+ hrs": "20+ घंटे",
  "Full-time": "पूर्णकालिक",

  // ---- Options: assets / everyday reality ----
  "A smartphone": "एक स्मार्टफ़ोन",
  "A laptop / computer": "एक लैपटॉप / कंप्यूटर",
  "A vehicle": "एक वाहन",
  "A workspace at home": "घर पर काम की जगह",
  "Camera / recording gear": "कैमरा / रिकॉर्डिंग उपकरण",
  "None of these yet": "अभी इनमें से कुछ नहीं",
  "Excellent, always on": "बेहतरीन, हमेशा चालू",
  "Good, mostly reliable": "अच्छा, ज़्यादातर भरोसेमंद",
  Patchy: "कभी-कभी बाधित",
  "Very limited": "बहुत सीमित",
  "Very easily": "बहुत आसानी से",
  "With some planning": "कुछ योजना के साथ",
  Difficult: "मुश्किल",
  "Not able to travel much": "ज़्यादा यात्रा करने में असमर्थ",

  // ---- Options: work style / people ----
  Remote: "रिमोट",
  "In person": "आमने-सामने",
  "A mix of both": "दोनों का मिश्रण",
  "No strong preference": "कोई खास प्राथमिकता नहीं",
  "Making content": "कंटेंट बनाना",
  "Building a product": "प्रोडक्ट बनाना",
  "Offering a service": "सेवा देना",
  "Not sure yet": "अभी तय नहीं",
  Solo: "अकेले",
  "With a small team": "छोटी टीम के साथ",
  "With a co-founder": "सह-संस्थापक के साथ",
  "Very comfortable": "बहुत सहज",
  "Somewhat comfortable": "थोड़ा सहज",
  "Prefer not to": "नहीं करना पसंद करूंगा",
  Untested: "अभी आज़माया नहीं",
  "I enjoy it": "मुझे यह पसंद है",
  "I can do it if needed": "ज़रूरत पड़ने पर कर सकता हूं",
  "It makes me uneasy": "इससे मुझे असहजता होती है",
  "Never tried": "कभी कोशिश नहीं की",

  // ---- Options: risk spectrum ----
  "Very cautious": "बहुत सतर्क",
  Balanced: "संतुलित",
  "Comfortable experimenting": "प्रयोग करने में सहज",

  // ---- Options: motivation ----
  "Solving a problem I've personally experienced": "एक ऐसी समस्या हल करना जो मैंने खुद झेली है",
  "Building something people would pay for": "कुछ ऐसा बनाना जिसके लिए लोग पैसे देंगे",
  "Financial independence": "आर्थिक स्वतंत्रता",
  "Learning by building something real": "कुछ असली बनाकर सीखना",
  "Making an impact in my community": "अपने समुदाय में बदलाव लाना",
  "Creative expression through a product or brand":
    "प्रोडक्ट या ब्रांड के ज़रिए रचनात्मक अभिव्यक्ति",
  "Proving I can build something from scratch": "यह साबित करना कि मैं शुरू से कुछ बना सकता हूं",
  "Following an idea I've had for a while": "काफी समय से मन में रहे एक विचार को आगे बढ़ाना",

  // ---- Options: problem domains ----
  "Healthcare & wellbeing": "स्वास्थ्य और भलाई",
  "Education & learning": "शिक्षा और सीखना",
  "Environment & sustainability": "पर्यावरण और स्थिरता",
  "Local commerce & small business": "स्थानीय व्यापार और छोटे व्यवसाय",
  "Technology accessibility": "तकनीक की पहुंच",
  "Financial inclusion": "वित्तीय समावेशन",
  "Food & agriculture": "भोजन और कृषि",
  "Transportation & logistics": "परिवहन और लॉजिस्टिक्स",
  "Housing & urban life": "आवास और शहरी जीवन",
  "Community & social connection": "समुदाय और सामाजिक जुड़ाव",
  "Nothing specific comes to mind": "कुछ खास ध्यान में नहीं आता",

  // ---- Options: industry restrictions ----
  Alcohol: "शराब",
  Tobacco: "तंबाकू",
  Gambling: "जुआ",
  "Adult content": "वयस्क सामग्री",
  "Weapons / firearms": "हथियार / बंदूकें",
  "Animal products / testing": "पशु उत्पाद / परीक्षण",
  "Religion or politics": "धर्म या राजनीति",

  // ---- Options: relocation ----
  "Yes, easily": "हां, आसानी से",
  "Possibly, for the right reason": "सही वजह हो तो शायद",
  Unlikely: "संभावना कम",
  No: "नहीं",

  // ---- Options: other constraints ----
  "Health or medical considerations": "स्वास्थ्य या चिकित्सा संबंधी बातें",
  "Caregiving or family commitments": "देखभाल या पारिवारिक ज़िम्मेदारियां",
  "Fixed work/school schedule": "तय काम/स्कूल का समय",
  "Limited mobility or travel": "सीमित आवागमन या यात्रा",
  "Visa or work-authorization limits": "वीज़ा या कार्य-अनुमति की सीमाएं",
  "Language barrier in local market": "स्थानीय बाज़ार में भाषा की बाधा",
  "None of these": "इनमें से कोई नहीं",

  // ---- Options: willing to leave job ----
  "Yes, if it replaced my income": "हां, अगर यह मेरी आय की जगह ले ले",
  "Possibly, eventually": "शायद, आगे चलकर",
  "No, this is deliberately a side project": "नहीं, यह जानबूझकर एक साइड प्रोजेक्ट है",

  // ---- Options: goals ----
  "Pocket money": "जेब खर्च",
  "Learning entrepreneurship": "उद्यमिता सीखना",
  "A future startup": "भविष्य का स्टार्टअप",
  "Social impact": "सामाजिक प्रभाव",
  "Replacing my salary": "अपनी सैलरी की जगह लेना",
  "A second income stream": "दूसरी आय का स्रोत",
  "Eventually quitting my job": "आगे चलकर नौकरी छोड़ना",
  "Scaling an existing venture": "मौजूदा वेंचर को बड़ा करना",
  "A steady income": "एक स्थिर आय",

  // ---- Options: timeline ----
  "Within 3 months": "3 महीने के भीतर",
  "3–6 months": "3–6 महीने",
  "6–12 months": "6–12 महीने",
  "1–2 years": "1–2 साल",
  "No fixed timeline": "कोई तय समयसीमा नहीं",

  // ---- Spectrum interpretations ----
  "You'd rather move slowly and protect what you have than risk it on a long shot. I'll prioritize low-risk, low-capital paths.":
    "आप धीरे चलना और जो है उसे बचाना पसंद करेंगे, बजाय किसी बड़े जोखिम में डालने के। मैं कम-जोखिम, कम-पूंजी वाले रास्तों को प्राथमिकता दूंगा।",
  "You want meaningful upside, but you're not interested in risking everything to chase it.":
    "आप वाकई मायने रखने वाला फ़ायदा चाहते हैं, लेकिन उसके पीछे सब कुछ दांव पर लगाने में दिलचस्पी नहीं है।",
  "You're willing to take real risks for a real shot at something bigger.":
    "आप किसी बड़ी चीज़ के लिए असली मौका पाने के लिए असली जोखिम लेने को तैयार हैं।",

  // ---- Control strings ----
  Continue: "जारी रखें",
  "Skip this one": "इसे छोड़ें",
  "All of the above": "ऊपर के सभी",
  "Choose one…": "एक चुनें…",
  "Search…": "खोजें…",
  "Your Everyday Reality": "आपकी रोज़मर्रा की हकीकत",
  "Your Work Style": "आपकी काम करने की शैली",
  "Working With People": "लोगों के साथ काम करना",

  // ---- Welcome / AI intro / completion screens ----
  "Editing Your Founder Profile": "अपनी फाउंडर प्रोफ़ाइल संपादित करें",
  "Solventia Consultation": "Solventia कंसल्टेशन",
  "Update What’s Changed.": "जो बदला है, उसे अपडेट करें।",
  "Let’s Build Your Entrepreneurial Journey.": "चलिए आपकी उद्यमी यात्रा बनाते हैं।",
  "Every answer is already filled in from your last consultation. Skip through anything unchanged, and edit only what’s different.":
    "आपके पिछले कंसल्टेशन से हर जवाब पहले से भरा है। जो नहीं बदला उसे छोड़ें, और सिर्फ़ वही बदलें जो अलग है।",
  "Over the next few minutes, I’ll understand your ambitions, strengths, resources, and circumstances before recommending a business that genuinely fits you.":
    "अगले कुछ मिनटों में, मैं आपकी महत्वाकांक्षाओं, ताकतों, संसाधनों और परिस्थितियों को समझूंगा, फिर एक ऐसा बिज़नेस सुझाऊंगा जो वाकई आपके लिए सही हो।",
  "Your current ideas and roadmap stay exactly where they are until you finish and submit.":
    "जब तक आप पूरा करके सबमिट नहीं करते, आपके मौजूदा आइडिया और रोडमैप वैसे ही रहेंगे।",
  "This isn’t a quiz. It’s a personalized strategy consultation.":
    "यह कोई क्विज़ नहीं है। यह एक व्यक्तिगत रणनीति परामर्श है।",
  "Estimated time: 2–4 minutes": "अनुमानित समय: 2–4 मिनट",
  "Estimated time: 8–10 minutes": "अनुमानित समय: 8–10 मिनट",
  "Continue to My Answers": "मेरे जवाबों पर जारी रखें",
  "Begin My Consultation": "मेरा कंसल्टेशन शुरू करें",
  "Resume saved progress": "सहेजी गई प्रगति जारी रखें",
  "Start fresh": "नए सिरे से शुरू करें",
  "Not now — back to homepage": "अभी नहीं — होमपेज पर वापस जाएं",
  "Hello. I’m Sol.": "नमस्ते। मैं Sol हूं।",
  "My role isn’t simply to recommend business ideas. My responsibility is to understand you first, eliminate unsuitable opportunities, and design a realistic roadmap you can actually follow.":
    "मेरा काम सिर्फ़ बिज़नेस आइडिया सुझाना नहीं है। मेरी ज़िम्मेदारी है पहले आपको समझना, अनुपयुक्त अवसरों को हटाना, और एक यथार्थवादी रोडमैप बनाना जिसे आप वाकई अपना सकें।",
  "Every answer helps me understand your entrepreneurial profile.":
    "हर जवाब मुझे आपकी उद्यमी प्रोफ़ाइल समझने में मदद करता है।",
  "Let’s Begin": "चलिए शुरू करते हैं",
  "Reading your founder profile": "आपकी फाउंडर प्रोफ़ाइल पढ़ी जा रही है",
  "Mapping your constraints": "आपकी सीमाओं का मानचित्रण हो रहा है",
  "Finding opportunity spaces": "अवसर के क्षेत्र खोजे जा रहे हैं",
  "Scoring founder fit": "फाउंडर फ़िट स्कोर किया जा रहा है",
  "Preparing your strongest directions": "आपकी सबसे मज़बूत दिशाएं तैयार की जा रही हैं",
  "Bringing everything together…": "सब कुछ एक साथ लाया जा रहा है…",
  "Sol is building your strategy": "Sol आपकी रणनीति बना रहा है",
  "This usually takes under a minute. Your answers are already saved — safe even if you leave this page.":
    "आमतौर पर इसमें एक मिनट से कम लगता है। आपके जवाब पहले से सहेजे जा चुके हैं — इस पेज से जाने पर भी सुरक्षित।",
  "Your Business DNA is complete.": "आपका बिज़नेस DNA तैयार है।",
  "Your Founder Profile is complete.": "आपकी फाउंडर प्रोफ़ाइल पूरी हो गई।",
  "3 opportunities identified": "3 अवसर पहचाने गए",
  "Execution paths prepared": "निष्पादन के रास्ते तैयार किए गए",
  "Sol couldn't complete the analysis. Your answers are safely saved — try again.":
    "Sol विश्लेषण पूरा नहीं कर सका। आपके जवाब सुरक्षित रूप से सहेजे गए हैं — फिर कोशिश करें।",
  "Try Again": "फिर कोशिश करें",
  "Save & See My Results": "सहेजें और मेरे परिणाम देखें",
  "Back to Homepage": "होमपेज पर वापस जाएं",
  "Start over": "फिर से शुरू करें",

  // ---- Consultation shell chrome ----
  Profile: "प्रोफ़ाइल",
  "Your Founder Profile": "आपकी फाउंडर प्रोफ़ाइल",
  Back: "वापस",
};

/** Falls back to the original English string when a key hasn't been
 * translated (large enumerated vocab lists, dynamic per-founder insight
 * text) — same intentional partial-coverage safety as the main t()
 * (see LocaleProvider). Only active for Hindi; English passes through
 * untouched either way. */
export function translateOnboardingText(
  text: string | undefined,
  locale: Locale,
): string | undefined {
  if (!text) return text;
  if (locale !== "hi") return text;
  return ONBOARDING_DICTIONARY[text] ?? text;
}
