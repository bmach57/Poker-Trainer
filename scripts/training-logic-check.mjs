const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ranks = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
const suitMap = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };
const card = (code) => ({ rank: code[0].toUpperCase(), value: ranks[code[0].toUpperCase()], suit: suitMap[code[1].toLowerCase()] });

function holeInfo(hole) {
  const [high, low] = [...hole].sort((a, b) => b.value - a.value);
  const gap = Math.abs(high.value - low.value);
  return { high, low, pair: high.value === low.value, suited: high.suit === low.suit, gap, ace: high.value === 14, broadway: high.value >= 10 && low.value >= 10, connector: gap === 1, oneGapper: gap === 2, smallPair: high.value === low.value && high.value <= 6 };
}

function preflopCategory(hole) {
  const info = holeInfo(hole);
  if ((info.pair && info.high.value >= 11) || (info.ace && info.low.value >= 12)) return "premium";
  if ((info.pair && info.high.value >= 7) || info.broadway || (info.ace && info.low.value >= 10)) return "strong";
  if (info.smallPair || (info.ace && info.suited) || (info.suited && info.connector && info.high.value >= 7) || (info.suited && info.oneGapper && info.high.value >= 8)) return "playable";
  if ((info.ace && info.low.value >= 7) || (info.connector && info.high.value >= 8) || (info.suited && info.high.value >= 8)) return "speculative";
  return "trash";
}

function straightThreatWindows(board) {
  const boardValues = [...new Set(board.map((c) => (c.value === 14 ? 1 : c.value)).concat(board.some((c) => c.value === 14) ? [14] : []))];
  const made = [];
  const draws = [];
  for (let start = 1; start <= 10; start += 1) {
    const run = [start, start + 1, start + 2, start + 3, start + 4];
    const present = run.filter((value) => boardValues.includes(value));
    const missing = run.filter((value) => !boardValues.includes(value));
    if (present.length >= 3 && missing.length === 1) made.push(missing.join("-"));
    if (present.length >= 3 && missing.length === 2) draws.push(missing.join("-"));
  }
  return { made, draws };
}

function flushThreat(board) {
  return ["spades", "hearts", "diamonds", "clubs"].some((suit) => board.filter((c) => c.suit === suit).length >= 2);
}

assert(preflopCategory([card("2s"), card("2d")]) === "playable", "Small pairs should be playable preflop.");
assert(preflopCategory([card("8s"), card("6s")]) === "playable", "Suited one-gappers like 86s should be playable/speculative.");
assert(preflopCategory([card("Kc"), card("3d")]) === "trash", "Weak offsuit K3 should not be treated as a good call.");
assert(preflopCategory([card("Kc"), card("3c")]) === "speculative", "Weak suited K3 should be speculative, not a pure value hand.");
assert(flushThreat([card("7d"), card("8d"), card("8h")]), "Two diamonds on flop should flag flush-draw threat.");
assert(straightThreatWindows([card("3h"), card("4c"), card("7d"), card("9s"), card("Jh")]).draws.length > 0, "Connected boards should detect straight draw threats.");

console.log("Training logic checks passed.");
