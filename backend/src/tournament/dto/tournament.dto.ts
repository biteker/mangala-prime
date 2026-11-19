import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum CreateTournamentFormat {
  SWISS = 'SWISS',
  KNOCKOUT = 'KNOCKOUT',
}

export class CreateTournamentDto {
  @IsString()
  @MinLength(3, { message: 'Turnuva adı en az 3 karakter olmalıdır.' })
  @MaxLength(100, { message: 'Turnuva adı en fazla 100 karakter olabilir.' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolName?: string;

  @IsOptional()
  @IsEnum(CreateTournamentFormat)
  format?: CreateTournamentFormat;

  @IsInt()
  @Min(1)
  @Max(12)
  totalRounds!: number;

  @IsInt()
  @IsIn([1, 2], {
    message: 'Set sayısı 1 (tek maç) veya 2 (rövanşlı) olabilir.',
  })
  setsPerMatch!: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  turnTimeLimitSecs?: number;

  @IsBoolean()
  affectsGlobalElo!: boolean;
}

export class JoinTournamentDto {
  @IsString()
  @MinLength(4, { message: 'Katılım kodu en az 4 karakter olmalıdır.' })
  @MaxLength(16)
  joinCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  classLabel?: string;
}

export enum OverridePairingResult {
  P1_WIN = 'P1_WIN',
  P2_WIN = 'P2_WIN',
  DRAW = 'DRAW',
  NO_SHOW_P1 = 'NO_SHOW_P1',
  NO_SHOW_P2 = 'NO_SHOW_P2',
}

export class SetPairingResultDto {
  @IsEnum(OverridePairingResult, {
    message: 'Geçersiz hakem sonuç değeri.',
  })
  result!: OverridePairingResult;
}

export class DisqualifyParticipantDto {
  @IsBoolean()
  disqualified!: boolean;
}

export class StartRoundDto {
  @IsOptional()
  @IsBoolean()
  onlyCheckedIn?: boolean;
}
