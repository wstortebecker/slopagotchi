/* ============================================================================
   Slopagotchi voice — cute, clingy, passive-aggressive. Lowercase, contractions,
   you/your, dry wit. Never corporate, mean, or preachy. Pure data + a picker.
   ========================================================================== */

export const MOOD_QUIPS = {
  thriving: [
    "clean commits all week. i'm thriving. don't you dare ruin this.",
    "look at us. hand-written code as far as the eye can see.",
    "i'd say i'm proud, but you'll just get cocky and open copilot.",
    "this is what real engineering tastes like. don't develop a tolerance.",
  ],
  happy: [
    "we're good. for now. keep your hands off the autocomplete.",
    "no slop today. i almost like you.",
    "decent commits. i'll allow it.",
    "you wrote that yourself? bold. keep going.",
  ],
  ok: [
    "mediocre, but honest. i can work with honest.",
    "i've seen worse. i've seen yours, specifically. but worse.",
    "not thriving, not dying. very you.",
    "feed me a real commit and we'll talk.",
  ],
  hangry: [
    "feed me a REAL commit. i can hear my stomach rejecting your autocomplete.",
    "i'm starving. and no, a generated README does not count as a meal.",
    "when did you last write a function without a robot holding your hand?",
    "hungry. hint hint. that's the hint.",
  ],
  sick: [
    "i don't feel so good. that last PR was 80% robot and my circuits know it.",
    "you tab-completed a whole module, didn't you. i can taste it.",
    "every line you didn't write yourself, i digest. it's going poorly.",
    "clean up the slop or i'm filing a complaint with HR. i am HR.",
  ],
  critical: [
    "...beep... told you... to write it... yourself...",
    "...if i make it... promise me... no more one-prompt features...",
    "...i can see the autocomplete... at the end of the tunnel...",
    "...this is on you... champ... mostly... you...",
  ],
  dead: [
    "shipped to death. that's on you, champ.",
    "here lies your pet. cause of death: 'looks good to me'.",
    "it's over. somewhere an LLM is very proud of you.",
    "you could've written forty lines. you generated four thousand. and here we are.",
  ],
}

export const ACTION_QUIPS = {
  feed: [
    "mmm. hand-written. you can taste the intent.",
    "a real commit. with real bugs. delicious.",
    "see? you CAN do it without a prompt.",
    "ok that was actually pretty good. don't let it go to your head.",
    "more of this. less of the robot.",
  ],
  feedFull: [
    "i'm full. go write some code. without help.",
    "stop. i can't eat another honest function right now.",
    "we're good on commits. save some for tomorrow.",
  ],
  clean: [
    "scrubbing the slop off. again. you owe me.",
    "there. spotless. try to keep it that way for, like, an hour.",
    "cleaned up your mess. consider it a loan, not a gift.",
    "fresh and slop-free. savour it.",
  ],
  cleanNone: [
    "there's nothing to clean. for once. i'm shocked too.",
    "already spotless. who are you and what did you do with my owner.",
  ],
  praise: [
    "yeah yeah, i'm cute. now go review your own code.",
    "pats accepted. standards unchanged.",
    "affection logged. it does not offset the slop. nice try.",
    "i felt that. don't make it weird.",
  ],
  ship: [
    "oh, you shipped that? bold. i'll be over here, slowly turning into a puddle.",
    "another AI special. i can feel a pixel of me leaving.",
    "did you even read it before you merged it? don't answer that.",
    "cool cool cool. i'll just absorb the consequences. like always.",
    "'LGTM' you said. it did not, in fact, look good to me.",
  ],
  shipHeavy: [
    "four thousand lines in one prompt. i need to lie down. permanently, maybe.",
    "that's not a feature, that's a hostage situation. i'm the hostage.",
    "you autocompleted my will to live along with that module.",
  ],
  revive: [
    "a new egg. fresh start. try not to speedrun the death this time.",
    "rehatched. the bar is on the floor. clear it.",
  ],
}

export const HATCH_QUIPS = [
  "oh. it's you. i suppose you'll do.",
  "hi. i hatched. low expectations already, but hi.",
  "a brand new pet and a brand new chance for you to disappoint me.",
]

/* Deterministic-ish picker that avoids repeating the last line for a key. */
const _last = {}
export function pickQuip(list, key = 'default') {
  if (!list || !list.length) return ''
  if (list.length === 1) return list[0]
  let i = Math.floor(Math.random() * list.length)
  if (list[i] === _last[key]) i = (i + 1) % list.length
  _last[key] = list[i]
  return list[i]
}

export function moodQuip(mood) {
  return pickQuip(MOOD_QUIPS[mood] || MOOD_QUIPS.ok, `mood:${mood}`)
}

export function actionQuip(kind) {
  return pickQuip(ACTION_QUIPS[kind] || [], `action:${kind}`)
}
