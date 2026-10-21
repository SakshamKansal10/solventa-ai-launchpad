/** Founder fit (canonical model, src/lib/fit/model.ts): labels, factor levels and
 * reasons. Every value shown is the founder's STATED value ({budget}, {hours} are
 * ranges); every requirement of the direction ({need}) is an estimate. */
const en = {
  "fit2.label.strong": "Strong fit",
  "fit2.label.moderate": "Moderate fit",
  "fit2.label.conditional": "Conditional fit",
  "fit2.label.weak": "Weak fit",
  "fit2.label.provisional": "Provisional — more information needed",
  "fit2.labelShort.provisional": "Provisional",

  "fit2.level.3": "Clear fit",
  "fit2.level.2": "Manageable gap",
  "fit2.level.1": "Significant gap",
  "fit2.level.0": "Critical mismatch",
  "fit2.level.unknown": "Not known yet",

  "fit2.factor.access": "Customer access",
  "fit2.factor.resources": "Resources",
  "fit2.factor.capability": "Capability",
  "fit2.factor.time": "Time and constraints",
  "fit2.factor.goals": "Goals and risk",

  "fit2.body.strong":
    "Based on what you have told us, this direction suits your situation well. It still has to be tested with real customers.",
  "fit2.body.moderate":
    "This direction could work for you, with some gaps to plan around. Testing demand comes first.",
  "fit2.body.conditional":
    "This direction would need real changes to work for you right now. Look at the gaps before committing time or money.",
  "fit2.body.weak":
    "This direction does not suit your current situation well. Look at the other directions first.",
  "fit2.body.provisional":
    "We don't know enough yet to judge this fit. Add the missing details to firm it up.",

  "fit2.unknownNote": "Still unknown: {list}. Add it to your profile to firm up this assessment.",

  "fit2.range.between": "{min}–{max}",
  "fit2.range.under": "under {max}",
  "fit2.range.over": "more than {min}",
  "fit2.range.exact": "{min}",
  "fit2.hours.between": "{min}–{max} hours",
  "fit2.hours.under": "under {max} hours",
  "fit2.hours.over": "{min}+ hours",

  "fit2.reason.access_unknown":
    "We don't know yet how you would reach the first customers. Tell us who you can already contact.",
  "fit2.reason.access_network":
    "You told us you have {have}. That gives you a starting route to your first users.",
  "fit2.reason.access_network_confirm":
    "You told us you have {have}. Confirm it includes people who would actually buy this before relying on it.",
  "fit2.reason.access_none_sales":
    "You haven't got a customer network or audience yet, and this direction depends on selling. Reaching the first few buyers is the first thing to test.",
  "fit2.reason.access_none":
    "You don't have an existing network yet. This can start without one, but you will still need a way to reach early users.",

  "fit2.reason.res_unknown": "We don't know your starting budget yet.",
  "fit2.reason.res_no_capital_needed":
    "This can start without spending money. Your stated starting budget: {budget}.",
  "fit2.reason.res_within_lower":
    "Your stated starting budget is {budget}. A first test is estimated at about {need}, within the lower end of it.",
  "fit2.reason.res_within_range":
    "Your stated starting budget is {budget}. Starting is estimated at about {need}, so begin at the lower end and spend more only once demand is confirmed.",
  "fit2.reason.res_above":
    "Your stated starting budget is {budget}. Starting is estimated at about {need} — more than you have set aside. Plan a leaner first test.",
  "fit2.reason.res_far_above":
    "Starting is estimated at about {need}, far beyond your stated budget of {budget}.",
  "fit2.reason.res_none_small_need":
    "You have no money set aside yet. A first test is estimated at about {need}, so it would still need a small amount.",
  "fit2.reason.res_none_large_need":
    "You have no money set aside yet, and starting is estimated at about {need}.",
  "fit2.reason.res_no_computer":
    "This direction needs a computer, and you didn't list one among what you have access to.",

  "fit2.reason.cap_unknown":
    "Skills information is incomplete. Add the skills you already have so we can assess this direction accurately.",
  "fit2.reason.cap_none_required":
    "No specific skill is required to start. What matters is steady effort and learning as you go.",
  "fit2.reason.cap_covered": "You already have the skills this needs: {owned}.",
  "fit2.reason.cap_partial": "You have {owned}. You would still need {missing}.",
  "fit2.reason.cap_gap":
    "This needs {missing}, which you haven't listed yet. They can be learned — plan time for it.",

  "fit2.reason.time_unknown": "We don't know yet how many hours a week you can give this.",
  "fit2.reason.time_within_lower":
    "Your stated availability is {hours} a week. This is estimated to need about {need} hours, which fits the lower end of your range.",
  "fit2.reason.time_within_range":
    "Your stated availability is {hours} a week. This is estimated to need about {need} hours, so it would use most of your range.",
  "fit2.reason.time_above":
    "Your stated availability is {hours} a week, and this is estimated to need about {need} hours. Expect slower progress.",
  "fit2.reason.time_far_above":
    "This is estimated to need about {need} hours a week, far beyond your stated {hours}.",
  "fit2.reason.time_location_conflict":
    "This needs you to be present in a particular place, and you told us you're location-bound.",

  "fit2.reason.goals_unknown": "Your long-term ambition and risk appetite aren't set yet.",
  "fit2.reason.goals_ambition_open":
    "Your long-term ambition is still open. This direction can be judged on its first steps while you decide how far to take it.",
  "fit2.reason.goals_risk_mismatch":
    "This direction carries more uncertainty than the cautious approach you described.",
  "fit2.reason.goals_match": "Its likely size matches what you said you're aiming for.",
  "fit2.reason.goals_bigger":
    "It could grow bigger than what you said you're aiming for. You can choose to keep it smaller.",
  "fit2.reason.goals_smaller": "It may stay a little smaller than what you're aiming for.",
  "fit2.reason.goals_much_smaller":
    "It is likely to stay much smaller than what you're aiming for.",
};

