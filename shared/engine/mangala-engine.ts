import type { BoardState, Player, MoveResult } from '../types';

export type MangalaRuleErrorCode =
  | 'INVALID_BOARD'
  | 'INVALID_PIT'
  | 'NOT_YOUR_PIT'
  | 'EMPTY_PIT';

export class MangalaRuleError extends Error {
  readonly code: MangalaRuleErrorCode;

  constructor(code: MangalaRuleErrorCode, message: string) {
    super(message);
    this.name = 'MangalaRuleError';
    this.code = code;
    Object.setPrototypeOf(this, MangalaRuleError.prototype);
  }
}

const INITIAL_BOARD: readonly number[] = Object.freeze([
  4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0,
]);

/**
 * Başlangıç Mangala tahtasını (12 kuyuda 4'er taş, 2 hazinede 0 taş) yeni bir dizi olarak döndürür.
 */
export function createInitialBoard(): BoardState {
  return [...INITIAL_BOARD];
}

/**
 * Verilen tahta durumunda sıradaki oyuncunun oynayabileceği geçerli kuyu indekslerini döndürür.
 */
export function getLegalMoves(board: BoardState, player: Player): number[] {
  if (!Array.isArray(board) || board.length !== 14) {
    throw new MangalaRuleError(
      'INVALID_BOARD',
      'Oyun tahtası 14 kuyudan oluşmalıdır.',
    );
  }

  const startPit = player === 0 ? 0 : 7;
  const endPit = player === 0 ? 5 : 12;
  const legalMoves: number[] = [];

  for (let i = startPit; i <= endPit; i++) {
    if (board[i] > 0) {
      legalMoves.push(i);
    }
  }

  return legalMoves;
}

/**
 * Türk Mangalası resmi kurallarına göre saf (pure) hamle işleme fonksiyonu.
 * Girdi tahtasını (board) kesinlikle değiştirmez (immutability).
 */
export function applyMove(
  board: BoardState,
  pitIndex: number,
  currentPlayer: Player,
): MoveResult {
  // 1. Validasyonlar
  if (!Array.isArray(board) || board.length !== 14) {
    throw new MangalaRuleError(
      'INVALID_BOARD',
      'Oyun tahtası 14 kuyudan oluşmalıdır.',
    );
  }

  if (pitIndex < 0 || pitIndex >= 14 || pitIndex === 6 || pitIndex === 13) {
    throw new MangalaRuleError('INVALID_PIT', 'Geçersiz kuyu seçimi.');
  }

  const isP1 = currentPlayer === 0;
  const playerStartPit = isP1 ? 0 : 7;
  const playerEndPit = isP1 ? 5 : 12;

  if (pitIndex < playerStartPit || pitIndex > playerEndPit) {
    throw new MangalaRuleError(
      'NOT_YOUR_PIT',
      'Kendi bölgenizdeki bir kuyudan hamle yapmalısınız.',
    );
  }

  const stones = board[pitIndex];
  if (stones <= 0) {
    throw new MangalaRuleError('EMPTY_PIT', 'Seçilen kuyu boş.');
  }

  // Board state'in derin kopyasını oluştur (saf fonksiyon prensibi)
  const newBoard: BoardState = [...board];

  // Kuyuyu boşalt
  newBoard[pitIndex] = 0;

  let currentPit = pitIndex;
  const opponentTreasury = isP1 ? 13 : 6;
  const ownTreasury = isP1 ? 6 : 13;

  // 2. Taş Dağıtımı
  if (stones === 1) {
    // Tek taş kuralı: Taş doğrudan bir sonraki kuyuya taşınır.
    currentPit = (currentPit + 1) % 14;
    if (currentPit === opponentTreasury) {
      currentPit = (currentPit + 1) % 14;
    }
    newBoard[currentPit] += 1;
  } else {
    // Çoklu taş kuralı: Kendi kuyusuna 1 taş bırakılır, kalanlar saatin tersi yönünde dağıtılır.
    newBoard[pitIndex] = 1;
    let remainingStones = stones - 1;

    while (remainingStones > 0) {
      currentPit = (currentPit + 1) % 14;

      // Rakip hazinesine denk gelirse atla
      if (currentPit === opponentTreasury) {
        continue;
      }

      newBoard[currentPit] += 1;
      remainingStones--;
    }
  }

  let extraTurn = false;
  const capturedPits: number[] = [];

  // 3. Özel Kuralların Uygulanması

  // Kural A: Hazine Kuralı (Ek Hamle)
  if (currentPit === ownTreasury) {
    extraTurn = true;
  }

  // Kural B: Çift Taş Kuralı (Rakip bölgesinde çift sayı elde etme)
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

  // Kural C: Turan Taktiği (Boş kuyu kuralı)
  if (currentPit >= playerStartPit && currentPit <= playerEndPit) {
    if (
      newBoard[currentPit] === 1 &&
      (pitIndex !== currentPit || stones === 1)
    ) {
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

  // Kural D: Bölge Temizleme
  const p1PitsEmpty =
    newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0) === 0;
  const p2PitsEmpty =
    newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0) === 0;

  if (p1PitsEmpty || p2PitsEmpty) {
    if (p1PitsEmpty) {
      const remainingP2Stones = newBoard
        .slice(7, 13)
        .reduce((sum, val) => sum + val, 0);
      newBoard[6] += remainingP2Stones;
      for (let i = 7; i <= 12; i++) {
        newBoard[i] = 0;
      }
    } else {
      const remainingP1Stones = newBoard
        .slice(0, 6)
        .reduce((sum, val) => sum + val, 0);
      newBoard[13] += remainingP1Stones;
      for (let i = 0; i <= 5; i++) {
        newBoard[i] = 0;
      }
    }
  }

  // 4. Oyun Bitiş ve Kazanan Kontrolü
  const p1Treasury = newBoard[6];
  const p2Treasury = newBoard[13];

  const totalBoardPitsStones =
    newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0) +
    newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0);

  const gameOver =
    totalBoardPitsStones === 0 || p1Treasury >= 25 || p2Treasury >= 25;

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
    nextPlayer: extraTurn ? currentPlayer : currentPlayer === 0 ? 1 : 0,
    extraTurn,
    gameOver,
    winner,
    capturedPits: capturedPits.length > 0 ? capturedPits : undefined,
  };
}
