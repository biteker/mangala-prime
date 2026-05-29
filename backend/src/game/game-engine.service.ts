import { Injectable, BadRequestException } from '@nestjs/common';
import { BoardState, Player, MoveResult } from '@mangala/shared';

@Injectable()
export class GameEngineService {
  processMove(board: BoardState, pitIndex: number, currentPlayer: Player): MoveResult {
    // 1. Validasyonlar
    if (board.length !== 14) {
      throw new BadRequestException({
        code: 'INVALID_BOARD',
        message: 'Oyun tahtası 14 kuyudan oluşmalıdır.',
      });
    }

    if (pitIndex < 0 || pitIndex >= 14 || pitIndex === 6 || pitIndex === 13) {
      throw new BadRequestException({
        code: 'INVALID_MOVE',
        message: 'Geçersiz kuyu seçimi.',
      });
    }

    const isP1 = currentPlayer === 0;
    const playerStartPit = isP1 ? 0 : 7;
    const playerEndPit = isP1 ? 5 : 12;

    if (pitIndex < playerStartPit || pitIndex > playerEndPit) {
      throw new BadRequestException({
        code: 'INVALID_MOVE',
        message: 'Kendi bölgenizdeki bir kuyudan hamle yapmalısınız.',
      });
    }

    const stones = board[pitIndex];
    if (stones <= 0) {
      throw new BadRequestException({
        code: 'INVALID_MOVE',
        message: 'Seçilen kuyu boş.',
      });
    }

    // Board state'in derin kopyasını oluştur (saf fonksiyon prensibi)
    const newBoard = [...board];

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
      // Son taşın düştüğü kuyu kendi boş kuyumuz olmalı (önceden 0'dı, şimdi dağıtımla 1 oldu)
      // Ancak başlangıçta tek taş varsa ve kendi kuyumuz boşalmışsa, currentPit === pitIndex olamaz
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

    // Kural D: Bölge Temizleme
    const p1PitsEmpty = newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0) === 0;
    const p2PitsEmpty = newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0) === 0;

    if (p1PitsEmpty || p2PitsEmpty) {
      if (p1PitsEmpty) {
        // P1 kendi tarafını ilk bitirdi, P2'nin tüm taşlarını kazanır
        const remainingP2Stones = newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0);
        newBoard[6] += remainingP2Stones;
        for (let i = 7; i <= 12; i++) {
          newBoard[i] = 0;
        }
      } else {
        // P2 kendi tarafını ilk bitirdi, P1'in tüm taşlarını kazanır
        const remainingP1Stones = newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0);
        newBoard[13] += remainingP1Stones;
        for (let i = 0; i <= 5; i++) {
          newBoard[i] = 0;
        }
      }
    }

    // 4. Oyun Bitiş ve Kazanan Kontrolü
    const p1Treasury = newBoard[6];
    const p2Treasury = newBoard[13];
    
    // Her iki bölge de boşsa veya bir oyuncu 25 taşa ulaşmışsa oyun biter
    const totalBoardPitsStones = newBoard.slice(0, 6).reduce((sum, val) => sum + val, 0) + 
                                 newBoard.slice(7, 13).reduce((sum, val) => sum + val, 0);
    
    const gameOver = totalBoardPitsStones === 0 || p1Treasury >= 25 || p2Treasury >= 25;

    let winner: Player | undefined = undefined;
    if (gameOver) {
      // Oyun bittiğinde hazinedeki taşları sayarak kazananı belirle
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
}
