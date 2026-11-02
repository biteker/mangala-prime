import {
  applyMove,
  getLegalMoves,
  type BoardState,
  type Player,
} from '@mangala/shared';

export type BotLevel = 'easy' | 'medium' | 'hard';

const DEFAULT_HARD_DEPTH = 6;
const MAX_EXTRA_TURN_CHAIN = 8;

function getTreasuryIndex(player: Player): number {
  return player === 0 ? 6 : 13;
}

function getOpponent(player: Player): Player {
  return player === 0 ? 1 : 0;
}

function evaluateBoard(
  board: BoardState,
  botPlayer: Player,
  extraTurnBonus: number = 0,
): number {
  const opponent = getOpponent(botPlayer);
  const botTreasury = board[getTreasuryIndex(botPlayer)];
  const oppTreasury = board[getTreasuryIndex(opponent)];

  if (botTreasury >= 25) {
    return 1000 + (botTreasury - oppTreasury);
  }
  if (oppTreasury >= 25) {
    return -1000 + (botTreasury - oppTreasury);
  }

  let botPitsSum = 0;
  let oppPitsSum = 0;
  const botStart = botPlayer === 0 ? 0 : 7;
  const oppStart = opponent === 0 ? 0 : 7;

  for (let i = 0; i < 6; i++) {
    botPitsSum += board[botStart + i];
    oppPitsSum += board[oppStart + i];
  }

  return (
    (botTreasury - oppTreasury) * 10 +
    (botPitsSum - oppPitsSum) +
    extraTurnBonus
  );
}

function chooseEasyMove(
  board: BoardState,
  botPlayer: Player,
  rng: () => number,
): number {
  const legalMoves = getLegalMoves(board, botPlayer);
  if (legalMoves.length === 0) {
    throw new Error('Oynanabilecek yasal hamle bulunamadı.');
  }
  const randomIndex = Math.min(
    legalMoves.length - 1,
    Math.max(0, Math.floor(rng() * legalMoves.length)),
  );
  return legalMoves[randomIndex];
}

