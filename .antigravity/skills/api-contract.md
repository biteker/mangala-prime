# SKILL: REST Endpoint Yazma Standardı

Bu skill'i her controller ve service yazarken oku.

---

## Response Formatı (İstisna Yok)

```typescript
// Başarılı response
{ "data": { ...payload } }

// Hata response
{ "error": { "code": string, "message": string } }
```

Bu format `response.interceptor.ts` ve `http-exception.filter.ts`
tarafından otomatik uygulanır. Controller'da manuel sarmalama yapma.

---

## Controller Şablonu

```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<UserResponseDto>> {
    return this.authService.register(dto)
    // Hata fırlatmak için: throw new ConflictException('CONFLICT', 'Kullanıcı adı alınmış.')
  }
}
```

---

## DTO Şablonu

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string

  @IsString()
  @MinLength(8)
  password: string
}
```

---

## Hata Fırlatma

NestJS built-in exception'ları kullan, string mesajla değil kod+mesajla:

```typescript
throw new ConflictException({ code: 'CONFLICT', message: 'Kullanıcı adı zaten kullanımda.' })
throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Geçersiz şifre.' })
throw new NotFoundException({ code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı.' })
throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Eksik alan.' })
```

---

## Standart HTTP Kodları

| Durum | Kod | Error Code |
|-------|-----|------------|
| Başarı | 200/201 | — |
| Hatalı istek | 400 | VALIDATION_ERROR |
| Yetkisiz | 401 | UNAUTHORIZED |
| Yasak | 403 | FORBIDDEN |
| Bulunamadı | 404 | NOT_FOUND |
| Çakışma | 409 | CONFLICT |
| Rate limit | 429 | RATE_LIMITED |
| Sunucu hatası | 500 | INTERNAL_ERROR |

---

## Guard Kullanımı

```typescript
@UseGuards(JwtAuthGuard)
@Get('me')
async getProfile(@Request() req): Promise<ApiResponse<UserResponseDto>> {
  return this.userService.findById(req.user.id)
}
```

Public endpoint'lerde `@UseGuards` kullanma.

## Endpoint Referansı

Tüm endpoint listesi, method, auth ve açıklamalar → bkz. `docs/spec.md` Bölüm 14

