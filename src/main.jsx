import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app">
          <section className="crash-card">
            <h1>Table needs a reset</h1>
            <p>{this.state.error.message}</p>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                window.location.reload();
              }}
            >
              Reset Saved Progress
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_SYMBOLS = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
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
const POSITIONS = ["Dealer", "Small Blind", "Big Blind", "Cutoff"];
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_STACK = 2000;
const STORAGE_KEY = "holdem-casino-stats-v1";
const TODAY_KEY = new Date().toISOString().slice(0, 10);

const AI_PROFILES = [
  { name: "Mara", style: "Tight Reg", aggression: 0.34, bluff: 0.025, looseness: 0.14, tell: "Opens narrow, respects pressure, value-heavy raises." },
  { name: "Vik", style: "Aggro Reg", aggression: 0.62, bluff: 0.075, looseness: 0.26, tell: "Attacks capped ranges and applies position pressure." },
  { name: "Sol", style: "Loose Caller", aggression: 0.42, bluff: 0.035, looseness: 0.34, tell: "Defends wider, calls draws, under-bluffs river." }
];

const TRAINING_MODES = {
  play: { name: "Play", detail: "Normal hands with light guidance." },
  training: { name: "Training", detail: "Show coach math and decision reasons." },
  review: { name: "Review", detail: "Focus on post-hand replay and leaks." },
  drill: { name: "Drill", detail: "Practice a focused poker spot." }
};

const DIFFICULTIES = {
  beginner: { name: "Beginner", aiTightness: -0.08, aiAggression: -0.08, coachDetail: "full", note: "More forgiving AI and fuller coaching." },
  intermediate: { name: "Intermediate", aiTightness: 0, aiAggression: 0, coachDetail: "standard", note: "Balanced, realistic play." },
  advanced: { name: "Advanced", aiTightness: 0.08, aiAggression: 0.07, coachDetail: "compact", note: "Tighter ranges and less hand-holding." },
  trainer: { name: "Trainer", aiTightness: 0.03, aiAggression: 0.02, coachDetail: "full", note: "Full equity, EV, range, and leak context." }
};

const DRILLS = [
  { id: "none", name: "No Drill", focus: "Standard mixed hands.", filter: () => true },
  { id: "small_pairs", name: "Small Pairs", focus: "Set mining, implied odds, and folding to bad prices.", filter: (cards) => holeInfo(cards).smallPair },
  { id: "suited_connectors", name: "Suited Connectors", focus: "Draw equity, semi-bluffs, and position.", filter: (cards) => holeInfo(cards).suited && holeInfo(cards).connector },
  { id: "broadways", name: "Broadways", focus: "Top pair value and domination risk.", filter: (cards) => holeInfo(cards).broadway },
  { id: "blind_defense", name: "Blind Defense", focus: "Defending price, position disadvantage, and pot odds.", filter: () => true }
];

const SCENARIOS = [
  { id: "none", name: "Random Hand", focus: "Normal shuffled hand." },
  { id: "small_pair", name: "Small Pair Preflop", focus: "Practice set mining and raise defense.", hero: ["2s", "2d"] },
  { id: "suited_connector", name: "Suited Connector", focus: "Practice equity realization and semi-bluffs.", hero: ["8s", "7s"] },
  { id: "top_pair", name: "Top Pair Spot", focus: "Practice value and kicker awareness.", hero: ["As", "Qd"], board: ["Ah", "7c", "3d"] },
  { id: "flush_draw", name: "Flush Draw", focus: "Practice pot odds and semi-bluffing.", hero: ["As", "Ts"], board: ["2s", "7s", "Kd"] },
  { id: "danger_two_pair", name: "Two Pair Danger", focus: "Practice vulnerable value hands on straight boards.", hero: ["Jc", "9c"], board: ["9h", "9d", "Qc", "Kc"] },
  { id: "river_bluffcatch", name: "River Bluff Catch", focus: "Practice river calls versus polarized bets.", hero: ["Ac", "Td"], board: ["Ah", "8d", "4s", "7c", "Kc"] }
];

const ACHIEVEMENTS = [
  { id: "first_win", name: "First Stack", description: "Win your first hand.", test: (s) => s.handsWon >= 1 },
  { id: "ten_hands", name: "Table Regular", description: "Play 10 hands.", test: (s) => s.handsPlayed >= 10 },
  { id: "study_five", name: "Hand Reviewer", description: "Complete 5 post-hand reviews.", test: (s) => s.reviewsCompleted >= 5 },
  { id: "profit_500", name: "Green Session", description: "Reach $500 total profit.", test: (s) => s.totalProfit >= 500 },
  { id: "big_pot", name: "Pot Builder", description: "Win a pot of $800 or more.", test: (s) => s.biggestPotWon >= 800 },
  { id: "showdown_sharp", name: "Showdown Sharp", description: "Win 60% of showdowns after 10 showdowns.", test: (s) => s.showdowns >= 10 && s.showdownWins / s.showdowns >= 0.6 }
];

const defaultStats = {
  sessionsPlayed: 0,
  handsPlayed: 0,
  totalProfit: 0,
  bankroll: 5000,
  wins: 0,
  handsWon: 0,
  vpipHands: 0,
  pfrHands: 0,
  showdowns: 0,
  showdownWins: 0,
  biggestPotWon: 0,
  sessionSecondsTotal: 0,
  xp: 0,
  level: 1,
  reviewsCompleted: 0,
  disciplinedFolds: 0,
  thinCalls: 0,
  strongValueBets: 0,
  daily: { date: TODAY_KEY, hands: 0, reviews: 0, xp: 0 },
  achievements: [],
  recentReviews: [],
  leakCounts: {}
};

function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map(({ rank, value }) => ({ suit, rank, value, id: `${rank}${suit[0]}` })));
}