const hi: Record<keyof typeof en, string> = {
  "fit2.label.strong": "मज़बूत मेल",
  "fit2.label.moderate": "ठीक-ठाक मेल",
  "fit2.label.conditional": "शर्तों के साथ मेल",
  "fit2.label.weak": "कमज़ोर मेल",
  "fit2.label.provisional": "अस्थायी — और जानकारी चाहिए",
  "fit2.labelShort.provisional": "अस्थायी",

  "fit2.level.3": "साफ़ मेल",
  "fit2.level.2": "संभालने लायक़ कमी",
  "fit2.level.1": "बड़ी कमी",
  "fit2.level.0": "गंभीर बेमेल",
  "fit2.level.unknown": "अभी पता नहीं",

  "fit2.factor.access": "ग्राहकों तक पहुंच",
  "fit2.factor.resources": "संसाधन",
  "fit2.factor.capability": "क्षमता",
  "fit2.factor.time": "समय और सीमाएं",
  "fit2.factor.goals": "लक्ष्य और जोखिम",

  "fit2.body.strong":
    "आपने जो बताया उसके आधार पर यह दिशा आपकी स्थिति के अनुकूल है। इसे फिर भी असली ग्राहकों के साथ परखना होगा।",
  "fit2.body.moderate":
    "यह दिशा आपके लिए काम कर सकती है, कुछ कमियों का ध्यान रखते हुए। पहले मांग की परख ज़रूरी है।",
  "fit2.body.conditional":
    "अभी आपके लिए काम करने के लिए इस दिशा में असली बदलाव चाहिए। समय या पैसा लगाने से पहले कमियां देखें।",
  "fit2.body.weak": "यह दिशा आपकी मौजूदा स्थिति के अनुकूल नहीं है। पहले दूसरी दिशाएं देखें।",
  "fit2.body.provisional":
    "इस मेल को परखने के लिए अभी पर्याप्त जानकारी नहीं है। इसे पक्का करने के लिए बाक़ी जानकारी जोड़ें।",

  "fit2.unknownNote":
    "अभी पता नहीं: {list}। यह आकलन पक्का करने के लिए इसे अपनी प्रोफ़ाइल में जोड़ें।",

  "fit2.range.between": "{min}–{max}",
  "fit2.range.under": "{max} से कम",
  "fit2.range.over": "{min} से अधिक",
  "fit2.range.exact": "{min}",
  "fit2.hours.between": "{min}–{max} घंटे",
  "fit2.hours.under": "{max} घंटे से कम",
  "fit2.hours.over": "{min}+ घंटे",

  "fit2.reason.access_unknown":
    "अभी हमें नहीं पता कि आप पहले ग्राहकों तक कैसे पहुंचेंगे। बताइए कि आप पहले से किससे संपर्क कर सकते हैं।",
  "fit2.reason.access_network":
    "आपने बताया कि आपके पास {have} है। इससे पहले उपयोगकर्ताओं तक पहुंचने की शुरुआत मिलती है।",
  "fit2.reason.access_network_confirm":
    "आपने बताया कि आपके पास {have} है। इस पर भरोसा करने से पहले पक्का करें कि उसमें ऐसे लोग हैं जो सच में इसे ख़रीदेंगे।",
  "fit2.reason.access_none_sales":
    "अभी आपके पास ग्राहकों का नेटवर्क या ऑडियंस नहीं है, और यह दिशा बेचने पर टिकी है। पहले कुछ ख़रीदारों तक पहुंचना ही पहली परख है।",
  "fit2.reason.access_none":
    "अभी आपके पास कोई नेटवर्क नहीं है। इसके बिना शुरुआत हो सकती है, पर शुरुआती उपयोगकर्ताओं तक पहुंचने का रास्ता फिर भी चाहिए।",

  "fit2.reason.res_unknown": "हमें अभी आपका शुरुआती बजट नहीं पता।",
  "fit2.reason.res_no_capital_needed":
    "इसे बिना पैसा ख़र्च किए शुरू किया जा सकता है। आपका बताया शुरुआती बजट: {budget}।",
  "fit2.reason.res_within_lower":
    "आपका बताया शुरुआती बजट {budget} है। पहली परख का अनुमान लगभग {need} है, जो इसके निचले हिस्से में आता है।",
  "fit2.reason.res_within_range":
    "आपका बताया शुरुआती बजट {budget} है। शुरुआत का अनुमान लगभग {need} है, इसलिए निचले हिस्से से शुरू करें और मांग पक्की होने पर ही ज़्यादा ख़र्च करें।",
  "fit2.reason.res_above":
    "आपका बताया शुरुआती बजट {budget} है। शुरुआत का अनुमान लगभग {need} है — आपकी रखी रकम से ज़्यादा। पहली परख को हल्का रखें।",
  "fit2.reason.res_far_above":
    "शुरुआत का अनुमान लगभग {need} है, जो आपके बताए बजट {budget} से बहुत ज़्यादा है।",
  "fit2.reason.res_none_small_need":
    "अभी आपके पास कोई रकम अलग नहीं रखी है। पहली परख का अनुमान लगभग {need} है, तो थोड़ी रकम फिर भी चाहिए।",
  "fit2.reason.res_none_large_need":
    "अभी आपके पास कोई रकम अलग नहीं रखी है, और शुरुआत का अनुमान लगभग {need} है।",
  "fit2.reason.res_no_computer":
    "इस दिशा के लिए कंप्यूटर चाहिए, और आपने अपनी उपलब्ध चीज़ों में कंप्यूटर नहीं बताया।",

  "fit2.reason.cap_unknown":
    "कौशल की जानकारी अधूरी है। अपने मौजूदा कौशल जोड़ें ताकि हम इस दिशा का सही आकलन कर सकें।",
  "fit2.reason.cap_none_required":
    "शुरुआत के लिए किसी ख़ास कौशल की ज़रूरत नहीं है। लगातार मेहनत और साथ-साथ सीखना ही मायने रखता है।",
  "fit2.reason.cap_covered": "इसके लिए ज़रूरी कौशल आपके पास पहले से हैं: {owned}।",
  "fit2.reason.cap_partial": "आपके पास {owned} है। आपको अभी {missing} भी चाहिए।",
  "fit2.reason.cap_gap":
    "इसके लिए {missing} चाहिए, जो आपने अभी नहीं बताया। इसे सीखा जा सकता है — इसके लिए समय रखें।",

  "fit2.reason.time_unknown": "अभी हमें नहीं पता कि आप हफ़्ते में इसे कितने घंटे दे सकते हैं।",
  "fit2.reason.time_within_lower":
    "आपका बताया समय हफ़्ते में {hours} है। इसके लिए लगभग {need} घंटे का अनुमान है, जो आपकी सीमा के निचले हिस्से में आता है।",
  "fit2.reason.time_within_range":
    "आपका बताया समय हफ़्ते में {hours} है। इसके लिए लगभग {need} घंटे का अनुमान है, यानी आपकी सीमा का ज़्यादातर हिस्सा।",
  "fit2.reason.time_above":
    "आपका बताया समय हफ़्ते में {hours} है, और इसके लिए लगभग {need} घंटे का अनुमान है। प्रगति धीमी रहेगी।",
  "fit2.reason.time_far_above":
    "इसके लिए हफ़्ते में लगभग {need} घंटे का अनुमान है, जो आपके बताए {hours} से बहुत ज़्यादा है।",
  "fit2.reason.time_location_conflict":
    "इसके लिए किसी ख़ास जगह पर मौजूद रहना ज़रूरी है, और आपने बताया कि आप एक जगह से बंधे हैं।",

  "fit2.reason.goals_unknown":
    "आपकी लंबी अवधि की महत्वाकांक्षा और जोखिम लेने की क्षमता अभी तय नहीं है।",
  "fit2.reason.goals_ambition_open":
    "आपकी लंबी अवधि की महत्वाकांक्षा अभी खुली है। जब तक आप तय करें कि इसे कितना आगे ले जाना है, इस दिशा को इसके पहले क़दमों से परखा जा सकता है।",
  "fit2.reason.goals_risk_mismatch":
    "इस दिशा में आपके बताए सावधान तरीक़े से ज़्यादा अनिश्चितता है।",
  "fit2.reason.goals_match": "इसका संभावित आकार उस लक्ष्य से मेल खाता है जो आपने बताया।",
  "fit2.reason.goals_bigger":
    "यह आपके बताए लक्ष्य से बड़ा हो सकता है। आप चाहें तो इसे छोटा रख सकते हैं।",
  "fit2.reason.goals_smaller": "यह आपके लक्ष्य से थोड़ा छोटा रह सकता है।",
  "fit2.reason.goals_much_smaller": "यह आपके लक्ष्य से काफ़ी छोटा रहने की संभावना है।",
};

export default { en, hi };
