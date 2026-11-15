/**
 * The opening question, "What brings you here?" (redesign-v2, intro). It frames Solventia as the
 * answer while the 3D world loads underneath. First visits only, never a mid-page arrival.
 *
 * The decision is made by INTRO_GATE_SCRIPT, inline in <head>, before the first paint: it sets
 * `<html data-intro="show">`, and only then is the server-rendered question visible (CSS). So a
 * returning visitor never sees it flash, and a first-time visitor sees it from the first frame.
 *
 *   ?intro=1     always show it (review, verification)
 *   ?intro=auto  apply the normal rules even in an automated browser
 */
export const INTRO_SEEN_KEY = "sol-intro-seen";
export const INTRO_CHOICE_KEY = "sol-intro-choice";
/** Fired on window when the visitor's answer is stored, so the film can tailor its line. */
export const INTRO_CHOICE_EVENT = "sol-intro-choice";

export const INTRO_CHOICES = ["start", "idea", "stuck"] as const;
export type IntroChoice = (typeof INTRO_CHOICES)[number];
/** Chosen for the visitor when they do not tap within the question's time. */
export const DEFAULT_CHOICE: IntroChoice = "start";

/**
 * Skipped for: a visitor who has seen it (localStorage), a deep link (#hash, ?next=), a back /
 * forward or reload navigation (they arrive part-way), a page already scrolled, review and test
 * URLs (?tier, ?freeze, ?debug, ?perf, ?notch) and automated browsers — unless ?intro says
 * otherwise. Plain ES5, wrapped in try: if anything throws, there is simply no intro.
 */
export const INTRO_GATE_SCRIPT = `(function(){try{
var q=new URLSearchParams(location.search),i=q.get("intro");
if(i!=="1"){
if(navigator.webdriver&&i!=="auto")return;
if(localStorage.getItem("${INTRO_SEEN_KEY}"))return;
if(location.hash)return;
var r=["tier","freeze","debug","perf","notch","next"];
for(var k=0;k<r.length;k++)if(q.has(r[k]))return;
var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];
if(n&&(n.type==="reload"||n.type==="back_forward"))return;
if(window.scrollY>0)return;
}
document.documentElement.setAttribute("data-intro","show");
}catch(e){}})();`;

export const introRequested = () =>
  typeof document !== "undefined" && document.documentElement.dataset.intro === "show";

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, new Date().toISOString());
  } catch {
    /* private mode: the visitor may see it again; nothing else depends on it */
  }
}

export function saveIntroChoice(choice: IntroChoice) {
  try {
    sessionStorage.setItem(INTRO_CHOICE_KEY, choice);
  } catch {
    /* the film simply keeps its default line */
  }
  window.dispatchEvent(new Event(INTRO_CHOICE_EVENT));
}

export function readIntroChoice(): IntroChoice | null {
  try {
    const v = sessionStorage.getItem(INTRO_CHOICE_KEY);
    return (INTRO_CHOICES as readonly string[]).includes(v ?? "") ? (v as IntroChoice) : null;
  } catch {
    return null;
  }
}