function chooseMediumMove(board: BoardState, botPlayer: Player): number {
  const legalMoves = getLegalMoves(board, botPlayer);
  if (legalMoves.length === 0) {
    throw new Error('Oynanabilecek yasal hamle bulunamadı.');
  }

  const botTreasuryIdx = getTreasuryIndex(botPlayer);
  const opponent = getOpponent(botPlayer);
  const oppTreasuryIdx = getTreasuryIndex(opponent);

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const result = applyMove(board, move, botPlayer);

    if (result.gameOver && result.winner === botPlayer) {
      return move;
    }

    const stonesGained = result.newBoard[botTreasuryIdx] - board[botTreasuryIdx];

    // Rakibin bir sonraki hamlede elde edebileceği en yüksek kazancı hesapla
    let maxOpponentOpportunity = 0;
    if (!result.gameOver && !result.extraTurn) {
      const oppMoves = getLegalMoves(result.newBoard, opponent);
      for (const oppMove of oppMoves) {
        const oppResult = applyMove(result.newBoard, oppMove, opponent);
        const oppGain =
          oppResult.newBoard[oppTreasuryIdx] - result.newBoard[oppTreasuryIdx];
        const oppExtraBonus = oppResult.extraTurn ? 3 : 0;
        const opportunity = oppGain * 2 + oppExtraBonus;
        if (opportunity > maxOpponentOpportunity) {
          maxOpponentOpportunity = opportunity;
        }
      }
    }

    // Öncelik sırası:
    // 1. Ekstra hamle veren hamle (+10_000)
    // 2. En çok taş yakalayan hamle (+stonesGained * 100)
    // 3. Rakibe en az fırsat bırakan hamle (-maxOpponentOpportunity)
    const score =
      (result.extraTurn ? 10_000 : 0) +
      stonesGained * 100 -
      maxOpponentOpportunity;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  board: BoardState,
  currentPlayer: Player,
  botPlayer: Player,
  depth: number,
  alpha: number,
  beta: number,
  extraTurnChain: number,
): number {
  const legalMoves = getLegalMoves(board, currentPlayer);
  if (depth <= 0 || legalMoves.length === 0) {
    return evaluateBoard(board, botPlayer);
  }

  const isMaximizing = currentPlayer === botPlayer;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      const result = applyMove(board, move, currentPlayer);
      let evaluation: number;

      if (result.gameOver) {
        evaluation = evaluateBoard(
          result.newBoard,
          botPlayer,
          result.extraTurn ? 15 : 0,
        );
      } else if (result.extraTurn && extraTurnChain < MAX_EXTRA_TURN_CHAIN) {
        // Ekstra hamlede aynı oyuncu tekrar oynar, derinlik azaltılmaz
        evaluation =
          minimax(
            result.newBoard,
            result.nextPlayer,
            botPlayer,
            depth,
            alpha,
            beta,
            extraTurnChain + 1,
          ) + 15;
      } else {
        evaluation = minimax(
          result.newBoard,
          result.nextPlayer,
          botPlayer,
          depth - 1,
          alpha,
          beta,
          0,
        );
      }

      if (evaluation > maxEval) {
        maxEval = evaluation;
      }
      if (evaluation > alpha) {
        alpha = evaluation;
      }
      if (beta <= alpha) {
        break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const result = applyMove(board, move, currentPlayer);
      let evaluation: number;

      if (result.gameOver) {
        evaluation = evaluateBoard(
          result.newBoard,
          botPlayer,
          result.extraTurn ? -15 : 0,
        );
      } else if (result.extraTurn && extraTurnChain < MAX_EXTRA_TURN_CHAIN) {
        evaluation =
          minimax(
            result.newBoard,
            result.nextPlayer,
            botPlayer,
            depth,
            alpha,
            beta,
            extraTurnChain + 1,
          ) - 15;
      } else {
        evaluation = minimax(
          result.newBoard,
          result.nextPlayer,
          botPlayer,
          depth - 1,
          alpha,
          beta,
          0,
        );
      }

      if (evaluation < minEval) {
        minEval = evaluation;
      }
      if (evaluation < beta) {
        beta = evaluation;
      }
      if (beta <= alpha) {
        break;
      }
    }
    return minEval;
  }
}

function chooseHardMove(board: BoardState, botPlayer: Player): number {
  const legalMoves = getLegalMoves(board, botPlayer);
  if (legalMoves.length === 0) {
    throw new Error('Oynanabilecek yasal hamle bulunamadı.');
  }

  let bestMove = legalMoves[0];
  let bestValue = -Infinity;

  for (const move of legalMoves) {
    const result = applyMove(board, move, botPlayer);

    if (result.gameOver && result.winner === botPlayer) {
      return move;
    }

    let moveValue: number;
    if (result.gameOver) {
      moveValue = evaluateBoard(result.newBoard, botPlayer);
    } else if (result.extraTurn) {
      moveValue =
        minimax(
          result.newBoard,
          result.nextPlayer,
          botPlayer,
          DEFAULT_HARD_DEPTH,
          -Infinity,
          Infinity,
          1,
        ) + 15;
    } else {
      moveValue = minimax(
        result.newBoard,
        result.nextPlayer,
        botPlayer,
        DEFAULT_HARD_DEPTH - 1,
        -Infinity,
        Infinity,
        0,
      );
    }

    if (moveValue > bestValue) {
      bestValue = moveValue;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Saf Mangala Bot Motoru: Verilen tahta ve zorluk seviyesine göre botun oynayacağı kuyu indeksini döndürür.
 */
export function chooseBotMove(
  board: BoardState,
  botPlayer: Player,
  level: BotLevel,
  rng: () => number = Math.random,
): number {
  switch (level) {
    case 'easy':
      return chooseEasyMove(board, botPlayer, rng);
    case 'medium':
      return chooseMediumMove(board, botPlayer);
    case 'hard':
      return chooseHardMove(board, botPlayer);
  }
}