function shuffle(deck) {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function cardText(card) {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

function safeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `hand-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseCard(code) {
  const rank = code[0].toUpperCase();
  const suitCode = code[1].toLowerCase();
  const suit = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" }[suitCode];
  const found = RANKS.find((item) => item.rank === rank);
  return { suit, rank: found.rank, value: found.value, id: `${found.rank}${suit[0]}` };
}

function stackDeckForScenario(scenario) {
  const forced = [...(scenario.board || []), ...(scenario.hero || [])].map(parseCard);
  const forcedIds = new Set(forced.map((card) => card.id));
  return shuffle(createDeck().filter((card) => !forcedIds.has(card.id)));
}

function heroHandLabel(hero, board) {
  if (!hero?.cards?.length) return "Waiting for cards";
  if (!board?.length) return readableCategory(preflopCategory(hero.cards));
  const hand = bestHand([...hero.cards, ...board]);
  const draw = drawProfile(hero.cards, board);
  const drawText = board.length < 5 && draw.outs > 0 && hand.rank < 4 ? ` · ${draw.labels[0]}` : "";
  return `${hand.name}${drawText}`;
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
  if (groups[0]?.count === 4) {
    return { rank: 7, name: "Four of a Kind", tiebreak: [groups[0].value, ...values.filter((v) => v !== groups[0].value).slice(0, 1)] };
  }
  const trips = groups.filter((g) => g.count === 3);
  const pairs = groups.filter((g) => g.count === 2);
  if (trips.length && (pairs.length || trips.length > 1)) {
    return { rank: 6, name: "Full House", tiebreak: [trips[0].value, trips[1]?.value || pairs[0].value] };
  }
  if (flushValues) return { rank: 5, name: "Flush", tiebreak: flushValues.slice(0, 5) };
  if (straight) return { rank: 4, name: "Straight", tiebreak: [straight] };
  if (trips.length) {
    return { rank: 3, name: "Three of a Kind", tiebreak: [trips[0].value, ...values.filter((v) => v !== trips[0].value).slice(0, 2)] };
  }
  if (pairs.length >= 2) {
    const kickers = values.filter((v) => v !== pairs[0].value && v !== pairs[1].value);
    return { rank: 2, name: "Two Pair", tiebreak: [pairs[0].value, pairs[1].value, kickers[0]] };
  }
  if (pairs.length === 1) {
    return { rank: 1, name: "One Pair", tiebreak: [pairs[0].value, ...values.filter((v) => v !== pairs[0].value).slice(0, 3)] };
  }
  return { rank: 0, name: "High Card", tiebreak: values.slice(0, 5) };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  const length = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < length; i += 1) {
    if ((a.tiebreak[i] || 0) !== (b.tiebreak[i] || 0)) return (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
  }
  return 0;
}

function bestHand(cards) {
  return evaluateHand(cards);
}

function countOuts(hole, board) {
  const cards = [...hole, ...board];
  const suits = cards.reduce((acc, c) => ({ ...acc, [c.suit]: (acc[c.suit] || 0) + 1 }), {});
  const flushOuts = Math.max(0, ...Object.values(suits).map((count) => (count === 4 ? 9 : count === 3 ? 4 : 0)));
  const values = [...new Set(cards.map((c) => c.value))];
  if (values.includes(14)) values.push(1);
  let straightOuts = 0;
  for (let start = 1; start <= 10; start += 1) {
    const run = [start, start + 1, start + 2, start + 3, start + 4];
    const made = run.filter((v) => values.includes(v)).length;
    if (made === 4) straightOuts += 4;
    if (made === 3) straightOuts += 2;
  }
  return Math.min(15, flushOuts + straightOuts);
}

function preflopScore(hole) {
  const [a, b] = [...hole].sort((x, y) => y.value - x.value);
  let score = 0.08 + (a.value + b.value - 4) / 44;
  if (a.value === b.value) score += 0.28 + a.value / 55;
  if (a.suit === b.suit) score += 0.055;
  const gap = Math.abs(a.value - b.value);
  if (gap === 1) score += 0.045;
  if (gap === 2) score += 0.02;
  if (gap > 3) score -= 0.07;
  if (gap > 6) score -= 0.06;
  if (a.value >= 13 && b.value >= 10) score += 0.1;
  if (a.value === 14 && b.value >= 10) score += 0.08;
  return Math.max(0, Math.min(1, score));
}

function holeInfo(hole) {
  const [high, low] = [...hole].sort((a, b) => b.value - a.value);
  const gap = Math.abs(high.value - low.value);
  return {
    high,
    low,
    pair: high.value === low.value,
    suited: high.suit === low.suit,
    gap,
    ace: high.value === 14,
    broadway: high.value >= 10 && low.value >= 10,
    connector: gap === 1,
    oneGapper: gap === 2,
    smallPair: high.value === low.value && high.value <= 6,
    mediumPair: high.value === low.value && high.value >= 7 && high.value <= 10,
    premiumPair: high.value === low.value && high.value >= 11
  };
}

function preflopCategory(hole) {
  const info = holeInfo(hole);
  if (info.premiumPair || (info.ace && info.low.value >= 12) || (info.high.value === 13 && info.low.value >= 12 && info.suited)) return "premium";
  if (info.mediumPair || info.broadway || (info.ace && info.low.value >= 10) || (info.suited && info.high.value >= 12 && info.low.value >= 9)) return "strong";
  if (info.smallPair || (info.ace && info.suited) || (info.suited && info.connector && info.high.value >= 7) || (info.suited && info.oneGapper && info.high.value >= 8)) return "playable";
  if ((info.ace && info.low.value >= 7) || (info.connector && info.high.value >= 8) || (info.suited && info.high.value >= 8)) return "speculative";
  return "trash";
}

function readableCategory(category) {
  return {
    premium: "Premium starter",
    strong: "Strong starter",
    playable: "Playable starter",
    speculative: "Speculative starter",
    trash: "Weak starter"
  }[category] || "Unknown starter";
}

function postflopScore(hole, board) {
  const made = bestHand([...hole, ...board]);
  const madeScore = [0.08, 0.28, 0.48, 0.64, 0.76, 0.84, 0.9, 0.97, 1][made.rank];
  const drawScore = Math.min(0.2, countOuts(hole, board) * 0.015);
  const highCardPressure = made.rank === 0 && Math.max(...hole.map((c) => c.value)) >= 13 ? 0.025 : 0;
  return Math.max(0, Math.min(1, madeScore + drawScore + highCardPressure));
}

function remainingDeck(knownCards) {
  const known = new Set(knownCards.map((card) => card.id));
  return createDeck().filter((card) => !known.has(card.id));
}

function drawProfile(hole, board) {
  if (board.length >= 5) return { outs: 0, labels: ["no draws remain"] };
  const cards = [...hole, ...board];
  const outs = countOuts(hole, board);
  const suits = SUITS.map((suit) => cards.filter((card) => card.suit === suit).length);
  const flushDraw = Math.max(...suits) === 4;
  const backdoorFlush = Math.max(...suits) === 3 && board.length === 3;
  const values = [...new Set(cards.map((c) => c.value))];
  if (values.includes(14)) values.push(1);
  const openEnded = Array.from({ length: 10 }, (_, i) => i + 1).some((start) => {
    const run = [start, start + 1, start + 2, start + 3, start + 4];
    return run.filter((value) => values.includes(value)).length === 4 && values.includes(start + 1) && values.includes(start + 2) && values.includes(start + 3);
  });
  const gutshot = outs > 0 && !openEnded && !flushDraw;
  const labels = [];
  if (flushDraw) labels.push("flush draw");
  if (openEnded) labels.push("open-ended straight draw");
  if (gutshot) labels.push("gutshot or combo draw");
  if (backdoorFlush) labels.push("backdoor flush potential");
  if (!labels.length) labels.push("no major draw");
  return { outs, labels };
}

function postflopProfile(hole, board) {
  const hand = bestHand([...hole, ...board]);
  const draw = drawProfile(hole, board);
  const boardValues = board.map((card) => card.value);
  const holeValues = hole.map((card) => card.value);
  const topBoard = Math.max(...boardValues);
  const pairValue = hand.rank === 1 ? hand.tiebreak[0] : 0;
  const usesPocketPair = hole[0].value === hole[1].value && hand.rank >= 1;
  const topPair = hand.rank === 1 && pairValue === topBoard;
  const weakPair = hand.rank === 1 && pairValue < topBoard && !usesPocketPair;
  const underPair = usesPocketPair && hole[0].value < topBoard;
  const overPair = usesPocketPair && hole[0].value > topBoard;
  const hasOvercards = hand.rank === 0 && holeValues.some((value) => value > topBoard);
  return {
    hand,
    draw,
    topPair,
    weakPair,
    underPair,
    overPair,
    hasOvercards,
    showdownValue: hand.rank >= 2 || topPair || overPair,
    bluffCatcher: hand.rank === 1 && !weakPair && !underPair,
    air: hand.rank === 0 && draw.outs < 6
  };
}

function sampleCards(deck, count) {
  const cards = [...deck];
  const picked = [];
  for (let i = 0; i < count && cards.length; i += 1) {
    const index = Math.floor(Math.random() * cards.length);
    picked.push(cards.splice(index, 1)[0]);
  }
  return picked;
}

function opponentRangeWeight(player, hand) {
  const action = (player.lastAction || "").toLowerCase();
  const profile = player.profile || { aggression: 0.4, looseness: 0.2 };
  let weight = 0.5 + profile.looseness * 0.35 + profile.aggression * 0.12;
  if (action.includes("raises") || action.includes("bets") || action.includes("all in")) weight += 0.18 + profile.aggression * 0.14;
  if (action.includes("calls")) weight += 0.06;
  if (hand.phase === "preflop" && hand.preflopRaised && action.includes("waiting")) weight -= 0.06;
  return Math.max(0.18, Math.min(0.92, weight));
}

function aiPreflopDecision(player, current, callAmount, confidence, randomBluff, difficultySettings = DIFFICULTIES.intermediate) {
  const info = holeInfo(player.cards);
  const category = preflopCategory(player.cards);
  const profile = {
    ...player.profile,
    aggression: Math.max(0.15, player.profile.aggression + difficultySettings.aiAggression),
    looseness: Math.max(0.06, player.profile.looseness - difficultySettings.aiTightness)
  };
  const effectiveCall = callAmount / Math.max(BIG_BLIND, current.pot + callAmount);
  const cheapPrice = callAmount <= BIG_BLIND;
  const raisedPot = current.preflopRaised || current.currentBet > BIG_BLIND;
  const blindDiscount = player.bet > 0;
  const latePosition = current.toAct === current.dealer || current.toAct === (current.dealer + 3) % 4;
  const openSize = Math.min(player.stack + player.bet, BIG_BLIND * (latePosition ? 2.5 : 3));

  // AI preflop logic: use realistic range buckets and pot price rather than
  // pure hand-strength thresholds. Small pairs, suited connectors, broadways,
  // and blind-defense hands continue cheaply; raises are reserved for stronger
  // value hands plus a few suited/semi-bluff candidates by profile.
  if (callAmount === 0) {
    if (category === "premium" || (category === "strong" && Math.random() < 0.38 + profile.aggression * 0.28)) return { type: "bet", amount: openSize };
    return { type: "check" };
  }

  if (!raisedPot && cheapPrice) {
    if (category === "premium" || info.mediumPair || (category === "strong" && Math.random() < 0.35 + profile.aggression * 0.3)) {
      return { type: "raise", amount: Math.min(player.stack + player.bet, BIG_BLIND * (3 + Math.round(profile.aggression))) };
    }
    if (category !== "trash" || blindDiscount || randomBluff) return { type: "call" };
    if (profile.looseness > 0.22 && (info.suited || info.connector) && Math.random() < 0.35) return { type: "call" };
    return { type: "fold" };
  }

  if (raisedPot) {
    const bigRaise = callAmount >= BIG_BLIND * 4 || effectiveCall > 0.32;
    if (category === "premium") {
      if (Math.random() < 0.48 + profile.aggression * 0.32 && player.stack > callAmount + BIG_BLIND * 5) return { type: "raise", amount: Math.min(player.stack + player.bet, current.currentBet * 2.7) };
      return { type: "call" };
    }
    if (category === "strong" && !bigRaise) return { type: "call" };
    if ((info.smallPair || category === "playable") && callAmount <= BIG_BLIND * 3 && player.stack >= callAmount * 14) return { type: "call" };
    if (blindDiscount && callAmount <= BIG_BLIND * 2.5 && category !== "trash") return { type: "call" };
    if (randomBluff && category === "playable" && !bigRaise && Math.random() < profile.aggression * 0.25) return { type: "raise", amount: Math.min(player.stack + player.bet, current.currentBet * 2.4) };
    return { type: "fold" };
  }

  if (confidence > 0.7 || category === "strong") return { type: "call" };
  return { type: "fold" };
}

function estimateHeroEquity(hand, hero, samples = 420) {
  try {
    if (!hand || !hero?.cards?.length) return { equity: 0, wins: 0, ties: 0, samples: 0 };
    const opponents = (hand.players || []).filter((p) => p.id !== "hero" && !p.folded);
    if (!opponents.length) return { equity: 1, wins: samples, ties: 0, samples };
    const known = [...hero.cards, ...(hand.board || [])];
    let wins = 0;
    let ties = 0;

    for (let i = 0; i < samples; i += 1) {
      let deck = remainingDeck(known);
      const boardRunout = [...(hand.board || [])];
      const opponentHands = opponents.map((opponent) => {
        let chosen = sampleCards(deck, 2);
        let tries = 0;
        const minStrength = opponentRangeWeight(opponent, hand) * (/all in|raises/i.test(opponent.lastAction || "") && (hand.board || []).length ? 0.8 : 0.55);
        while (tries < 7 && chosen.length === 2 && rangeStrength(chosen, hand.board || []) < minStrength) {
          chosen = sampleCards(deck, 2);
          tries += 1;
        }
        const chosenIds = new Set(chosen.map((card) => card.id));
        deck = deck.filter((card) => !chosenIds.has(card.id));
        return chosen;
      }).filter((cards) => cards.length === 2);
      while (boardRunout.length < 5 && deck.length) {
        const next = sampleCards(deck, 1)[0];
        boardRunout.push(next);
        deck = deck.filter((card) => card.id !== next.id);
      }
      if (boardRunout.length < 5) continue;
      const heroBest = bestHand([...hero.cards, ...boardRunout]);
      const comparisons = opponentHands.map((cards) => compareHands(heroBest, bestHand([...cards, ...boardRunout])));
      if (comparisons.every((value) => value > 0)) wins += 1;
      else if (comparisons.some((value) => value === 0) && comparisons.every((value) => value >= 0)) ties += 1;
    }

    return { equity: (wins + ties * 0.5) / Math.max(1, samples), wins, ties, samples };
  } catch {
    return { equity: 0.5, wins: 0, ties: 0, samples: 0 };
  }
}

function rangeStrength(hole, board) {
  if (!board.length) return preflopScore(hole);
  const made = bestHand([...hole, ...board]);
  return Math.max(postflopScore(hole, board), [0.08, 0.28, 0.48, 0.64, 0.76, 0.84, 0.9, 0.97, 1][made.rank]);
}

function handTier(score) {
  if (score >= 0.82) return "Premium";
  if (score >= 0.66) return "Strong";
  if (score >= 0.48) return "Playable";
  if (score >= 0.32) return "Marginal";
  return "Weak";
}

function levelFromXp(xp) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 120)) + 1);
}

function nextLevelXp(level) {
  return level * level * 120;
}

function dailySnapshot(daily) {
  return daily?.date === TODAY_KEY ? daily : { date: TODAY_KEY, hands: 0, reviews: 0, xp: 0 };
}

function normalizeStats(stats) {
  const merged = { ...defaultStats, ...(stats || {}) };
  merged.daily = dailySnapshot(merged.daily);
  merged.achievements = Array.isArray(merged.achievements) ? merged.achievements : [];
  merged.recentReviews = Array.isArray(merged.recentReviews) ? merged.recentReviews : [];
  merged.leakCounts = merged.leakCounts && typeof merged.leakCounts === "object" ? merged.leakCounts : {};
  merged.xp = Number.isFinite(merged.xp) ? merged.xp : 0;
  merged.level = levelFromXp(merged.xp || 0);
  return merged;
}

function boardTextureLabel(board) {
  if (board.length < 3) return "No board yet";
  const score = textureScore(board);
  if (score >= 0.34) return "Very wet board";
  if (score >= 0.18) return "Draw-heavy board";
  if (score < 0) return "Paired board";
  return "Dry board";
}

function boardThreats(board) {
  if (!board?.length) return ["No board threats yet."];
  const threats = [];
  const suitCounts = SUITS.map((suit) => ({ suit, count: board.filter((card) => card.suit === suit).length })).sort((a, b) => b.count - a.count);
  const values = board.map((card) => card.value);
  const unique = [...new Set(values)];
  const paired = values.length !== new Set(values).size;
  const high = Math.max(...values);
  const connected = values.some((value) => values.includes(value + 1) && values.includes(value + 2));
  const straightThreats = straightThreatWindows(board);
  if (suitCounts[0].count >= 3) threats.push(`${SUIT_SYMBOLS[suitCounts[0].suit]} made flushes or strong flush draws are possible.`);
  else if (suitCounts[0].count === 2 && board.length === 3) threats.push(`${SUIT_SYMBOLS[suitCounts[0].suit]} flush draw is live on the flop.`);
  if (straightThreats.made.length) threats.push(`Straight possible: ${straightThreats.made.slice(0, 2).join(" or ")} completes it.`);
  else if (straightThreats.draws.length || connected || unique.length >= 3) threats.push("Straight draws are live; connected runouts can change the nuts.");
  if (paired) threats.push("Paired board means trips/full houses are in range.");
  if (high >= 13) threats.push("Broadway cards improve many calling ranges.");
  if (!threats.length) threats.push("Dry texture: fewer strong draws available.");
  return threats.slice(0, 3);
}

function boardWetness(board) {
  if (board.length < 3) return "preflop";
  const suitCounts = SUITS.map((suit) => board.filter((card) => card.suit === suit).length);
  const straightThreats = straightThreatWindows(board);
  const paired = board.map((card) => card.value).length !== new Set(board.map((card) => card.value)).size;
  const twoTone = Math.max(...suitCounts) === 2 && board.length === 3;
  const monotone = Math.max(...suitCounts) >= 3;
  if (monotone || straightThreats.made.length) return "very wet";
  if (twoTone || straightThreats.draws.length || paired) return "wet";
  return "dry";
}

function positionName(index, dealer) {
  return POSITIONS[(index - dealer + 4) % 4];
}

function villainPressure(hand) {
  const active = hand.players.filter((p) => p.id !== "hero" && !p.folded);
  const bettors = active.filter((p) => /(bets|raises|all in)/i.test(p.lastAction || ""));
  const callers = active.filter((p) => /calls/i.test(p.lastAction || ""));
  return {
    activeCount: active.length,
    bettors: bettors.length,
    callers: callers.length,
    allIn: active.some((p) => /all in/i.test(p.lastAction || "")),
    pressureNames: bettors.map((p) => p.name)
  };
}

function postflopRecommendationContext(hand, hero, callAmount, equityInfo) {
  const board = hand.board || [];
  const profile = postflopProfile(hero.cards, board);
  const texture = boardWetness(board);
  const pressure = villainPressure(hand);
  const pot = Math.max(BIG_BLIND, hand.pot);
  const required = callAmount > 0 ? callAmount / Math.max(1, hand.pot + callAmount) : 0;
  const mdf = callAmount > 0 ? hand.pot / Math.max(1, hand.pot + callAmount) : 1;
  const betSize = callAmount / Math.max(1, hand.pot);
  const rawEquity = equityInfo.equity;
  const nuttedBoard = boardThreats(board).some((threat) => /made flushes|Straight possible|full houses/i.test(threat));
  let riskPenalty = 0;
  if (pressure.bettors) riskPenalty += 0.05;
  if (pressure.allIn) riskPenalty += 0.1;
  if ((profile.weakPair || profile.underPair || profile.hand.rank <= 1) && (texture !== "dry" || nuttedBoard)) riskPenalty += 0.08;
  if (hand.phase === "river" && profile.draw.outs === 0 && profile.hand.rank <= 1) riskPenalty += 0.06;
  return {
    profile,
    texture,
    pressure,
    pot,
    required,
    mdf,
    betSize,
    rawEquity,
    equity: Math.max(0, rawEquity - riskPenalty),
    nuttedBoard
  };
}

function straightThreatWindows(board) {
  const boardValues = [...new Set(board.map((card) => (card.value === 14 ? 1 : card.value)).concat(board.some((card) => card.value === 14) ? [14] : []))];
  const made = [];
  const draws = [];
  for (let start = 1; start <= 10; start += 1) {
    const run = [start, start + 1, start + 2, start + 3, start + 4];
    const present = run.filter((value) => boardValues.includes(value));
    const missing = run.filter((value) => !boardValues.includes(value));
    if (present.length >= 3 && missing.length <= 2) {
      const label = missing.map(rankName).join("-");
      if (missing.length === 2) draws.push(label);
      if (missing.length === 1) made.push(label);
    }
  }
  return { made: [...new Set(made)], draws: [...new Set(draws)] };
}

function rankName(value) {
  const normalized = value === 1 ? 14 : value;
  return RANKS.find((rank) => rank.value === normalized)?.rank || String(value);
}

function opponentConcerns(hand) {
  if (!hand) return ["No opponent action yet."];
  const active = hand.players.filter((p) => p.id !== "hero" && !p.folded);
  const concerns = [];
  active.forEach((player) => {
    const action = (player.lastAction || "").toLowerCase();
    if (action.includes("raises") || action.includes("all in")) {
      concerns.push(`${player.name}: polarized strength. Expect made straights/sets/two pair, strong draws, or a rare bluff.`);
    } else if (action.includes("bets")) {
      concerns.push(`${player.name}: pressure range includes top pair, overpairs, draws, and some bluffs.`);
    } else if (action.includes("calls")) {
      concerns.push(`${player.name}: watch medium pairs, suited draws, straight draws, and slowplays.`);
    }
  });
  return concerns.length ? concerns.slice(0, 3) : ["No one has shown major strength yet."];
}

function coachTipForAction({ type, hand, player, callAmount, amount }) {
  if (!player) return null;
  const strength = hand.phase === "preflop" ? preflopScore(player.cards) : postflopScore(player.cards, hand.board);
  const tier = handTier(strength);
  const potOdds = callAmount > 0 ? callAmount / Math.max(1, hand.pot + callAmount) : 0;
  const pressure = callAmount / Math.max(1, player.stack + callAmount);
  let grade = "Solid";
  let leak = null;
  let note = `${tier} spot. Keep watching position and pot size.`;

  if (type === "fold") {
    if (strength < 0.36 && callAmount > 0) {
      grade = "Disciplined fold";
      note = "Good release. Weak holdings facing pressure are where bankrolls quietly leak.";
    } else if (strength > 0.68 && callAmount < hand.pot * 0.55) {
      grade = "Too tight";
      leak = "overfolding";
      note = "This hand was strong enough to continue against that size.";
    }
  }
  if (type === "call") {
    if (strength < potOdds + 0.18 && callAmount > 0) {
      grade = "Loose call";
      leak = "thin_calls";
      note = "The price was not attractive for this hand. Look for better odds or stronger draws.";
    } else {
      note = "Reasonable call. You had enough equity or showdown value for the price.";
    }
  }
  if (type === "bet" || type === "raise") {
    if (strength > 0.7) {
      grade = "Value pressure";
      note = "Good value/aggression. Strong hands should build pots and deny free cards.";
    } else if (strength < 0.38 && !hand.board.length) {
      grade = "Loose opener";
      leak = "loose_preflop";
      note = "This is a thin preflop attack. Pick stronger hands or better position.";
    } else if (strength < 0.42 && hand.board.length) {
      grade = "Risky bluff";
      leak = "low_equity_bluffs";
      note = "Bluffs work best with blockers, draws, or scary boards. This one is ambitious.";
    }
  }
  if (type === "allin") {
    if (strength < 0.82 && pressure < 0.75) {
      grade = "High variance";
      leak = "loose_allins";
      note = "Full-stack all-ins need premium strength or a powerful draw.";
    } else {
      note = "All-in pressure makes sense with this much equity or stack leverage.";
    }
  }

  return {
    street: phaseLabel(hand.phase),
    action: type,
    grade,
    leak,
    note,
    strength,
    tier,
    potOdds,
    amount: amount || callAmount || 0
  };
}

function buildHandReview(finalHand, heroDelta, heroWon) {
  const hero = finalHand.players[0];
  const heroHand = finalHand.board.length >= 3 ? bestHand([...hero.cards, ...finalHand.board]).name : handTier(preflopScore(hero.cards));
  const lastDecision = finalHand.heroDecisions?.[finalHand.heroDecisions.length - 1];
  const tips = [];
  const heroCards = hero.cards.map(cardText).join(" ");
  tips.push(`${heroCards} finished as ${heroHand}.`);
  tips.push(heroWon ? `You won ${formatMoney(Math.max(0, heroDelta))}. Good job converting the hand.` : `You lost ${formatMoney(Math.abs(heroDelta))}. Review the biggest decision, not just the result.`);
  if (lastDecision) tips.push(lastDecision.note);
  if (finalHand.heroVpip && !finalHand.heroPfr) tips.push("You voluntarily entered without raising. Track whether these calls are profitable over time.");
  if (!finalHand.heroVpip) tips.push("You stayed disciplined preflop. Folding weak starters is a real skill.");

  return {
    id: finalHand.id,
    result: heroWon ? "Win" : "Loss",
    profit: heroDelta,
    cards: heroCards,
    board: finalHand.board.map(cardText).join(" "),
    handName: heroHand,
    bestDecision: finalHand.heroDecisions?.find((d) => d.grade === "Disciplined fold" || d.grade === "Value pressure")?.grade || "Review complete",
    leak: finalHand.heroDecisions?.find((d) => d.leak)?.leak || null,
    tips: tips.slice(0, 3),
    replay: finalHand.replay || [],
    mode: finalHand.mode || "training",
    drill: finalHand.drill || "No Drill"
  };
}

function textureScore(board) {
  if (board.length < 3) return 0;
  const suited = Math.max(...SUITS.map((s) => board.filter((c) => c.suit === s).length));
  const values = board.map((c) => c.value);
  const paired = new Set(values).size < values.length;
  const connected = values.some((v) => values.includes(v + 1) && values.includes(v + 2));
  return (suited >= 3 ? 0.24 : 0) + (connected ? 0.18 : 0) + (paired ? -0.08 : 0);
}

function loadStats() {
  try {
    return normalizeStats(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
  } catch {
    return normalizeStats(defaultStats);
  }
}

function createPlayers(bankroll) {
  return [
    { id: "hero", name: "You", isHuman: true, stack: Math.max(1000, Math.min(STARTING_STACK, bankroll)), cards: [], bet: 0, invested: 0, folded: false, allIn: false, acted: false, reveal: false, lastAction: "Waiting" },
    ...AI_PROFILES.map((profile, index) => ({
      id: `ai-${index}`,
      name: profile.name,
      profile,
      isHuman: false,
      stack: STARTING_STACK,
      cards: [],
      bet: 0,
      invested: 0,
      folded: false,
      allIn: false,
      acted: false,
      reveal: false,
      lastAction: "Waiting"
    }))
  ];
}

function nextActiveIndex(players, start) {
  for (let i = 1; i <= players.length; i += 1) {
    const index = (start + i) % players.length;
    if (!players[index].folded && !players[index].allIn && players[index].stack > 0) return index;
  }
  return -1;
}

function streetStartIndex(dealer) {
  return nextActiveIndex([{ folded: false }, { folded: false }, { folded: false }, { folded: false }], dealer);
}

function allSettled(players, currentBet) {
  return players.filter((p) => !p.folded && !p.allIn).every((p) => p.acted && p.bet === currentBet);
}

function livePlayers(players) {
  return players.filter((p) => !p.folded);
}

function phaseLabel(phase) {
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

function formatMoney(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function pct(value, target) {
  return `${Math.max(0, Math.min(100, Math.round((value / target) * 100)))}%`;
}

function progressText(value, target) {
  return `${Math.min(value, target)} of ${target}`;
}

function leakLabel(key) {
  const labels = {
    overfolding: "Over-folding strong spots",
    thin_calls: "Calling too thin",
    loose_preflop: "Loose preflop opens",
    low_equity_bluffs: "Low-equity bluffs",
    loose_allins: "Loose all-ins"
  };
  return labels[key] || "No major leak";
}

function trainingPlan({ vpip, pfr, showdownWin, commonLeak }) {
  if (commonLeak) return `Focus drill: ${leakLabel(commonLeak)}. Play 10 hands where you pause before that decision.`;
  if (vpip > 40) return "Focus drill: tighten preflop. Fold more weak offsuit hands out of position.";
  if (vpip < 12 && pfr < 8) return "Focus drill: find more value opens. Premium hands should build pots.";
  if (pfr > vpip - 2 && vpip > 18) return "Focus drill: balance aggression with selective calls in good pot-odds spots.";
  if (showdownWin < 40) return "Focus drill: avoid paying off river bets with one-pair hands on scary boards.";
  return "Focus drill: keep logging clean decisions. Your next edge is bet sizing and position.";
}

function decisionConfidence(equity, required, action) {
  const edge = equity - required;
  if (action.includes("Fold") && edge < -0.12) return "Clear fold";
  if (action.includes("Fold") && edge < 0.02) return "Close fold";
  if ((action.includes("Call") || action.includes("Check")) && Math.abs(edge) < 0.06) return "Mixed spot";
  if ((action.includes("Bet") || action.includes("Raise")) && edge > 0.18) return "Clear value";
  if (edge > 0.08) return "Clear continue";
  return "Close decision";
}

function evEstimate(equity, pot, callAmount) {
  if (!callAmount) return 0;
  return equity * (pot + callAmount) - callAmount;
}

function leakReport(stats, vpip, pfr, showdownWin) {
  const notes = [];
  if (stats.handsPlayed < 25) notes.push(`Sample is small: ${stats.handsPlayed}/25 hands before leak reads become reliable.`);
  if (vpip > 38) notes.push("VPIP is loose. Tighten weak offsuit calls and out-of-position hands.");
  if (vpip < 14 && stats.handsPlayed >= 10) notes.push("VPIP is very tight. Look for profitable opens in late position.");
  if (pfr < vpip * 0.45 && vpip > 18) notes.push("Gap between VPIP and PFR is wide. You may be calling too much preflop.");
  if (showdownWin < 42 && stats.showdowns >= 5) notes.push("Showdown win rate is low. Review river calls and bluff-catch spots.");
  if ((stats.thinCalls || 0) > (stats.strongValueBets || 0) + 2) notes.push("Thin calls are outpacing value bets. Fold more marginal river hands.");
  if (!notes.length) notes.push("No major leak yet. Keep collecting volume and review close spots.");
  return notes.slice(0, 4);
}

function exportStats(stats) {
  const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `emerald-room-stats-${TODAY_KEY}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function rangeNoteForPosition(position, category) {
  if (category === "premium") return "This hand belongs in every position's value range.";
  if (category === "strong") return position === "Cutoff" || position === "Dealer" ? "Good open in late position." : "Playable, but avoid bloating pots out of position.";
  if (category === "playable") return "Range-aware mixed hand: best with position, deep stacks, or suited/paired equity.";
  if (category === "speculative") return "Speculative hand: prefer late-position raises or folds over passive calls.";
  return "Outside most solid opening ranges.";
}

function liveCoachAdvice({ hand, hero, callAmount, equityInfo }) {
  if (!hand || !hero) {
    return {
      action: "Wait",
      sizing: "",
      equity: 0,
      required: 0,
      confidence: "Low",
      title: "Waiting for a hand",
      reasons: ["Deal a hand to get live coaching."],
      draws: ["No draw data yet"],
      outs: 0,
      threats: ["No board threats yet."],
      concerns: ["No opponent action yet."]
    };
  }
  const board = hand.board || [];
  const activeOpponents = hand.players.filter((p) => p.id !== "hero" && !p.folded).length;
  if (hand.phase === "preflop") return preflopCoachAdvice({ hand, hero, callAmount, activeOpponents });
  const made = board.length ? bestHand([...hero.cards, ...board]) : null;
  const preflop = preflopScore(hero.cards);
  const draw = drawProfile(hero.cards, board);
  const threats = boardThreats(board);
  const concerns = opponentConcerns(hand);
  const straightThreats = straightThreatWindows(board);
  const ctx = postflopRecommendationContext(hand, hero, callAmount, equityInfo);
  const { profile, texture, pressure, pot, required, mdf } = ctx;
  const wetBoard = texture !== "dry";
  const spr = hero.stack / Math.max(1, pot);
  const heroMadeRank = made?.rank ?? 0;
  const vulnerableMadeHand = board.length >= 3 && heroMadeRank <= 2 && (straightThreats.made.length || wetBoard || pressure.bettors);
  const adjustedEquity = ctx.equity;
  const madeName = made?.name || handTier(preflop);
  const equityEdge = adjustedEquity - required;
  let action = "Check";
  let sizing = "";
  const reasons = [];

  if (callAmount > 0) {
    if (hand.phase === "river" && profile.hand.rank <= 1 && adjustedEquity < required + 0.06) {
      action = "Fold";
      reasons.push("River bluff-catch needs villain bluffing enough; this hand is too low in range for the price.");
    } else if (pressure.allIn && vulnerableMadeHand && adjustedEquity < required + 0.1) {
      action = "Fold";
      reasons.push("Two pair or one pair is not a stack-off hand against this polarized all-in on a threatened board.");
    } else if (equityEdge < -0.08 && draw.outs < 8) {
      action = "Fold";
      reasons.push(`Your equity is below the ${Math.round(required * 100)}% break-even price.`);
    } else if (adjustedEquity > 0.68 && (made?.rank >= 3 || preflop > 0.78) && !pressure.allIn) {
      action = spr < 2.4 ? "Raise / Jam" : "Raise";
      sizing = spr < 2.4 ? "all-in pressure" : `${formatMoney(Math.round(hand.currentBet + pot * (wetBoard ? 0.75 : 0.55)))}`;
      reasons.push("Your equity is high enough to value-raise and deny draws.");
    } else if (draw.outs >= 8 && equityEdge > -0.04) {
      action = pressure.bettors && hand.phase !== "river" ? "Call / mix raise" : "Call";
      reasons.push(`${draw.outs} estimated outs gives enough realization to continue.`);
    } else {
      action = Math.abs(equityEdge) < 0.04 ? "Mixed call/fold" : "Call";
      reasons.push(`Pot odds require ${Math.round(required * 100)}%; risk-adjusted estimate is ${Math.round(adjustedEquity * 100)}%.`);
    }
    reasons.push(`Minimum defense frequency versus this size is about ${Math.round(mdf * 100)}%.`);
  } else {
    if (profile.hand.rank >= 4) {
      action = "Bet";
      const pctSize = wetBoard ? 0.75 : 0.55;
      sizing = `${Math.round(pctSize * 100)}% pot (${formatMoney(Math.round(pot * pctSize))})`;
      reasons.push("Strong made hands can value bet and charge worse hands/draws.");
    } else if (profile.hand.rank >= 2 && wetBoard) {
      action = "Bet";
      sizing = `60-75% pot (${formatMoney(Math.round(pot * 0.66))})`;
      reasons.push("Vulnerable value on wet boards prefers protection sizing.");
    } else if (profile.topPair || profile.overPair) {
      action = texture === "dry" ? "Bet small / check mix" : "Bet";
      sizing = texture === "dry" ? `33% pot (${formatMoney(Math.round(pot * 0.33))})` : `50-66% pot (${formatMoney(Math.round(pot * 0.55))})`;
      reasons.push(texture === "dry" ? "Dry boards allow smaller range/value bets." : "Charge draws and worse pairs on wetter boards.");
    } else if (draw.outs >= 8 && !pressure.bettors && hand.phase !== "river") {
      action = "Bet semi-bluff";
      sizing = `33-50% pot (${formatMoney(Math.round(pot * 0.4))})`;
      reasons.push("Strong draws can profit by folding out better high-card hands while retaining equity.");
    } else if (adjustedEquity < 0.34 && activeOpponents > 1) {
      action = "Check";
      reasons.push("Multiway weak equity should realize cheaply instead of building a pot.");
    } else {
      action = "Check";
      reasons.push("Pot control is preferred without clear value or strong bluff equity.");
    }
  }

  if (straightThreats.made.length) reasons.push(`Specific straight concern: ${straightThreats.made.slice(0, 2).join(" or ")} in an opponent hand beats most two-pair hands.`);
  reasons.push(`${madeName} with ${draw.labels.join(", ")}.`);
  if (activeOpponents > 1) reasons.push("Multiway pots require tighter value betting and fewer bluffs.");
  if (pressure.bettors) reasons.push("Opponent aggression narrows their range and raises your required hand strength.");

  return {
    action,
    sizing,
    equity: adjustedEquity,
    rawEquity: ctx.rawEquity,
    required,
    confidence: decisionConfidence(adjustedEquity, required, action),
    title: `${action}${sizing ? ` · ${sizing}` : ""}`,
    reasons: reasons.slice(0, 4),
    draws: draw.labels,
    outs: draw.outs,
    threats: vulnerableMadeHand && !threats.some((threat) => /vulnerable/i.test(threat))
      ? ["Your made hand is vulnerable to straights/sets under pressure.", ...threats].slice(0, 3)
      : threats,
    concerns
  };
}

function preflopCoachAdvice({ hand, hero, callAmount, activeOpponents }) {
  const category = preflopCategory(hero.cards);
  const info = holeInfo(hero.cards);
  const inBlind = hero.bet > 0;
  const unopened = !hand.preflopRaised && hand.currentBet <= BIG_BLIND;
  const position = positionName(0, hand.dealer);
  const latePosition = position === "Dealer" || position === "Cutoff";
  const bigBlind = position === "Big Blind";
  const smallBlind = position === "Small Blind";
  const raiseSize = callAmount + hero.bet;
  const potOdds = callAmount > 0 ? callAmount / Math.max(1, hand.pot + callAmount) : 0;
  const reasons = [];
  let action = "Fold";
  let sizing = "";

  if (callAmount === 0) {
    action = category === "trash" ? "Check" : "Check / take free card";
    reasons.push("No price to continue, so realize equity for free.");
  } else if (unopened) {
    if (category === "premium" || category === "strong") {
      action = "Open raise";
      sizing = `${formatMoney(BIG_BLIND * 3)}`;
      reasons.push("Strong first-in hands want fold equity and value, not a limp.");
    } else if (category === "playable" && (info.suited || info.pair || latePosition)) {
      action = latePosition ? "Open raise" : smallBlind ? "Raise / fold mix" : "Call / mix";
      sizing = latePosition ? `${formatMoney(BIG_BLIND * 2.5)}` : "";
      reasons.push("Playable hands can enter cheaply, especially pairs and suited connectors.");
    } else if (category === "speculative") {
      action = latePosition && info.suited ? "Open raise / mix" : bigBlind && potOdds < 0.3 ? "Defend mix" : "Fold";
      sizing = latePosition && info.suited ? `${formatMoney(BIG_BLIND * 2.5)}` : "";
      reasons.push(info.suited ? "Suited speculative hands perform better because they can make strong draws." : "Offsuit connectors lose value multiway and do not realize equity well.");
      reasons.push("If you enter first, raising is usually better than calling.");
    } else {
      action = inBlind && callAmount <= BIG_BLIND ? "Defend selectively" : "Fold";
      reasons.push("Weak offsuit hands are easy to dominate and hard to profit with.");
    }
  } else {
    if (category === "premium") {
      action = "Raise / call";
      sizing = `${formatMoney(Math.round(hand.currentBet * 2.7))}`;
      reasons.push("Premium hands can continue against a raise.");
    } else if (smallBlind && category !== "premium") {
      action = category === "strong" ? "3-bet or fold" : "Mostly fold";
      sizing = category === "strong" ? `${formatMoney(Math.round(hand.currentBet * 3.2))}` : "";
      reasons.push("Small blind flats realize equity poorly; use a raise-or-fold strategy more often.");
    } else if (category === "strong" && callAmount <= BIG_BLIND * 3) {
      action = bigBlind ? "Call / 3-bet mix" : "Call";
      reasons.push("Strong hands have enough equity versus a normal raise.");
    } else if ((info.pair || (info.suited && category === "playable")) && callAmount <= BIG_BLIND * 3) {
      action = bigBlind ? "Defend call" : "Call if stacks are deep";
      reasons.push("Speculative hands need implied odds; fold them to large raises outside the big blind.");
    } else if (bigBlind && info.suited && raiseSize <= BIG_BLIND * 3 && category !== "trash") {
      action = "Defend call";
      reasons.push("Big blind gets the best price and closes preflop action, so suited hands defend wider.");
    } else {
      action = "Fold";
      reasons.push("This hand is not strong enough versus a raise.");
    }
  }

  return {
    action,
    sizing,
    equity: Math.min(0.75, preflopScore(hero.cards)),
    rawEquity: Math.min(0.75, preflopScore(hero.cards)),
    required: callAmount > 0 ? callAmount / Math.max(1, hand.pot + callAmount) : 0,
    confidence: decisionConfidence(Math.min(0.75, preflopScore(hero.cards)), callAmount > 0 ? callAmount / Math.max(1, hand.pot + callAmount) : 0, action),
    title: `${action}${sizing ? ` · ${sizing}` : ""}`,
    reasons: [
      `${readableCategory(category)} from ${position} against ${activeOpponents} live opponents.`,
      rangeNoteForPosition(position, category),
      ...reasons
    ].slice(0, 4),
    draws: [info.suited ? "suited potential" : "offsuit hand", info.connector ? "connector potential" : "limited straight playability"],
    outs: 0,
    threats: ["Preflop: avoid dominated offsuit hands and weak calls."],
    concerns: ["No one has raised yet; choose open-raise or fold more often than limp/call."]
  };
}

function App() {
  const [stats, setStats] = useState(loadStats);
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [hand, setHand] = useState(null);
  const [raiseAmount, setRaiseAmount] = useState(BIG_BLIND * 3);
  const [soundOn, setSoundOn] = useState(true);
  const [activePanel, setActivePanel] = useState("review");
  const [mode, setMode] = useState("training");
  const [drill, setDrill] = useState("none");
  const [drawer, setDrawer] = useState(null);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [scenario, setScenario] = useState("none");
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [betSizesOpen, setBetSizesOpen] = useState(false);
  const [actionSoundsOn, setActionSoundsOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [actionVolume, setActionVolume] = useState(0.36);
  const [musicVolume, setMusicVolume] = useState(0.028);
  const actionLock = useRef(false);
  const audioRef = useRef(null);
  const musicRef = useRef(null);

  useEffect(() => {
    setStats((s) => ({ ...s, sessionsPlayed: s.sessionsPlayed + 1 }));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  useEffect(() => {
    if (!hand) startHand();
  }, []);

  useEffect(() => {
    if (!hand || hand.phase === "showdown" || hand.phase === "complete") return;
    const current = hand.players[hand.toAct];
    if (current && !current.isHuman) {
      const timer = setTimeout(() => runAiTurn(), 650);
      return () => clearTimeout(timer);
    }
  }, [hand]);

  useEffect(() => {
    if ((!soundOn || !musicOn) && musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
    }
  }, [soundOn, musicOn]);

  function getAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const ctx = audioRef.current || new AudioContext();
    audioRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function startAmbientMusic() {
    if (!soundOn || !musicOn || musicRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.setValueAtTime(musicVolume, ctx.currentTime);
    master.connect(ctx.destination);
    let stopped = false;
    const chords = [
      [196, 246.94, 293.66, 369.99],
      [174.61, 220, 261.63, 329.63],
      [164.81, 207.65, 246.94, 311.13],
      [185, 233.08, 277.18, 349.23]
    ];

    const playChord = (index = 0) => {
      if (stopped) return;
      const now = ctx.currentTime;
      chords[index % chords.length].forEach((frequency, noteIndex) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.08 / (noteIndex + 1), now + 0.8);
        gain.gain.linearRampToValueAtTime(0.0001, now + 5.8);
        oscillator.connect(filter).connect(gain).connect(master);
        oscillator.start(now);
        oscillator.stop(now + 6.1);
      });
      musicRef.current.timer = window.setTimeout(() => playChord(index + 1), 5600);
    };

    musicRef.current = {
      stop: () => {
        stopped = true;
        window.clearTimeout(musicRef.current?.timer);
        master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      },
      timer: null
    };
    playChord();
  }

  function playSound(type) {
    if (!soundOn || !actionSoundsOn) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      startAmbientMusic();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(actionVolume, now);
      master.connect(ctx.destination);

      const tone = (frequency, start, length, volume, typeName = "sine") => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = typeName;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        oscillator.connect(gain).connect(master);
        oscillator.start(start);
        oscillator.stop(start + length + 0.03);
      };

      const noise = (start, length, volume, filterFreq) => {
        const bufferSize = Math.floor(ctx.sampleRate * length);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        source.buffer = buffer;
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(filterFreq, start);
        filter.Q.setValueAtTime(6, start);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        source.connect(filter).connect(gain).connect(master);
        source.start(start);
      };

      if (type === "deal") {
        noise(now, 0.075, 0.09, 1800);
        noise(now + 0.045, 0.055, 0.055, 2500);
      } else if (type === "fold") {
        noise(now, 0.09, 0.05, 850);
      } else if (type === "check") {
        tone(180, now, 0.055, 0.018, "triangle");
        noise(now, 0.035, 0.025, 1200);
      } else if (type === "call") {
        tone(330, now, 0.055, 0.028, "triangle");
        tone(392, now + 0.045, 0.06, 0.022, "triangle");
        noise(now, 0.06, 0.06, 1500);
      } else if (type === "bet" || type === "raise") {
        tone(261.63, now, 0.06, 0.026, "triangle");
        tone(392, now + 0.05, 0.07, 0.026, "triangle");
        tone(523.25, now + 0.1, 0.075, 0.02, "sine");
        noise(now + 0.018, 0.11, 0.085, 1700);
      } else if (type === "allin") {
        tone(146.83, now, 0.16, 0.04, "triangle");
        tone(220, now + 0.07, 0.2, 0.035, "triangle");
        tone(329.63, now + 0.16, 0.18, 0.03, "sine");
        noise(now, 0.22, 0.11, 1100);
      } else if (type === "win") {
        noise(now, 0.16, 0.1, 1900);
        [392, 493.88, 587.33, 783.99].forEach((frequency, index) => {
          tone(frequency, now + index * 0.105, 0.18, 0.035 - index * 0.004, "sine");
        });
        tone(987.77, now + 0.48, 0.26, 0.024, "triangle");
      }
    } catch {
      setSoundOn(false);
    }
  }

  function startHand() {
    const selectedDrill = DRILLS.find((item) => item.id === drill) || DRILLS[0];
    const selectedScenario = SCENARIOS.find((item) => item.id === scenario) || SCENARIOS[0];
    let deck = selectedScenario.id === "none" ? shuffle(createDeck()) : stackDeckForScenario(selectedScenario);
    playSound("deal");
    let players = createPlayers(stats.bankroll).map((p) => ({ ...p, cards: [deck.pop(), deck.pop()] }));
    if (selectedScenario.hero) players[0].cards = selectedScenario.hero.map(parseCard);
    if (mode === "drill" && selectedDrill.id !== "none") {
      for (let tries = 0; tries < 80 && !selectedDrill.filter(players[0].cards); tries += 1) {
        deck = shuffle(createDeck());
        players = createPlayers(stats.bankroll).map((p) => ({ ...p, cards: [deck.pop(), deck.pop()] }));
      }
    }
    const dealer = hand ? (hand.dealer + 1) % 4 : 0;
    const sbIndex = (dealer + 1) % 4;
    const bbIndex = (dealer + 2) % 4;
    let pot = 0;
    [sbIndex, bbIndex].forEach((index, blind) => {
      const amount = blind === 0 ? SMALL_BLIND : BIG_BLIND;
      const paid = Math.min(players[index].stack, amount);
      players[index].stack -= paid;
      players[index].bet = paid;
      players[index].invested = paid;
      pot += paid;
      if (players[index].stack === 0) players[index].allIn = true;
    });
    const scenarioPhase = selectedScenario.board?.length === 3 ? "flop" : selectedScenario.board?.length === 4 ? "turn" : selectedScenario.board?.length === 5 ? "river" : "preflop";
    if (scenarioPhase !== "preflop") {
      players.forEach((player) => {
        player.bet = 0;
        player.acted = false;
      });
    }
    const newHand = {
      id: safeId(),
      deck,
      players,
      dealer,
      board: selectedScenario.board ? selectedScenario.board.map(parseCard) : [],
      pot,
      phase: scenarioPhase,
      currentBet: scenarioPhase === "preflop" ? BIG_BLIND : 0,
      minRaise: BIG_BLIND,
      toAct: scenarioPhase === "preflop" ? (dealer + 3) % 4 : nextActiveIndex(players, dealer),
      log: [`New hand${mode === "drill" && selectedDrill.id !== "none" ? ` · Drill: ${selectedDrill.name}` : ""}${selectedScenario.id !== "none" ? ` · Scenario: ${selectedScenario.name}` : ""}. ${players[sbIndex].name} posts small blind ${SMALL_BLIND}; ${players[bbIndex].name} posts big blind ${BIG_BLIND}.`],
      heroVpip: false,
      heroPfr: false,
      heroDecisions: [],
      replay: [],
      mode,
      drill: selectedDrill.name,
      preflopRaised: false,
      lastAggressor: bbIndex,
      showdown: null
    };
    setRaiseAmount(BIG_BLIND * 3);
    setHand(newHand);
  }

  function resetAllProgress() {
    const fresh = normalizeStats(defaultStats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setStats(fresh);
    setElapsed(0);
    setDrawer(null);
    setTimeout(() => startHand(), 0);
  }

  function commitHandResult(finalHand, heroDelta, heroWon, showdownWon, biggestPot) {
    const review = buildHandReview(finalHand, heroDelta, heroWon);
    setStats((s) => {
      const daily = dailySnapshot(s.daily);
      const leakCounts = { ...(s.leakCounts || {}) };
      if (review.leak) leakCounts[review.leak] = (leakCounts[review.leak] || 0) + 1;
      const xpGain = 30 + (heroWon ? 20 : 8) + (review.leak ? 4 : 12) + (finalHand.heroDecisions?.length || 0) * 3;
      const next = {
        ...s,
        handsPlayed: s.handsPlayed + 1,
        totalProfit: s.totalProfit + heroDelta,
        bankroll: Math.max(0, s.bankroll + heroDelta),
        wins: s.wins + (heroWon ? 1 : 0),
        handsWon: s.handsWon + (heroWon ? 1 : 0),
        vpipHands: s.vpipHands + (finalHand.heroVpip ? 1 : 0),
        pfrHands: s.pfrHands + (finalHand.heroPfr ? 1 : 0),
        showdowns: s.showdowns + (finalHand.showdown?.results ? 1 : 0),
        showdownWins: s.showdownWins + (showdownWon ? 1 : 0),
        biggestPotWon: Math.max(s.biggestPotWon, biggestPot || 0),
        sessionSecondsTotal: s.sessionSecondsTotal + elapsed,
        xp: (s.xp || 0) + xpGain,
        reviewsCompleted: (s.reviewsCompleted || 0) + 1,
        disciplinedFolds: (s.disciplinedFolds || 0) + (finalHand.heroDecisions?.filter((d) => d.grade === "Disciplined fold").length || 0),
        thinCalls: (s.thinCalls || 0) + (finalHand.heroDecisions?.filter((d) => d.leak === "thin_calls").length || 0),
        strongValueBets: (s.strongValueBets || 0) + (finalHand.heroDecisions?.filter((d) => d.grade === "Value pressure").length || 0),
        daily: { ...daily, hands: daily.hands + 1, reviews: daily.reviews + 1, xp: daily.xp + xpGain },
        recentReviews: [review, ...(s.recentReviews || [])].slice(0, 8),
        leakCounts
      };
      const unlocked = ACHIEVEMENTS.filter((a) => !(next.achievements || []).includes(a.id) && a.test(next)).map((a) => a.id);
      next.achievements = [...(next.achievements || []), ...unlocked];
      next.level = levelFromXp(next.xp);
      return next;
    });
  }

  function finishByFold(nextHand) {
    const winner = livePlayers(nextHand.players)[0];
    const heroStart = Math.max(1000, Math.min(STARTING_STACK, stats.bankroll));
    playSound(winner.id === "hero" ? "win" : "fold");
    const players = nextHand.players.map((p) => (p.id === winner.id ? { ...p, stack: p.stack + nextHand.pot, lastAction: `Wins ${formatMoney(nextHand.pot)}` } : p));
    const hero = players[0];
    const heroDelta = hero.stack - heroStart;
    const complete = { ...nextHand, players, phase: "complete", showdown: { winners: [winner.id], handName: "Won by fold" } };
    setHand(complete);
    commitHandResult(complete, heroDelta, winner.id === "hero", false, winner.id === "hero" ? nextHand.pot : 0);
  }

  function showdown(nextHand) {
    const contenders = livePlayers(nextHand.players);
    const results = contenders.map((p) => ({ id: p.id, hand: bestHand([...p.cards, ...nextHand.board]) }));
    const best = results.reduce((top, result) => (compareHands(result.hand, top.hand) > 0 ? result : top), results[0]);
    const winners = results.filter((r) => compareHands(r.hand, best.hand) === 0).map((r) => r.id);
    const share = Math.floor(nextHand.pot / winners.length);
    playSound(winners.includes("hero") ? "win" : "deal");
    const players = nextHand.players.map((p) => ({
      ...p,
      reveal: !p.folded,
      stack: winners.includes(p.id) ? p.stack + share : p.stack,
      lastAction: winners.includes(p.id) ? `Wins ${formatMoney(share)}` : p.folded ? "Folded" : "Shows"
    }));
    const heroStart = Math.max(1000, Math.min(STARTING_STACK, stats.bankroll));
    const heroDelta = players[0].stack - heroStart;
    const complete = {
      ...nextHand,
      players,
      phase: "complete",
      showdown: { winners, handName: best.hand.name, results }
    };
    setHand(complete);
    commitHandResult(complete, heroDelta, winners.includes("hero"), winners.includes("hero"), winners.includes("hero") ? nextHand.pot : 0);
  }

  function advanceStreet(nextHand) {
    if (livePlayers(nextHand.players).length === 1) return finishByFold(nextHand);
    if (nextHand.players.filter((p) => !p.folded && !p.allIn).length === 0) {
      const deck = [...nextHand.deck];
      const board = [...nextHand.board];
      while (board.length < 5) board.push(deck.pop());
      return showdown({ ...nextHand, deck, board });
    }
    const deck = [...nextHand.deck];
    let board = [...nextHand.board];
    let phase = nextHand.phase;
    if (phase === "preflop") {
      playSound("deal");
      board = [deck.pop(), deck.pop(), deck.pop()];
      phase = "flop";
    } else if (phase === "flop") {
      playSound("deal");
      board = [...board, deck.pop()];
      phase = "turn";
    } else if (phase === "turn") {
      playSound("deal");
      board = [...board, deck.pop()];
      phase = "river";
    } else {
      return showdown(nextHand);
    }
    const players = nextHand.players.map((p) => ({ ...p, bet: 0, acted: p.folded || p.allIn, lastAction: p.folded ? "Folded" : p.allIn ? "All in" : "Waiting" }));
    const toAct = nextActiveIndex(players, nextHand.dealer);
    setHand({ ...nextHand, deck, board, phase, currentBet: 0, minRaise: BIG_BLIND, players, toAct, log: [`${phaseLabel(phase)} dealt.`, ...nextHand.log] });
  }

  function applyAction(type, amount = 0) {
    if (!hand || actionLock.current) return;
    actionLock.current = true;
    setTimeout(() => {
      setHand((current) => {
        if (!current || current.phase === "complete") return current;
        const players = current.players.map((p) => ({ ...p }));
        const player = players[current.toAct];
        const callAmount = Math.max(0, current.currentBet - player.bet);
        let pot = current.pot;
        let currentBet = current.currentBet;
        let minRaise = current.minRaise;
        let message = "";
        let heroVpip = current.heroVpip;
        let heroPfr = current.heroPfr;
        let heroDecisions = current.heroDecisions || [];
        let replay = current.replay || [];
        let preflopRaised = current.preflopRaised;
        let lastAggressor = current.lastAggressor;
        const heroDecision = player.isHuman ? coachTipForAction({ type, hand: current, player, callAmount, amount }) : null;
        const heroCoach = player.isHuman
          ? liveCoachAdvice({
              hand: current,
              hero: player,
              callAmount,
              equityInfo: estimateHeroEquity(current, player, 140)
            })
          : null;

        if (type === "fold") {
          player.folded = true;
          player.acted = true;
          player.lastAction = "Folds";
          message = `${player.name} folds.`;
        } else if (type === "check") {
          player.acted = true;
          player.lastAction = "Checks";
          message = `${player.name} checks.`;
        } else if (type === "call") {
          const paid = Math.min(player.stack, callAmount);
          player.stack -= paid;
          player.bet += paid;
          player.invested += paid;
          pot += paid;
          player.acted = true;
          if (player.stack === 0) player.allIn = true;
          if (player.isHuman && paid > 0 && !(current.phase === "preflop" && player.bet <= BIG_BLIND)) heroVpip = true;
          player.lastAction = player.allIn ? `Calls all in ${formatMoney(paid)}` : `Calls ${formatMoney(paid)}`;
          message = `${player.name} calls ${paid}.`;
        } else if (type === "allin") {
          const paid = player.stack;
          player.stack = 0;
          player.bet += paid;
          player.invested += paid;
          pot += paid;
          player.allIn = true;
          player.acted = true;
          if (player.bet > currentBet) {
            minRaise = Math.max(BIG_BLIND, player.bet - currentBet);
            currentBet = player.bet;
            players.forEach((p, index) => {
              if (index !== current.toAct && !p.folded && !p.allIn) p.acted = false;
            });
            lastAggressor = current.toAct;
            preflopRaised = current.phase === "preflop" || preflopRaised;
            if (player.isHuman && current.phase === "preflop") heroPfr = true;
          }
          if (player.isHuman) heroVpip = true;
          player.lastAction = `All in ${formatMoney(paid)}`;
          message = `${player.name} moves all in for ${paid}.`;
        } else {
          const wasOpeningBet = currentBet === 0;
          const targetBet = Math.max(amount, currentBet + minRaise, BIG_BLIND);
          const add = Math.min(player.stack, Math.max(callAmount, targetBet - player.bet));
          player.stack -= add;
          player.bet += add;
          player.invested += add;
          pot += add;
          player.acted = true;
          if (player.stack === 0) player.allIn = true;
          if (player.bet > currentBet) {
            minRaise = Math.max(BIG_BLIND, player.bet - currentBet);
            currentBet = player.bet;
            players.forEach((p, index) => {
              if (index !== current.toAct && !p.folded && !p.allIn) p.acted = false;
            });
            lastAggressor = current.toAct;
            preflopRaised = current.phase === "preflop" || preflopRaised;
          }
          if (player.isHuman) {
            heroVpip = true;
            if (current.phase === "preflop" && player.bet > BIG_BLIND) heroPfr = true;
          }
          player.lastAction = player.allIn ? `All in ${formatMoney(player.bet)}` : `${wasOpeningBet ? "Bets" : "Raises"} ${formatMoney(player.bet)}`;
          message = `${player.name} ${wasOpeningBet ? "bets" : "raises to"} ${player.bet}.`;
        }
        playSound(type === "allin" ? "allin" : type === "raise" ? "raise" : type === "bet" ? "bet" : type);

        const next = {
          ...current,
          players,
          pot,
          currentBet,
          minRaise,
          heroVpip,
          heroPfr,
          heroDecisions: heroDecision ? [...heroDecisions, heroDecision] : heroDecisions,
          replay: heroCoach
            ? [
                ...replay,
                {
                  street: phaseLabel(current.phase),
                  cards: player.cards.map(cardText).join(" "),
                  board: current.board.map(cardText).join(" "),
                  playerAction: type,
                  coachAction: heroCoach.title,
                  confidence: heroCoach.confidence,
                  equity: heroCoach.equity,
                  required: heroCoach.required,
                  ev: evEstimate(heroCoach.equity, current.pot, callAmount),
                  reasons: heroCoach.reasons
                }
              ]
            : replay,
          preflopRaised,
          lastAggressor,
          log: [message, ...current.log]
        };
        if (livePlayers(players).length === 1) {
          setTimeout(() => finishByFold(next), 80);
          return next;
        }
        if (allSettled(players, currentBet)) {
          setTimeout(() => advanceStreet(next), 150);
          return next;
        }
        return { ...next, toAct: nextActiveIndex(players, current.toAct) };
      });
      actionLock.current = false;
    }, 20);
  }

  function aiDecision(player, current) {
    const difficultySettings = DIFFICULTIES[difficulty] || DIFFICULTIES.intermediate;
    const callAmount = Math.max(0, current.currentBet - player.bet);
    const potOdds = callAmount === 0 ? 0 : callAmount / (current.pot + callAmount);
    const positionBoost = current.toAct === current.dealer ? 0.055 : current.toAct === (current.dealer + 1) % 4 ? -0.045 : 0;
    const texture = textureScore(current.board);
    const base = current.phase === "preflop" ? preflopScore(player.cards) : postflopScore(player.cards, current.board);
    const profile = player.profile;
    const nobodyRaisedPre = current.phase === "preflop" && !current.preflopRaised;
    const adjustedAggression = Math.max(0.15, profile.aggression + difficultySettings.aiAggression);
    const randomBluff = Math.random() < profile.bluff + difficultySettings.aiAggression * 0.04 + (callAmount === 0 ? 0.025 : 0) + Math.max(0, texture) * 0.025;
    const pressure = adjustedAggression * 0.075 + positionBoost - Math.max(0, texture) * 0.045;
    const preflopConfidence = Math.max(0, Math.min(1, base + pressure + (randomBluff ? 0.11 : 0)));
    if (current.phase === "preflop") return aiPreflopDecision(player, current, callAmount, preflopConfidence, randomBluff, difficultySettings);
    const post = current.board.length ? postflopProfile(player.cards, current.board) : null;
    const streetPenalty = current.phase === "turn" ? 0.04 : current.phase === "river" ? 0.09 : 0;
    const weakMadePenalty = post?.weakPair || post?.underPair ? 0.12 : post?.air ? 0.16 : 0;
    const drawBonus = current.phase !== "river" ? Math.min(0.1, (post?.draw.outs || 0) * 0.009) : 0;
    const confidence = Math.max(0, Math.min(1, base + pressure + drawBonus - streetPenalty - weakMadePenalty + (randomBluff ? 0.08 : 0)));
    const stackPressure = callAmount / Math.max(1, player.stack + callAmount);
    const openThreshold = (current.phase === "preflop" ? 0.72 - adjustedAggression * 0.08 : 0.66 - adjustedAggression * 0.07) + difficultySettings.aiTightness;
    const raiseThreshold = (current.phase === "preflop" ? 0.82 - adjustedAggression * 0.04 : 0.78 - adjustedAggression * 0.05) + difficultySettings.aiTightness;
    const allInThreshold = current.phase === "preflop" ? 0.97 : 0.93;
    const street = { flop: 0, turn: 1, river: 2 }[current.phase] ?? 0;
    const betPressure = callAmount / Math.max(BIG_BLIND, current.pot);
    const largeBet = betPressure >= 0.65;
    const hugeBet = betPressure >= 0.95;

    // AI logic: opponents combine made-hand strength, draw potential, board texture,
    // pot odds, table position, individual aggression profiles, and occasional bluffs.
    // This keeps weak hands capable of folding while still allowing pressure bets,
    // semi-bluffs, and pot-odds calls with live draws.
    if (callAmount > 0) {
      if (current.phase === "river") {
        if (post?.air || post?.weakPair || post?.underPair) {
          if (largeBet || confidence < potOdds + 0.28) return { type: "fold" };
        }
        if (!post?.showdownValue && !randomBluff && confidence < potOdds + 0.2) return { type: "fold" };
      }
      if (current.phase === "turn") {
        if ((post?.air || post?.weakPair || post?.underPair) && largeBet && post.draw.outs < 8) return { type: "fold" };
        if (hugeBet && !post?.showdownValue && post?.draw.outs < 10) return { type: "fold" };
      }
      if (current.phase === "flop") {
        if (hugeBet && post?.air && !post.hasOvercards) return { type: "fold" };
      }
      if (confidence + profile.looseness * 0.14 < potOdds + 0.2 + stackPressure * 0.12 && !randomBluff) return { type: "fold" };
      if (confidence > allInThreshold && player.stack <= current.pot * 1.15 && Math.random() < 0.42 + adjustedAggression * 0.25) return { type: "allin" };
      if (confidence > raiseThreshold && player.stack > callAmount + BIG_BLIND * 4 && Math.random() < 0.32 + adjustedAggression * 0.28) {
        const raiseSize = Math.max(current.minRaise, Math.floor(current.pot * (0.32 + adjustedAggression * 0.22)));
        return { type: "raise", amount: Math.min(player.stack + player.bet, current.currentBet + raiseSize) };
      }
      return { type: "call" };
    }
    if ((confidence > openThreshold && (current.phase !== "preflop" || nobodyRaisedPre)) || randomBluff) {
      const pct = confidence > 0.86 ? 0.65 : confidence > 0.72 ? 0.5 : 0.33;
      const bet = Math.min(player.stack, Math.max(BIG_BLIND, Math.floor(current.pot * pct)));
      if (bet >= player.stack * 0.8 && confidence > allInThreshold) return { type: "allin" };
      return { type: "bet", amount: bet };
    }
    return { type: "check" };
  }

  function runAiTurn() {
    setHand((current) => {
      if (!current) return current;
      const player = current.players[current.toAct];
      if (!player || player.isHuman || player.folded || player.allIn) return current;
      const decision = aiDecision(player, current);
      setTimeout(() => applyAction(decision.type, decision.amount), 30);
      return current;
    });
  }

  const hero = hand?.players[0];
  const callAmount = hand && hero ? Math.max(0, hand.currentBet - hero.bet) : 0;
  const canAct = hand && hero && hand.toAct === 0 && hand.phase !== "complete";
  const potSizes = useMemo(() => {
    const pot = hand?.pot || 0;
    return [
      ["1/3 pot", Math.max(BIG_BLIND, Math.floor(pot / 3))],
      ["1/2 pot", Math.max(BIG_BLIND, Math.floor(pot / 2))],
      ["3/4 pot", Math.max(BIG_BLIND, Math.floor(pot * 0.75))],
      ["Pot", Math.max(BIG_BLIND, pot)]
    ];
  }, [hand?.pot]);
  const winRate = stats.handsPlayed ? Math.round((stats.handsWon / stats.handsPlayed) * 100) : 0;
  const vpip = stats.handsPlayed ? Math.round((stats.vpipHands / stats.handsPlayed) * 100) : 0;
  const pfr = stats.handsPlayed ? Math.round((stats.pfrHands / stats.handsPlayed) * 100) : 0;
  const showdownWin = stats.showdowns ? Math.round((stats.showdownWins / stats.showdowns) * 100) : 0;
  const hours = Math.max(1 / 60, (elapsed + stats.sessionSecondsTotal) / 3600);
  const bbHr = ((stats.totalProfit / BIG_BLIND) / hours).toFixed(1);
  const nextXp = nextLevelXp(stats.level || 1);
  const levelBase = nextLevelXp((stats.level || 1) - 1);
  const levelProgress = ((stats.xp || 0) - levelBase) / Math.max(1, nextXp - levelBase);
  const daily = dailySnapshot(stats.daily);
  const unlockedAchievements = ACHIEVEMENTS.filter((a) => (stats.achievements || []).includes(a.id));
  const lockedAchievements = ACHIEVEMENTS.filter((a) => !(stats.achievements || []).includes(a.id)).slice(0, 3);
  const currentReview = stats.recentReviews?.[0];
  const commonLeak = Object.entries(stats.leakCounts || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const currentHeroStrength = hero ? (hand?.phase === "preflop" ? preflopScore(hero.cards) : postflopScore(hero.cards, hand?.board || [])) : 0;
  const boardKey = hand?.board?.map((card) => card.id).join("-") || "";
  const playerActionKey = hand?.players?.map((player) => `${player.id}:${player.folded}:${player.lastAction}:${player.bet}`).join("|") || "";
  const equityInfo = useMemo(() => estimateHeroEquity(hand, hero, 260), [
    hand?.id,
    hand?.phase,
    boardKey,
    playerActionKey
  ]);
  const coachAdvice = liveCoachAdvice({ hand, hero, callAmount, equityInfo });
  const planLine = trainingPlan({ vpip, pfr, showdownWin, commonLeak });
  const coachLine = canAct
    ? `${handTier(currentHeroStrength)} ${phaseLabel(hand.phase)} spot. ${callAmount ? `It costs ${formatMoney(callAmount)} into ${formatMoney(hand.pot)}.` : "No bet to you yet."}`
    : hand?.phase === "complete"
      ? "Review the hand, then start the next rep."
      : "Watch the opponents' lines and note who applies pressure.";

  return (
    <main className="app">
      <section className="topbar">
        <div>
          <p className="eyebrow">No-Limit Texas Hold'em</p>
          <h1>Emerald Room</h1>
        </div>
        <div className="top-actions">
          <button className="sound-toggle" onClick={() => setSoundOn((value) => !value)}>{soundOn ? "Audio On" : "Audio Off"}</button>
          <button className="new-hand" onClick={startHand}>New Hand</button>
        </div>
      </section>

      <section className="game-hud">
        <div>
          <span>Bankroll</span>
          <strong>{formatMoney(stats.bankroll)}</strong>
        </div>
        <div>
          <span>Session</span>
          <strong>{new Date(elapsed * 1000).toISOString().slice(11, 19)}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>{TRAINING_MODES[mode].name}</strong>
        </div>
      </section>

      <section className="quick-tools">
        {[
          ["coach", "Coach"],
          ["stats", "Stats"],
          ["progress", "Progress"],
          ["settings", "Modes"]
        ].map(([id, label]) => (
          <button key={id} className={drawer === id ? "selected" : ""} onClick={() => setDrawer(drawer === id ? null : id)}>{label}</button>
        ))}
      </section>

      {drawer && (
        <section className="drawer-panel">
          <button className="drawer-close" onClick={() => setDrawer(null)}>Close</button>
          {drawer === "coach" && (
            <div className="coach-card compact-card">
              <p className="eyebrow">Live Coach</p>
              <h2>{coachAdvice.title}</h2>
              <div className="coach-meters">
                <Meter label="Equity" value={coachAdvice.equity} />
                <Meter label="Needed" value={coachAdvice.required} />
              </div>
              <div className="coach-summary">
                <strong>{coachAdvice.confidence}</strong>
                <span>EV {formatMoney(evEstimate(coachAdvice.equity, hand?.pot || 0, callAmount))}</span>
              </div>
              <button className="why-button" onClick={() => setCoachExpanded((value) => !value)}>{coachExpanded ? "Hide Details" : "Why?"}</button>
              {coachExpanded && (
                <>
                  <div className="coach-reasons">
                    {coachAdvice.reasons.map((reason) => <p key={reason}>{reason}</p>)}
                  </div>
                  <div className="watch-grid">
                    <MiniCoach title="Watch For" items={coachAdvice.concerns} />
                    <MiniCoach title="Board Threats" items={coachAdvice.threats} />
                    <MiniCoach title="Your Draws" items={[`${coachAdvice.outs} estimated outs`, ...coachAdvice.draws]} />
                  </div>
                </>
              )}
            </div>
          )}
          {drawer === "stats" && (
            <div className="stats-strip drawer-stats">
              <Stat label="Profit/Loss" value={formatMoney(stats.totalProfit)} tone={stats.totalProfit >= 0 ? "good" : "bad"} />
              <Stat label="Hands" value={stats.handsPlayed} />
              <Stat label="Win Rate" value={`${winRate}%`} />
              <Stat label="BB/hr" value={bbHr} />
              <Stat label="VPIP" value={`${vpip}%`} />
              <Stat label="PFR" value={`${pfr}%`} />
              <Stat label="SD Win" value={`${showdownWin}%`} />
              <Stat label="Biggest Pot" value={formatMoney(stats.biggestPotWon)} />
            </div>
          )}
          {drawer === "progress" && (
            <div className="progress-drawer">
              <div className="trainer-card level-card">
                <p className="eyebrow">Training Rank</p>
                <h2>Level {stats.level || 1}</h2>
                <div className="progress-line"><span style={{ width: pct(levelProgress, 1) }} /></div>
                <p className="muted">{stats.xp || 0} XP · {Math.max(0, nextXp - (stats.xp || 0))} XP to next level</p>
              </div>
              <div className="trainer-card goals-card">
                <div className="goal-header">
                  <div>
                    <p className="eyebrow">Daily Grind</p>
                    <h2>{daily.hands} hands today</h2>
                  </div>
                  <strong>{Math.round((daily.xp || 0))} XP</strong>
                </div>
                <Goal label="Play 10 hands" value={daily.hands} target={10} />
                <Goal label="Review 10 hands" value={daily.reviews} target={10} />
                <Goal label="Earn 750 XP" value={daily.xp} target={750} />
              </div>
            </div>
          )}
          {drawer === "settings" && (
            <div className="mode-strip in-drawer">
              <div className="mode-buttons">
                {Object.entries(TRAINING_MODES).map(([id, item]) => (
                  <button key={id} className={mode === id ? "selected" : ""} onClick={() => setMode(id)}>{item.name}</button>
                ))}
              </div>
              <div className="settings-grid">
                <label>
                  Difficulty
                  <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                    {Object.entries(DIFFICULTIES).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}
                  </select>
                  <span>{DIFFICULTIES[difficulty].note}</span>
                </label>
                <label>
                  Scenario
                  <select value={scenario} onChange={(event) => setScenario(event.target.value)}>
                    {SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <span>{SCENARIOS.find((item) => item.id === scenario)?.focus}</span>
                </label>
              </div>
              <div className="drill-picker">
                <label htmlFor="drill">Drill</label>
                <select id="drill" value={drill} onChange={(event) => setDrill(event.target.value)} disabled={mode !== "drill"}>
                  {DRILLS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <span>{mode === "drill" ? (DRILLS.find((item) => item.id === drill)?.focus || "") : TRAINING_MODES[mode].detail}</span>
              </div>
              <div className="audio-settings">
                <label><input type="checkbox" checked={actionSoundsOn} onChange={(event) => setActionSoundsOn(event.target.checked)} /> Action sounds</label>
                <label><input type="checkbox" checked={musicOn} onChange={(event) => setMusicOn(event.target.checked)} /> Ambient music</label>
                <label>Action volume <input type="range" min="0" max="0.8" step="0.01" value={actionVolume} onChange={(event) => setActionVolume(Number(event.target.value))} /></label>
                <label>Music volume <input type="range" min="0" max="0.12" step="0.002" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} /></label>
                <button onClick={() => playSound("win")}>Preview Win Sound</button>
              </div>
              <div className="data-actions">
                <button onClick={() => exportStats(stats)}>Export Stats</button>
                <button onClick={resetAllProgress}>Reset All Progress</button>
                <button onClick={() => setStats((current) => ({ ...current, bankroll: defaultStats.bankroll, totalProfit: 0 }))}>Reset Bankroll</button>
              </div>
            </div>
          )}
        </section>
      )}

      {hand && (
        <section className="table-wrap">
          <div className="felt">
            <div className="table-meta">
              <span>{phaseLabel(hand.phase)}</span>
              <strong>Pot {formatMoney(hand.pot)}</strong>
            </div>
            <div className="opponents">
              {hand.players.slice(1).map((player, index) => (
                <PlayerSeat key={player.id} player={player} active={hand.toAct === index + 1} position={POSITIONS[(index + 1 - hand.dealer + 4) % 4]} board={hand.board} showdown={hand.phase === "complete"} />
              ))}
            </div>
            <div className="board">
              {[0, 1, 2, 3, 4].map((i) => <Card key={i} card={hand.board[i]} hidden={!hand.board[i]} />)}
            </div>
            <PlayerSeat player={hero} active={hand.toAct === 0} position={POSITIONS[(0 - hand.dealer + 4) % 4]} board={hand.board} hero showdown />
          </div>
        </section>
      )}

      <section className="controls">
        <button className="bet-size-toggle" onClick={() => setBetSizesOpen((value) => !value)}>{betSizesOpen ? "Hide Bet Sizes" : "Bet Sizes"}</button>
        {betSizesOpen && (
          <div className="sizer">
            {potSizes.map(([label, amount]) => (
              <button key={label} disabled={!canAct} onClick={() => setRaiseAmount(Math.min(hero.stack + hero.bet, amount + callAmount))}>{label}</button>
            ))}
            <button disabled={!canAct} onClick={() => setRaiseAmount(hero.stack + hero.bet)}>All In</button>
          </div>
        )}
        <div className="raise-input">
          <label htmlFor="raiseAmount">Bet / raise to</label>
          <input id="raiseAmount" type="range" min={BIG_BLIND} max={Math.max(BIG_BLIND, (hero?.stack || 0) + (hero?.bet || 0))} value={Math.min(raiseAmount, Math.max(BIG_BLIND, (hero?.stack || 0) + (hero?.bet || 0)))} onChange={(e) => setRaiseAmount(Number(e.target.value))} />
          <strong>{formatMoney(raiseAmount)}</strong>
        </div>
        <div className="actions">
          <button disabled={!canAct} onClick={() => applyAction("fold")}>Fold</button>
          <button disabled={!canAct || callAmount > 0} onClick={() => applyAction("check")}>Check</button>
          <button disabled={!canAct || callAmount === 0} onClick={() => applyAction("call")}>Call {callAmount ? formatMoney(callAmount) : ""}</button>
          <button disabled={!canAct || callAmount > 0} onClick={() => applyAction("bet", raiseAmount)}>Bet</button>
          <button disabled={!canAct || callAmount === 0} onClick={() => applyAction("raise", raiseAmount)}>Raise</button>
          <button disabled={!canAct} className="danger" onClick={() => applyAction("allin")}>All In</button>
          <button className="new-hand sticky-new-hand" onClick={startHand}>New Hand</button>
          <button className="reset-button" onClick={resetAllProgress}>Reset All</button>
        </div>
      </section>

      <section className="compact-review-toggle">
        <button onClick={() => setDrawer(drawer === "review" ? null : "review")}>Hand Review</button>
      </section>

      {drawer === "review" && <section className="panel-shell floating-review">
        <div className="tabs">
          {[
            ["review", "Review"],
            ["skills", "Skills"],
            ["history", "History"]
          ].map(([id, label]) => (
            <button key={id} className={activePanel === id ? "selected" : ""} onClick={() => setActivePanel(id)}>{label}</button>
          ))}
        </div>
        {activePanel === "review" && (
          <div className="panel">
            <h2>Post-Hand Review</h2>
            {hand?.showdown ? (
              <div className="showdown">
                <p><strong>{hand.showdown.handName}</strong> wins for {hand.showdown.winners.map((id) => hand.players.find((p) => p.id === id)?.name).join(", ")}</p>
                {hand.showdown.results?.map((result) => {
                  const p = hand.players.find((x) => x.id === result.id);
                  return <p key={result.id}>{p.name}: {p.cards.map(cardText).join(" ")} - {result.hand.name}</p>;
                })}
                {currentReview && (
                  <div className="review-box">
                    <strong>{currentReview.result} · {formatMoney(currentReview.profit)}</strong>
                    {currentReview.tips.map((tip) => <p key={tip}>{tip}</p>)}
                  </div>
                )}
                {currentReview?.replay?.length > 0 && (
                  <div className="replay-list">
                    {currentReview.replay.map((step, index) => (
                      <div className="replay-step" key={`${step.street}-${index}`}>
                        <strong>{step.street}: you chose {step.playerAction}</strong>
                        <span>Coach: {step.coachAction} · {step.confidence} · EV {formatMoney(step.ev)}</span>
                        <p>{step.reasons?.[0]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="muted">Your post-hand coach notes appear here after each hand.</p>
            )}
          </div>
        )}
        {activePanel === "skills" && (
          <div className="panel">
            <h2>Skill Tracker</h2>
            <div className="skill-list">
              <Skill label="Disciplined folds" value={stats.disciplinedFolds || 0} />
              <Skill label="Value pressure" value={stats.strongValueBets || 0} />
              <Skill label="Thin calls" value={stats.thinCalls || 0} warn />
              <Skill label="Main leak" value={leakLabel(commonLeak)} />
            </div>
            <div className="leak-report">
              {leakReport(stats, vpip, pfr, showdownWin).map((note) => <p key={note}>{note}</p>)}
            </div>
            <div className="achievement-row">
              {unlockedAchievements.slice(-3).map((achievement) => <Badge key={achievement.id} achievement={achievement} />)}
              {!unlockedAchievements.length && <p className="muted">Achievements unlock as you play and review hands.</p>}
            </div>
          </div>
        )}
        {activePanel === "history" && (
          <div className="panel">
            <h2>Hand History</h2>
            <div className="history">
              {hand?.log.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
            </div>
          </div>
        )}
      </section>}
    </main>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Goal({ label, value, target }) {
  const complete = value >= target;
  return (
    <div className={`goal ${complete ? "complete" : ""}`}>
      <div>
        <strong>{label}</strong>
        <span>{complete ? "Done" : progressText(value, target)}</span>
      </div>
      <div className="mini-progress"><span style={{ width: pct(value, target) }} /></div>
    </div>
  );
}

function Meter({ label, value }) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <strong>{Math.round(value * 100)}%</strong>
      </div>
      <div className="mini-progress"><span style={{ width: pct(value, 1) }} /></div>
    </div>
  );
}

function MiniCoach({ title, items }) {
  return (
    <div className="mini-coach">
      <strong>{title}</strong>
      {items.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}

function Skill({ label, value, warn }) {
  return (
    <div className={`skill ${warn ? "warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({ achievement }) {
  return (
    <div className="badge">
      <strong>{achievement.name}</strong>
      <span>{achievement.description}</span>
    </div>
  );
}

function PlayerSeat({ player, active, position, hero, showdown, board = [] }) {
  if (!player) return null;
  const showCards = hero || showdown || player.reveal;
  const actionClass = (player.lastAction || "").toLowerCase().split(" ")[0];
  const showdownHand = showdown && board.length >= 3 && !player.folded ? bestHand([...player.cards, ...board]).name : null;
  return (
    <div className={`seat ${hero ? "hero" : ""} ${active ? "active" : ""} ${player.folded ? "folded" : ""} ${player.allIn ? "all-in" : ""}`}>
      <div className="seat-info">
        <div>
          <strong>{player.name}</strong>
          <span>{position}{player.profile ? ` · ${player.profile.style}` : ""}</span>
        </div>
        <div className="stack">
          <strong>{formatMoney(player.stack)}</strong>
          <span>{player.allIn ? "All in" : player.bet ? `Bet ${formatMoney(player.bet)}` : player.folded ? "Folded" : "Ready"}</span>
        </div>
      </div>
      <div className="cards">
        {player.cards.map((card, index) => <Card key={`${player.id}-${index}`} card={showCards ? card : null} hidden={!showCards} />)}
      </div>
      {hero && <div className="hand-readout"><span>Your hand</span><strong>{heroHandLabel(player, board)}</strong></div>}
      {showdownHand && !hero && <div className="hand-readout villain-hand"><span>Final hand</span><strong>{showdownHand}</strong></div>}
      {player.profile && <p className="read-line">{player.profile.tell}</p>}
      <div className={`action-badge ${actionClass}`}>{player.lastAction}</div>
    </div>
  );
}

function Card({ card, hidden }) {
  const red = card && (card.suit === "hearts" || card.suit === "diamonds");
  return (
    <div className={`card ${hidden ? "back" : ""} ${red ? "red" : ""}`}>
      {card && !hidden ? (
        <>
          <span>{card.rank}</span>
          <strong>{SUIT_SYMBOLS[card.suit]}</strong>
        </>
      ) : (
        <span className="pattern">◆</span>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

window.addEventListener("error", (event) => {
  const root = document.getElementById("root");
  if (root && !root.textContent.trim()) {
    root.innerHTML = `<main class="app"><section class="crash-card"><h1>Mobile load error</h1><p>${event.message}</p><button onclick="localStorage.removeItem('${STORAGE_KEY}'); location.reload()">Reset Saved Progress</button></section></main>`;
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const root = document.getElementById("root");
  if (root && !root.textContent.trim()) {
    root.innerHTML = `<main class="app"><section class="crash-card"><h1>Mobile load error</h1><p>${event.reason?.message || event.reason || "Unknown error"}</p><button onclick="localStorage.removeItem('${STORAGE_KEY}'); location.reload()">Reset Saved Progress</button></section></main>`;
  }
});
