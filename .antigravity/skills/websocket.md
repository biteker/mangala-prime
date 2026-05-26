# SKILL: WebSocket Gateway Yazma Standardı

Bu skill'i game.gateway.ts ve lobby.gateway.ts yazarken oku.

---

## Gateway Şablonu

```typescript
@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server

  constructor(
    private readonly gameService: GameService,
    private readonly gameEngine: GameEngineService,
  ) {}

  handleConnection(client: Socket): void {
    // JWT doğrulama burada yapılır
    const token = client.handshake.auth.token
    // doğrula, geçersizse client.disconnect()
  }

  handleDisconnect(client: Socket): void {
    // gameService.handleDisconnect(client.id) çağır
  }
}
```

---

## Event Handler Şablonu

```typescript
@SubscribeMessage('game:move')
async handleMove(
  client: Socket,
  payload: MovePayload,   // any yasak, typed payload zorunlu
): Promise<void> {
  // 1. Validasyon
  const validation = await this.gameService.validateMove(client.id, payload)
  if (!validation.valid) {
    client.emit('game:error', {
      error: { code: 'INVALID_MOVE', message: validation.reason },
      board: validation.currentBoard,
    })
    return
  }

  // 2. İş mantığı
  const result = await this.gameService.processMove(payload)

  // 3. Odaya yayın
  this.server.to(payload.matchId).emit('game:state_update', {
    board: result.newBoard,
    nextPlayerId: result.nextPlayerId,
    turnTimeLeft: 15,
  })
}
```

---

## Hata Yayını

WebSocket hatalarında her zaman şu formatı kullan:

```typescript
client.emit('game:error', {
  error: { code: string, message: string },
  board?: number[]   // Senkronizasyon için mevcut tahta
})
```

---

## Namespace ve Oda Yönetimi

```typescript
// Odaya katıl
client.join(matchId)

// Odaya yayın (kendisi dahil)
this.server.to(matchId).emit('event', payload)

// Odaya yayın (kendisi hariç)
client.to(matchId).emit('event', payload)

// Sadece bir istemciye
this.server.to(socketId).emit('event', payload)
```

---

## In-Memory Oda Haritası

`game.service.ts` içinde oda haritası şöyle tanımlanır:

```typescript
private readonly rooms = new Map<string, GameRoom>()
```

Sunucu yeniden başladığında bu harita sıfırlanır.
MVP için bu kabul edilebilir (spec Bölüm 5 onayı).

---

## Zamanlayıcı Yönetimi

```typescript
// Timer başlatma
const timer = setTimeout(() => {
  this.handleTimeout(matchId, playerId)
}, 15_000)

// Timer'ı room nesnesinde sakla
room.timer = timer

// Timer'ı temizle (her hamle sonrası + oda kapanışında)
clearTimeout(room.timer)
```

Bellek sızıntısını önlemek için oda silinmeden önce
`clearTimeout` çağrıldığından emin ol.

---

## Disconnect / Reconnect Protokolü

```
1. handleDisconnect tetiklenir
2. gameService.handleDisconnect(socketId) çağrılır
3. Karşı oyuncuya game:player_disconnected emit edilir
4. 60 saniyelik reconnect timer başlatılır
5a. game:reconnect alınırsa: timer temizle, game:reconnect_ack gönder
5b. 60 saniye dolarsa: hükmen bitir, ELO güncelle
```

---

## Event Listesi (Referans)

### /lobby Namespace
| Event | Yön | Payload |
|-------|-----|---------|
| lobby:user_status | S→C | { userId, status } |
| lobby:invite_send | C→S | { targetUserId } |
| lobby:invite_response | C→S | { inviterUserId, accepted } |
| lobby:invite_timeout | S→C | { inviterUserId } |
| lobby:error | S→C | { error: { code, message } } |

### /game Namespace
| Event | Yön | Payload |
|-------|-----|---------|
| game:move | C→S | { matchId, pitIndex } |
| game:state_update | S→C | { board, nextPlayerId, turnTimeLeft } |
| game:error | S→C | { error, board? } |
| game:player_disconnected | S→C | { playerId, reconnectWindowSecs: 60 } |
| game:reconnect | C→S | { matchId } |
| game:reconnect_ack | S→C | { board, nextPlayerId, turnTimeLeft, matchId, opponentUsername } |
| game:chat_toggle | C→S | { matchId, chatEnabled } |
| game:message | C→S | { matchId, message, type } |
