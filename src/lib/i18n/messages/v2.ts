/** Dashboard v2 (redesign-v2, part 3): strings added by the redesign. */
const en = {
  "v2.nav.aria": "Dashboard",
  "v2.nav.locked": "Choose a direction first",
  "v2.account.aria": "Account, history and settings",
  "v2.fit.gap": "Gap",
  "v2.fit.legend": "What the fit bar shows",
  "v2.fit.countClear": "{n} clear",
  "v2.fit.countGap.one": "{n} gap",
  "v2.fit.countGap.other": "{n} gaps",
  "v2.fit.countCritical": "{n} critical",
  "v2.fit.countUnknown": "{n} not known yet",
} as const;

const hi: Record<keyof typeof en, string> = {
  "v2.nav.aria": "डैशबोर्ड",
  "v2.nav.locked": "पहले एक दिशा चुनें",
  "v2.account.aria": "अकाउंट, इतिहास और सेटिंग्स",
  "v2.fit.gap": "कमी",
  "v2.fit.legend": "फ़िट बार क्या दिखाता है",
  "v2.fit.countClear": "{n} साफ़",
  "v2.fit.countGap.one": "{n} कमी",
  "v2.fit.countGap.other": "{n} कमियाँ",
  "v2.fit.countCritical": "{n} गंभीर",
  "v2.fit.countUnknown": "{n} अभी पता नहीं",
};

export default { en, hi };
