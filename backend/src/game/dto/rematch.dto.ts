import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class RematchOfferDto {
  @IsString({ message: 'Maç ID metin olmalıdır.' })
  @IsNotEmpty({ message: 'Maç ID boş olamaz.' })
  matchId!: string;
}

export class RematchResponseDto {
  @IsString({ message: 'Maç ID metin olmalıdır.' })
  @IsNotEmpty({ message: 'Maç ID boş olamaz.' })
  matchId!: string;

  @IsBoolean({ message: 'Yanıt değeri boolean olmalıdır.' })
  accept!: boolean;
}
