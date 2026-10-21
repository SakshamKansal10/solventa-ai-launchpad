/** Settings (§19): the name field's real save state. */
const en = {
  "set.profile.state.unsaved": "Unsaved changes",
  "set.profile.state.saving": "Saving…",
  "set.profile.state.saved": "Saved",
  "set.profile.state.error": "We couldn't save your name. Your change is kept — please try again.",
  "set.profile.state.empty": "Your name can't be empty.",
};

const hi: Record<keyof typeof en, string> = {
  "set.profile.state.unsaved": "बदलाव सेव नहीं हुए",
  "set.profile.state.saving": "सेव हो रहा है…",
  "set.profile.state.saved": "सेव हो गया",
  "set.profile.state.error":
    "आपका नाम सेव नहीं हो पाया। आपका बदलाव रखा गया है — कृपया फिर कोशिश करें।",
  "set.profile.state.empty": "नाम ख़ाली नहीं हो सकता।",
};

export default { en, hi };
