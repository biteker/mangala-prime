import {
  IsBoolean,
  IsIP,
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSchoolIpDto {
  @IsString()
  @MinLength(2, { message: 'Okul adı en az 2 karakter olmalıdır.' })
  @MaxLength(100, { message: 'Okul adı en fazla 100 karakter olabilir.' })
  schoolName!: string;

  @IsIP(undefined, { message: 'Geçerli bir IPv4 veya IPv6 adresi giriniz.' })
  ipAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class UpdateSchoolIpDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  schoolName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export enum AssignableRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export class UpdateUserRoleDto {
  @IsEnum(AssignableRole, {
    message: 'Rol STUDENT, TEACHER veya ADMIN olmalıdır.',
  })
  role!: AssignableRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolName?: string;
}

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalıdır.' })
  @MaxLength(72, { message: 'Yeni şifre en fazla 72 karakter olabilir.' })
  newPassword!: string;
}

export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  schoolDailyRankedPairLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  defaultTurnTimeLimitSecs?: number;
}
