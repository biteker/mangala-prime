import { IsUUID } from 'class-validator';

export class InviteDto {
  @IsUUID(4, { message: 'Geçersiz hedef kullanıcı ID formatı.' })
  targetUserId!: string;
}
