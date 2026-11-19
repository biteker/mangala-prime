export type SwissPairingResult =
  | 'PENDING'
  | 'P1_WIN'
  | 'P2_WIN'
  | 'DRAW'
  | 'BYE'
  | 'NO_SHOW_P1'
  | 'NO_SHOW_P2';

export interface SwissParticipantInput {
  readonly userId: string;
  readonly elo: number;
  readonly points: number;
  readonly disqualified?: boolean;
}

export interface SwissHistoryPairing {
  readonly player1Id: string;
  readonly player2Id: string | null;
  readonly result: SwissPairingResult;
}

export interface GeneratedSwissPairing {
  readonly tableNumber: number;
  readonly player1Id: string;
  readonly player2Id: string | null;
  readonly isBye: boolean;
}

export interface SwissStanding {
  readonly rank: number;
  readonly userId: string;
  readonly points: number;
  readonly buchholz: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly elo: number;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/**
 * Computes points, wins, draws, losses, and Buchholz tie-break scores from pairing history.
 * Pure function with zero external dependencies.
 */
export function calculateStandings(
  participants: readonly SwissParticipantInput[],
  pairings: readonly SwissHistoryPairing[],
): SwissStanding[] {
  const stats = new Map<
    string,
    {
      points: number;
      wins: number;
      draws: number;
      losses: number;
      opponents: string[];
      elo: number;
    }
  >();

  for (const p of participants) {
    stats.set(p.userId, {
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      opponents: [],
      elo: p.elo,
    });
  }

  for (const pairing of pairings) {
    const p1 = stats.get(pairing.player1Id);
    const p2 = pairing.player2Id ? stats.get(pairing.player2Id) : undefined;

    if (pairing.result === 'BYE') {
      if (p1) {
        p1.points += 1;
        p1.wins += 1;
      }
      continue;
    }

    if (pairing.result === 'PENDING') {
      continue;
    }

    if (p1 && pairing.player2Id) {
      p1.opponents.push(pairing.player2Id);
    }
    if (p2) {
      p2.opponents.push(pairing.player1Id);
    }

    if (pairing.result === 'P1_WIN' || pairing.result === 'NO_SHOW_P2') {
      if (p1) {
        p1.points += 1;
        p1.wins += 1;
      }
      if (p2) {
        p2.losses += 1;
      }
    } else if (pairing.result === 'P2_WIN' || pairing.result === 'NO_SHOW_P1') {
      if (p2) {
        p2.points += 1;
        p2.wins += 1;
      }
      if (p1) {
        p1.losses += 1;
      }
    } else if (pairing.result === 'DRAW') {
      if (p1) {
        p1.points += 0.5;
        p1.draws += 1;
      }
      if (p2) {
        p2.points += 0.5;
        p2.draws += 1;
      }
    }
  }

  const standings: Omit<SwissStanding, 'rank'>[] = [];
  for (const [userId, s] of stats.entries()) {
    let buchholz = 0;
    for (const oppId of s.opponents) {
      buchholz += stats.get(oppId)?.points ?? 0;
    }
    standings.push({
      userId,
      points: s.points,
      buchholz,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      elo: s.elo,
    });
  }

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.elo !== a.elo) return b.elo - a.elo;
    return a.userId.localeCompare(b.userId);
  });

  return standings.map((s, idx) => ({
    rank: idx + 1,
    ...s,
  }));
}

/**
 * Generates Swiss-system pairings for the next round.
 * - Sorts active participants by points desc, elo desc, userId asc.
 * - Assigns BYE to the lowest-ranked player who hasn't had a BYE yet (if odd count).
 * - Avoids rematches via backtracking; falls back to minimal-distance pairing if unavoidable.
 * - Balances P1 (first mover) / P2 assignments across rounds.
 */
export function generateSwissRound(
  participants: readonly SwissParticipantInput[],
  previousPairings: readonly SwissHistoryPairing[],
): GeneratedSwissPairing[] {
  const active = participants
    .filter((p) => !p.disqualified)
    .slice()
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.elo !== a.elo) return b.elo - a.elo;
      return a.userId.localeCompare(b.userId);
    });

  if (active.length === 0) {
    return [];
  }

  const playedPairs = new Set<string>();
  const byeCount = new Map<string, number>();
  const p1Balance = new Map<string, number>();

  for (const p of active) {
    byeCount.set(p.userId, 0);
    p1Balance.set(p.userId, 0);
  }

  for (const prev of previousPairings) {
    if (prev.player2Id === null || prev.result === 'BYE') {
      byeCount.set(prev.player1Id, (byeCount.get(prev.player1Id) ?? 0) + 1);
    } else {
      playedPairs.add(pairKey(prev.player1Id, prev.player2Id));
      p1Balance.set(prev.player1Id, (p1Balance.get(prev.player1Id) ?? 0) + 1);
      p1Balance.set(prev.player2Id, (p1Balance.get(prev.player2Id) ?? 0) - 1);
    }
  }

  let byePlayer: SwissParticipantInput | null = null;
  const pool = [...active];

  if (pool.length % 2 === 1) {
    // Pick lowest-ranked player with fewest previous BYEs
    let bestIdx = pool.length - 1;
    let minByes = byeCount.get(pool[bestIdx].userId) ?? 0;

    for (let i = pool.length - 1; i >= 0; i--) {
      const count = byeCount.get(pool[i].userId) ?? 0;
      if (count < minByes) {
        minByes = count;
        bestIdx = i;
      }
      if (minByes === 0 && i === bestIdx) {
        break;
      }
    }

    byePlayer = pool.splice(bestIdx, 1)[0];
  }

  const pairs: Array<[SwissParticipantInput, SwissParticipantInput]> = [];

  const backtrack = (
    remaining: SwissParticipantInput[],
    allowRematch: boolean,
  ): boolean => {
    if (remaining.length === 0) {
      return true;
    }

    const first = remaining[0];
    for (let i = 1; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (!allowRematch && playedPairs.has(pairKey(first.userId, candidate.userId))) {
        continue;
      }

      const nextRemaining = remaining.filter((_, idx) => idx !== 0 && idx !== i);
      pairs.push([first, candidate]);
      if (backtrack(nextRemaining, allowRematch)) {
        return true;
      }
      pairs.pop();
    }

    return false;
  };

  if (!backtrack(pool, false)) {
    pairs.length = 0;
    backtrack(pool, true);
  }

  const generated: GeneratedSwissPairing[] = pairs.map(([a, b], index) => {
    const balanceA = p1Balance.get(a.userId) ?? 0;
    const balanceB = p1Balance.get(b.userId) ?? 0;
    // Give P1 (first mover) to the player who has moved first fewer times
    const [p1, p2] = balanceA <= balanceB ? [a, b] : [b, a];
    return {
      tableNumber: index + 1,
      player1Id: p1.userId,
      player2Id: p2.userId,
      isBye: false,
    };
  });

  if (byePlayer) {
    generated.push({
      tableNumber: generated.length + 1,
      player1Id: byePlayer.userId,
      player2Id: null,
      isBye: true,
    });
  }

  return generated;
}
