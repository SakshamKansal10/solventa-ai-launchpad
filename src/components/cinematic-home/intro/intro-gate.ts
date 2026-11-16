/**
 * The opening (redesign-v2): "What brings you here?" on a first visit, a short "Welcome back."
 * on a returning one. Both frame Solventia while the 3D world loads underneath, and both end on
 * the lockup that is the film's first frame. Never for a mid-page arrival.
 *
 * The decision is made by INTRO_GATE_SCRIPT, inline in <head>, before the first paint: it sets
 * `<html data-intro="show">` (first visit) or `data-intro="return"` (seen before), plus
 * `data-intro-choice` from their earlier answer. Both openings are server-rendered and hidden by
 * CSS until the gate picks one, so neither ever flashes for the wrong visitor.
 *
 *   ?intro=1       always the first-visit opening (review, verification)
 *   ?intro=return  always the returning opening
 *   ?intro=auto    apply the normal rules even in an automated browser
 */
export const INTRO_SEEN_KEY = "sol-intro-seen";
export const INTRO_CHOICE_KEY = "sol-intro-choice";
/** Fired on window when the visitor's answer is stored, so the film can tailor its line. */
export const INTRO_CHOICE_EVENT = "sol-intro-choice";

export const INTRO_CHOICES = ["start", "idea", "stuck"] as const;
export type IntroChoice = (typeof INTRO_CHOICES)[number];
/** Chosen for the visitor when they do not tap within the question's time. */
export const DEFAULT_CHOICE: IntroChoice = "start";

export type IntroGate = "show" | "return";

/**
 * Skipped (no opening at all) for: a deep link (#hash, ?next=), a back / forward or reload
 * navigation (they arrive part-way), a page already scrolled, review and test URLs (?tier,
 * ?freeze, ?debug, ?perf, ?notch) and automated browsers — unless ?intro says otherwise. A
 * visitor who has seen the first opening gets the returning one. Plain ES5 in a try: if anything
 * throws, there is simply no opening.
 */
export const INTRO_GATE_SCRIPT = `(function(){try{
var d=document.documentElement,q=new URLSearchParams(location.search),i=q.get("intro"),seen=null,c=null;
try{seen=localStorage.getItem("${INTRO_SEEN_KEY}");c=sessionStorage.getItem("${INTRO_CHOICE_KEY}")||localStorage.getItem("${INTRO_CHOICE_KEY}");}catch(e){}
if(c==="start"||c==="idea"||c==="stuck")d.setAttribute("data-intro-choice",c);
if(i==="1"){d.setAttribute("data-intro","show");return;}
if(i==="return"){d.setAttribute("data-intro","return");return;}
if(navigator.webdriver&&i!=="auto")return;
if(location.hash)return;
var r=["tier","freeze","debug","perf","notch","next"];
for(var k=0;k<r.length;k++)if(q.has(r[k]))return;
var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];
if(n&&(n.type==="reload"||n.type==="back_forward"))return;
if(window.scrollY>0)return;
d.setAttribute("data-intro",seen?"return":"show");
}catch(e){}})();`;

/** What the head gate decided for this visit (null = no opening). */
export function introGate(): IntroGate | null {
  if (typeof document === "undefined") return null;
  const v = document.documentElement.dataset.intro;
  return v === "show" || v === "return" ? v : null;
}

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, new Date().toISOString());
  } catch {
    /* private mode: the visitor may see it again; nothing else depends on it */
  }
}

/** Kept for this session (the film's tailored line) and for later visits (the welcome back). */
export function saveIntroChoice(choice: IntroChoice) {
  try {
    sessionStorage.setItem(INTRO_CHOICE_KEY, choice);
    localStorage.setItem(INTRO_CHOICE_KEY, choice);
  } catch {
    /* the film simply keeps its default line */
  }
  window.dispatchEvent(new Event(INTRO_CHOICE_EVENT));
}

export function readIntroChoice(): IntroChoice | null {
  try {
    const v = sessionStorage.getItem(INTRO_CHOICE_KEY) ?? localStorage.getItem(INTRO_CHOICE_KEY);
    return (INTRO_CHOICES as readonly string[]).includes(v ?? "") ? (v as IntroChoice) : null;
  } catch {
    return null;
  }
}
