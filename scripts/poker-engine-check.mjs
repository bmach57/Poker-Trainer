const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const RANKS = [
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "T", value: 10 },
  { rank: "J", value: 11 },
  { rank: "Q", value: 12 },
  { rank: "K", value: 13 },
  { rank: "A", value: 14 }
];

function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map(({ rank, value }) => ({ suit, rank, value })));
}

function shuffle(deck) {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function straightHigh(values) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let i = 0; i <= unique.length - 5; i += 1) {
    const slice = unique.slice(i, i + 5);
    if (slice[0] - slice[4] === 4 && new Set(slice).size === 5) return slice[0] === 1 ? 5 : slice[0];
  }
  return 0;
}

function evaluateHand(cards) {
  const values = cards.map((c) => c.value).sort((a, b) => b - a);
  const counts = values.reduce((acc, value) => ({ ...acc, [value]: (acc[value] || 0) + 1 }), {});
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const suits = cards.reduce((acc, card) => {
    acc[card.suit] = [...(acc[card.suit] || []), card.value];
    return acc;
  }, {});
  const flushValues = Object.values(suits).find((list) => list.length >= 5)?.sort((a, b) => b - a);
  const straight = straightHigh(values);
  const straightFlush = flushValues ? straightHigh(flushValues) : 0;

  if (straightFlush) return { rank: 8, name: straightFlush === 14 ? "Royal Flush" : "Straight Flush", tiebreak: [straightFlush] };
  if (groups[0]?.count === 4) return { rank: 7, name: "Four of a Kind", tiebreak: [groups[0].value, ...values.filter((v) => v !== groups[0].value).slice(0, 1)] };
  const trips = groups.filter((g) => g.count === 3);
  const pairs = groups.filter((g) => g.count === 2);
  if (trips.length && (pairs.length || trips.length > 1)) return { rank: 6, name: "Full House", tiebreak: [trips[0].value, trips[1]?.value || pairs[0].value] };
  if (flushValues) return { rank: 5, name: "Flush", tiebreak: flushValues.slice(0, 5) };
  if (straight) return { rank: 4, name: "Straight", tiebreak: [straight] };
  if (trips.length) return { rank: 3, name: "Three of a Kind", tiebreak: [trips[0].value, ...values.filter((v) => v !== trips[0].value).slice(0, 2)] };
  if (pairs.length >= 2) return { rank: 2, name: "Two Pair", tiebreak: [pairs[0].value, pairs[1].value, values.find((v) => v !== pairs[0].value && v !== pairs[1].value)] };
  if (pairs.length === 1) return { rank: 1, name: "One Pair", tiebreak: [pairs[0].value, ...values.filter((v) => v !== pairs[0].value).slice(0, 3)] };
  return { rank: 0, name: "High Card", tiebreak: values.slice(0, 5) };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i += 1) {
    if ((a.tiebreak[i] || 0) !== (b.tiebreak[i] || 0)) return (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
  }
  return 0;
}

const deck = shuffle(createDeck());
const players = ["You", "Mara", "Vik", "Sol"].map((name) => ({ name, cards: [deck.pop(), deck.pop()] }));
const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
const results = players.map((player) => ({ player, hand: evaluateHand([...player.cards, ...board]) }));
const best = results.reduce((top, result) => (compareHands(result.hand, top.hand) > 0 ? result : top), results[0]);
const winners = results.filter((result) => compareHands(result.hand, best.hand) === 0);

if (new Set([...players.flatMap((p) => p.cards), ...board].map((c) => `${c.rank}-${c.suit}`)).size !== 13) {
  throw new Error("Duplicate card detected");
}

console.log(`Simulated one full locked-deck hand through showdown.`);
console.log(`Board: ${board.map((c) => c.rank + c.suit[0]).join(" ")}`);
console.log(`Winner: ${winners.map((w) => w.player.name).join(", ")} with ${best.hand.name}`);
