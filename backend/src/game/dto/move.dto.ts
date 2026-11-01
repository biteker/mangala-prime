import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class MoveDto {
  @IsUUID(4, { message: 'Geçersiz maç ID formatı.' })
  matchId!: string;

  @IsInt({ message: 'Kuyu indeksi tam sayı olmalıdır.' })
  @Min(0, { message: 'Kuyu indeksi en az 0 olabilir.' })
  @Max(12, { message: 'Kuyu indeksi en fazla 12 olabilir.' })
  pitIndex!: number;
}
