# SKILL: Test Yazma Standardı

Bu skill'i her test dosyası yazarken oku.

---

## Genel Kurallar

- Her modülün test dosyası modülle aynı klasörde olur: `foo.service.spec.ts`
- Test isimleri `snake_case` ve açıklayıcı olmalı: `should_grant_extra_turn_when_...`
- Her test tek bir davranışı test eder
- Arrange / Act / Assert yapısını kullan
- Test içinde `any` tipi yasak

---

## Arrange / Act / Assert Şablonu

```typescript
it('should_do_something_when_condition', () => {
  // Arrange — başlangıç durumunu hazırla
  const board = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]
  const pitIndex = 2
  const currentPlayer = 0

  // Act — fonksiyonu çalıştır
  const result = service.processMove(board, pitIndex, currentPlayer)

  // Assert — sonucu doğrula
  expect(result.extraTurn).toBe(false)
  expect(result.nextPlayer).toBe(1)
  expect(result.newBoard[6]).toBe(0)
})
```

---

## Saf Servisler (game-engine, elo)

```typescript
describe('GameEngineService', () => {
  let service: GameEngineService

  beforeEach(() => {
    // NestJS test modülü gerekmez — saf sınıf, direkt instantiate et
    service = new GameEngineService()
  })

  // testler...
})
```

---

## NestJS Servisleri (Bağımlılığı Olanlar)

```typescript
describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })
})
```

---

## Mock Stratejisi

- Prisma: `jest.fn()` ile mock et, gerçek DB kullanma
- Socket.io: `jest.fn()` ile mock et
- Timer (setTimeout): `jest.useFakeTimers()` kullan

---

## Kapsam Hedefleri

| Modül | Minimum Kapsam |
|-------|---------------|
| game-engine.service | %100 (kritik iş mantığı) |
| elo.service | %100 (kritik iş mantığı) |
| auth.service | %80 |
| game.gateway | %70 |
| lobby.gateway | %70 |

---

## Test Çalıştırma

```bash
# Tüm testler
npm run test

# Tek dosya
npm run test -- game-engine.service.spec.ts

# Kapsam raporu
npm run test:cov
```

Kabul kriteri: Tüm testler geçmeden PR açılamaz.
