import type { BoardState, Player, MoveResult } from '@mangala/shared';

/**
 * Pure Mangala Game Engine for Local PvP and client-side simulation.
 * Complies 100% with official Turkish Mangala rules.
 */
export function processLocalMove(
  board: BoardState,
  pitIndex: number,
  currentPlayer: Player
): MoveResult {
  if (board.length !== 14) {
    throw new Error('Oyun tahtası 14 kuyudan oluşmalıdır.');
  }

  if (pitIndex < 0 || pitIndex >= 14 || pitIndex === 6 || pitIndex === 13) {
    throw new Error('Geçersiz kuyu seçimi.');
  }

  const isP1 = currentPlayer === 0;
  const playerStartPit = isP1 ? 0 : 7;
  const playerEndPit = isP1 ? 5 : 12;

  if (pitIndex < playerStartPit || pitIndex > playerEndPit) {
    throw new Error('Kendi bölgenizdeki bir kuyudan hamle yapmalısınız.');
  }

  const stones = board[pitIndex];
  if (stones <= 0) {
    throw new Error('Seçilen kuyu boş.');
  }

  // Deep copy for immutability
  const newBoard = [...board];
  newBoard[pitIndex] = 0;

  let currentPit = pitIndex;
  const opponentTreasury = isP1 ? 13 : 6;
  const ownTreasury = isP1 ? 6 : 13;

  // Sowing logic
  if (stones === 1) {
    currentPit = (currentPit + 1) % 14;
    if (currentPit === opponentTreasury) {
      currentPit = (currentPit + 1) % 14;
    }
    newBoard[currentPit] += 1;
  } else {
    newBoard[pitIndex] = 1;
    let remainingStones = stones - 1;

    while (remainingStones > 0) {
      currentPit = (currentPit + 1) % 14;
      if (currentPit === opponentTreasury) {
        continue;
      }
      newBoard[currentPit] += 1;
      remainingStones--;
    }
  }

  let extraTurn = false;
  const capturedPits: number[] = [];

  // Rule A: Treasury landing (Extra turn)
  if (currentPit === ownTreasury) {
    extraTurn = true;
  }

  // Rule B: Making opponent pit even
  const opponentStartPit = isP1 ? 7 : 0;
  const opponentEndPit = isP1 ? 12 : 5;

  if (currentPit >= opponentStartPit && currentPit <= opponentEndPit) {
    if (newBoard[currentPit] % 2 === 0) {
      const capturedCount = newBoard[currentPit];
      newBoard[ownTreasury] += capturedCount;
      newBoard[currentPit] = 0;
      capturedPits.push(currentPit);
    }
  }

  // Rule C: Turan Tactic (Empty own pit landing)
  if (currentPit >= playerStartPit && currentPit <= playerEndPit) {
    if (newBoard[currentPit] === 1 && (pitIndex !== currentPit || stones === 1)) {
      const oppositePit = 12 - currentPit;
      if (newBoard[oppositePit] > 0) {
        const capturedCount = newBoard[currentPit] + newBoard[oppositePit];
        newBoard[ownTreasury] += capturedCount;
        newBoard[currentPit] = 0;
        newBoard[oppositePit] = 0;
        capturedPits.push(currentPit, oppositePit);
      }
    }
  }

  // Rule D: Board clearance (first to empty own side captures rest of opponent stones)
  const p1PitsEmpty = newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0) === 0;
  const p2PitsEmpty = newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0) === 0;

  if (p1PitsEmpty || p2PitsEmpty) {
    if (p1PitsEmpty) {
      const remainingP2Stones = newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0);
      newBoard[6] += remainingP2Stones;
      for (let i = 7; i <= 12; i++) {
        newBoard[i] = 0;
      }
    } else {
      const remainingP1Stones = newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0);
      newBoard[13] += remainingP1Stones;
      for (let i = 0; i <= 5; i++) {
        newBoard[i] = 0;
      }
    }
  }

  // Game over check
  const p1Treasury = newBoard[6];
  const p2Treasury = newBoard[13];
  const totalBoardPitsStones =
    newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0) +
    newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0);

  const gameOver = totalBoardPitsStones === 0 || p1Treasury >= 25 || p2Treasury >= 25;

  let winner: Player | undefined = undefined;
  if (gameOver) {
    if (p1Treasury > p2Treasury) {
      winner = 0;
    } else if (p2Treasury > p1Treasury) {
      winner = 1;
    }
  }

  return {
    newBoard,
    nextPlayer: extraTurn ? currentPlayer : ((currentPlayer === 0 ? 1 : 0) as Player),
    extraTurn,
    gameOver,
    winner,
    capturedPits: capturedPits.length > 0 ? capturedPits : undefined,
  };
}
