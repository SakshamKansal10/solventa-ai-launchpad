export type Locale = "en" | "hi";

export const LOCALE_STORAGE_KEY = "solventia-locale-v1";

/** Every string keyed here is available in both languages — added
 * screen-by-screen, highest-traffic first (homepage, auth), per the
 * explicit "prioritize highest-traffic screens" instruction. A key
 * missing from the Hindi half is not a bug: t() falls back to English
 * for it (see LocaleProvider) rather than showing a blank string, so
 * partial coverage never breaks the page — see the final report for
 * exactly what's covered so far. AI-generated content (ideas, roadmap
 * detail, Ask Sol replies) is never in this dictionary — it's generated
 * per founder, not a fixed string, and stays English-only in this pass. */
export const DICTIONARY: Record<Locale, Record<string, string>> = {
  en: {
    "nav.product": "Product",
    "nav.howItWorks": "How It Works",
    "nav.forOrganizations": "For Organizations",
    "nav.about": "About",
    "nav.signIn": "Sign In",
    "nav.findMyBusinessIdea": "Find My Business Idea",
    "nav.continueDashboard": "Continue Dashboard",
    "nav.startNewConsultation": "Start New Consultation",
    "nav.signOut": "Sign Out",
    "nav.history": "History",
    "nav.settings": "Settings",

    "hero.eyebrow": "AI-Powered Founder Operating System",
    "hero.headline1": "Your Direction.",
    "hero.headline2": "Our Intelligence.",
    "hero.headline3": "Real Execution.",
    "hero.subhead":
      "Solventia turns your skills, resources and ambition into business directions you can actually test, build and grow.",
    "hero.cta.primary": "Find My Business Idea",
    "hero.cta.secondary": "See How It Works",

    "footer.tagline": "VALIDATE • BUILD • ELEVATE",
    "footer.aboutSolventia": "About Solventia",
    "footer.contactPrompt": "Questions, partnerships or feedback?",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms",
    "footer.rights": "All rights reserved.",

    "founderSignal.eyebrow": "The Solventia Difference",
    "founderSignal.headline1": "Your profile should",
    "founderSignal.headline2": "change the opportunity.",
    "founderSignal.subhead": "Watch how Solventia turns founder context into business direction.",

    "howItWorks.eyebrow": "How It Works",
    "howItWorks.headline": "From uncertainty to execution.",
    "howItWorks.subhead":
      "Every consultation moves you through the same four stages, calibrated to your own answers.",

    "adaptiveRoadmap.headline": "Your plan changes when reality does.",

    "whySolventia.headline": "Why not just ask a chatbot?",

    "brandMoment.eyebrow": "Why Solventia Exists",
    "brandMoment.statement1": "Millions have ideas.",
    "brandMoment.statement2": "Few have the clarity",
    "brandMoment.statement3": "to turn them into something real.",

    "finalCta.headline1": "Find the direction",
    "finalCta.headline2": "worth building.",
    "finalCta.subhead": "Your Founder Genome starts with a few structured questions.",
    "finalCta.cta": "Build My Founder Profile",
    "finalCta.orgPrompt": "Building a founder program?",
    "finalCta.orgLink": "Solventia for Organizations →",

    "faq.title": "Questions before you start?",

    "signin.welcomeBack": "Welcome back",
    "signin.subhead": "Sign in to continue building with Solventia.",
    "signin.continueWithGoogle": "Continue with Google",
    "signin.or": "or",
    "signin.email": "Email",
    "signin.password": "Password",
    "signin.submit": "Sign In",
    "signin.forgotPassword": "Forgot your password? Sign in with a code instead",
    "signin.checkEmail": "Check your email for a code",
    "signin.verify": "Verify & sign in",
    "signin.back": "Back",
    "signin.resendCode": "Resend code",

    "language.switch": "हिंदी",
  },
  hi: {
    "nav.product": "प्रोडक्ट",
    "nav.howItWorks": "कैसे काम करता है",
    "nav.forOrganizations": "संस्थानों के लिए",
    "nav.about": "हमारे बारे में",
    "nav.signIn": "साइन इन करें",
    "nav.findMyBusinessIdea": "मेरा बिज़नेस आइडिया खोजें",
    "nav.continueDashboard": "डैशबोर्ड जारी रखें",
    "nav.startNewConsultation": "नई कंसल्टेशन शुरू करें",
    "nav.signOut": "साइन आउट करें",
    "nav.history": "इतिहास",
    "nav.settings": "सेटिंग्स",

    "hero.eyebrow": "AI-संचालित फाउंडर ऑपरेटिंग सिस्टम",
    "hero.headline1": "आपकी दिशा।",
    "hero.headline2": "हमारी बुद्धिमत्ता।",
    "hero.headline3": "वास्तविक निष्पादन।",
    "hero.subhead":
      "Solventia आपके कौशल, संसाधनों और महत्वाकांक्षा को ऐसी बिज़नेस दिशाओं में बदलता है जिन्हें आप वाकई परख सकते हैं, बना सकते हैं और आगे बढ़ा सकते हैं।",
    "hero.cta.primary": "मेरा बिज़नेस आइडिया खोजें",
    "hero.cta.secondary": "देखें यह कैसे काम करता है",

    "footer.tagline": "परखें • बनाएं • आगे बढ़ें",
    "footer.aboutSolventia": "Solventia के बारे में",
    "footer.contactPrompt": "सवाल, साझेदारी या सुझाव?",
    "footer.privacy": "गोपनीयता",
    "footer.terms": "नियम व शर्तें",
    "footer.rights": "सर्वाधिकार सुरक्षित।",

    "founderSignal.eyebrow": "Solventia का फ़र्क",
    "founderSignal.headline1": "आपकी प्रोफ़ाइल को",
    "founderSignal.headline2": "अवसर बदलना चाहिए।",
    "founderSignal.subhead":
      "देखें कि Solventia फाउंडर की जानकारी को बिज़नेस दिशा में कैसे बदलता है।",

    "howItWorks.eyebrow": "यह कैसे काम करता है",
    "howItWorks.headline": "अनिश्चितता से निष्पादन तक।",
    "howItWorks.subhead":
      "हर कंसल्टेशन आपको इन्हीं चार चरणों से गुज़ारती है, आपके अपने जवाबों के अनुसार।",

    "adaptiveRoadmap.headline": "जब हकीकत बदलती है, आपकी योजना भी बदलती है।",

    "whySolventia.headline": "सिर्फ़ किसी चैटबॉट से क्यों न पूछें?",

    "brandMoment.eyebrow": "Solventia क्यों बना",
    "brandMoment.statement1": "लाखों के पास आइडिया हैं।",
    "brandMoment.statement2": "बहुत कम के पास वह स्पष्टता है",
    "brandMoment.statement3": "जो उन्हें हकीकत में बदल सके।",

    "finalCta.headline1": "वह दिशा खोजें",
    "finalCta.headline2": "जो बनाने लायक है।",
    "finalCta.subhead": "आपका फाउंडर जीनोम कुछ सरल सवालों से शुरू होता है।",
    "finalCta.cta": "मेरी फाउंडर प्रोफ़ाइल बनाएं",
    "finalCta.orgPrompt": "फाउंडर प्रोग्राम बना रहे हैं?",
    "finalCta.orgLink": "संस्थानों के लिए Solventia →",

    "faq.title": "शुरू करने से पहले कोई सवाल?",

    "signin.welcomeBack": "वापसी पर स्वागत है",
    "signin.subhead": "Solventia के साथ आगे बढ़ने के लिए साइन इन करें।",
    "signin.continueWithGoogle": "Google से जारी रखें",
    "signin.or": "या",
    "signin.email": "ईमेल",
    "signin.password": "पासवर्ड",
    "signin.submit": "साइन इन करें",
    "signin.forgotPassword": "पासवर्ड भूल गए? इसके बजाय कोड से साइन इन करें",
    "signin.checkEmail": "कोड के लिए अपना ईमेल देखें",
    "signin.verify": "सत्यापित करें और साइन इन करें",
    "signin.back": "वापस",
    "signin.resendCode": "कोड फिर से भेजें",

    "language.switch": "English",
  },
};
