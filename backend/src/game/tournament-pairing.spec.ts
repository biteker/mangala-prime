import {
  generateSwissRound,
  calculateStandings,
  type SwissParticipantInput,
  type SwissHistoryPairing,
} from '@mangala/shared';

describe('Swiss Tournament Pairing Engine (@mangala/shared)', () => {
  it('should_pair_18_players_across_5_rounds_without_any_rematch', () => {
    const players: SwissParticipantInput[] = Array.from(
      { length: 18 },
      (_, i) => ({
        userId: `student-${String(i + 1).padStart(2, '0')}`,
        elo: 1000 + (18 - i) * 10,
        points: 0,
      }),
    );

    const history: SwissHistoryPairing[] = [];
    const seenPairs = new Set<string>();

    for (let round = 1; round <= 5; round++) {
      const standings = calculateStandings(players, history);
      const updatedInputs: SwissParticipantInput[] = standings.map((s) => ({
        userId: s.userId,
        elo: s.elo,
        points: s.points,
      }));

      const pairings = generateSwissRound(updatedInputs, history);
      expect(pairings).toHaveLength(9);

      for (const pairing of pairings) {
        expect(pairing.isBye).toBe(false);
        expect(pairing.player2Id).not.toBeNull();

        const key =
          pairing.player1Id < pairing.player2Id!
            ? `${pairing.player1Id}::${pairing.player2Id}`
            : `${pairing.player2Id}::${pairing.player1Id}`;
        expect(seenPairs.has(key)).toBe(false);
        seenPairs.add(key);

        // Deterministic result: higher table index alternates winner/draw
        const result =
          (round + pairing.tableNumber) % 5 === 0
            ? 'DRAW'
            : pairing.tableNumber % 2 === 1
              ? 'P1_WIN'
              : 'P2_WIN';

        history.push({
          player1Id: pairing.player1Id,
          player2Id: pairing.player2Id,
          result,
        });
      }
    }

    const finalStandings = calculateStandings(players, history);
    expect(finalStandings).toHaveLength(18);
    expect(finalStandings[0].rank).toBe(1);
    expect(finalStandings[0].points).toBeGreaterThanOrEqual(
      finalStandings[17].points,
    );
  });

  it('should_assign_bye_to_lowest_ranked_player_and_never_repeat_bye', () => {
    const players: SwissParticipantInput[] = Array.from(
      { length: 7 },
      (_, i) => ({
        userId: `p${i + 1}`,
        elo: 1200 - i * 20,
        points: 0,
      }),
    );

    const history: SwissHistoryPairing[] = [];
    const byeRecipients = new Set<string>();

    for (let round = 1; round <= 3; round++) {
      const standings = calculateStandings(players, history);
      const inputs = standings.map((s) => ({
        userId: s.userId,
        elo: s.elo,
        points: s.points,
      }));

      const pairings = generateSwissRound(inputs, history);
      const bye = pairings.find((p) => p.isBye);
      expect(bye).toBeDefined();
      expect(bye!.player2Id).toBeNull();
      expect(byeRecipients.has(bye!.player1Id)).toBe(false);
      byeRecipients.add(bye!.player1Id);

      for (const p of pairings) {
        history.push({
          player1Id: p.player1Id,
          player2Id: p.player2Id,
          result: p.isBye ? 'BYE' : 'P1_WIN',
        });
      }
    }

    expect(byeRecipients.size).toBe(3);
  });

  it('should_break_ties_using_buchholz_score', () => {
    const players: SwissParticipantInput[] = [
      { userId: 'A', elo: 1000, points: 0 },
      { userId: 'B', elo: 1000, points: 0 },
      { userId: 'C', elo: 1000, points: 0 },
      { userId: 'D', elo: 1000, points: 0 },
    ];

    // Round 1: A beats B, C beats D
    // Round 2: C beats A, B beats D
    // Points: C=2, A=1 (opponents B=1, C=2 -> Buchholz=3), B=1 (opponents A=1, D=0 -> Buchholz=1), D=0
    const history: SwissHistoryPairing[] = [
      { player1Id: 'A', player2Id: 'B', result: 'P1_WIN' },
      { player1Id: 'C', player2Id: 'D', result: 'P1_WIN' },
      { player1Id: 'C', player2Id: 'A', result: 'P1_WIN' },
      { player1Id: 'B', player2Id: 'D', result: 'P1_WIN' },
    ];

    const standings = calculateStandings(players, history);
    expect(standings.map((s) => s.userId)).toEqual(['C', 'A', 'B', 'D']);
    expect(standings[1].buchholz).toBe(3);
    expect(standings[2].buchholz).toBe(1);
  });

  it('should_exclude_disqualified_players_from_new_round_pairings', () => {
    const players: SwissParticipantInput[] = [
      { userId: 'p1', elo: 1000, points: 1 },
      { userId: 'p2', elo: 1000, points: 1 },
      { userId: 'p3', elo: 1000, points: 0, disqualified: true },
    ];

    const pairings = generateSwissRound(players, []);
    expect(pairings).toHaveLength(1);
    expect(pairings[0].isBye).toBe(false);
    expect([pairings[0].player1Id, pairings[0].player2Id].sort()).toEqual([
      'p1',
      'p2',
    ]);
  });
});
