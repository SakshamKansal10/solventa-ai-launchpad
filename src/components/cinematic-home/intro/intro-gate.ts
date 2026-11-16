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

export type IntroGate = "show" | "return" | "signedin";

/** The signed-in welcome, cached on the dashboard for the next opening (never fetched for it). */
export const FIRST_NAME_KEY = "sol-first-name";
export const HAS_PLAN_KEY = "sol-has-roadmap";

/**
 * What the signed-in welcome says, decided ONCE before the first paint by the head gate
 * (window.__solIntro: the first name from the Supabase session cookie, else the cached one; and
 * the cached "has a plan"). The server renders the defaults; an inline script beside the text
 * writes these before the browser paints; React's first render reads the same values, so the
 * text never changes on screen (owner, 2026-11-16).
 */
export function readWelcome(): { name: string | null; plan: boolean } {
  if (typeof window === "undefined") return { name: null, plan: false };
  const w = (window as unknown as { __solIntro?: { name: string | null; plan: boolean | null } })
    .__solIntro;
  return { name: w?.name ?? null, plan: w?.plan === true };
}

/** Signing out forgets the welcome, so the next person on this browser is not greeted by it. */
export function clearWelcome() {
  try {
    localStorage.removeItem(FIRST_NAME_KEY);
    localStorage.removeItem(HAS_PLAN_KEY);
  } catch {
    /* nothing stored */
  }
}

/** Called wherever the signed-in founder is known (the dashboard): the next opening's welcome. */
export function cacheWelcome(firstName: string | null | undefined, hasPlan?: boolean) {
  try {
    if (firstName) localStorage.setItem(FIRST_NAME_KEY, firstName);
    if (hasPlan !== undefined) localStorage.setItem(HAS_PLAN_KEY, hasPlan ? "1" : "0");
  } catch {
    /* private mode: the welcome says "Welcome back." */
  }
}

/**
 * Who gets which opening — decided before the first paint:
 *   signed in (a Supabase session cookie)          → "signedin": welcome back, by name
 *   a choice they once tapped (sessionStorage/local) → "return": one line for that choice
 *   anyone else (first visit, or never tapped)      → "show": "What brings you here?"
 * No opening for: a deep link (#hash, ?next=), a back / forward or reload navigation, a page
 * already scrolled, review and test URLs (?tier, ?freeze, ?debug, ?perf, ?notch) and automated
 * browsers — unless ?intro says otherwise (1 / return / signedin force one; auto applies the
 * rules). Plain ES5 in a try: if anything throws, there is simply no opening.
 */
export const INTRO_GATE_SCRIPT = `(function(){try{
var d=document.documentElement,q=new URLSearchParams(location.search),i=q.get("intro"),c=null;
try{c=sessionStorage.getItem("${INTRO_CHOICE_KEY}")||localStorage.getItem("${INTRO_CHOICE_KEY}");}catch(e){}
if(c==="start"||c==="idea"||c==="stuck")d.setAttribute("data-intro-choice",c);else c=null;
function nm(){try{var p=document.cookie.split(/;\\s*/),ch=[],k,m,v,b,s,md,n;
for(k=0;k<p.length;k++){m=/^sb-[^=]*-auth-token(?:\\.(\\d+))?=(.*)$/.exec(p[k]);if(m)ch[m[1]?+m[1]:0]=m[2];}
v=ch.join("");if(v){v=decodeURIComponent(v);if(v.indexOf("base64-")===0){b=v.slice(7).replace(/-/g,"+").replace(/_/g,"/");while(b.length%4)b+="=";v=decodeURIComponent(escape(atob(b)));}
s=JSON.parse(v);md=(s&&s.user&&s.user.user_metadata)||{};n=md.given_name||md.full_name||md.name;
if(n){n=String(n).trim().split(/\\s+/)[0].slice(0,40);if(n)return n;}}}catch(e){}
try{return localStorage.getItem("${FIRST_NAME_KEY}")||null;}catch(e){return null;}}
function welcome(){var pl=null;try{pl=localStorage.getItem("${HAS_PLAN_KEY}")==="1";}catch(e){}window.__solIntro={name:nm(),plan:pl};}
if(i==="1"){d.setAttribute("data-intro","show");return;}
if(i==="return"||i==="signedin"){if(i==="signedin")welcome();d.setAttribute("data-intro",i);return;}
if(navigator.webdriver&&i!=="auto")return;
if(location.hash)return;
var r=["tier","freeze","debug","perf","notch","next"];
for(var k=0;k<r.length;k++)if(q.has(r[k]))return;
var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];
if(n&&(n.type==="reload"||n.type==="back_forward"))return;
if(window.scrollY>0)return;
var signed=/(?:^|;\\s*)sb-[^=]*-auth-token/.test(document.cookie);
if(signed)welcome();
d.setAttribute("data-intro",signed?"signedin":c?"return":"show");
}catch(e){}})();`;

/** What the head gate decided for this visit (null = no opening). */
export function introGate(): IntroGate | null {
  if (typeof document === "undefined") return null;
  const v = document.documentElement.dataset.intro;
  return v === "show" || v === "return" || v === "signedin" ? v : null;
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
