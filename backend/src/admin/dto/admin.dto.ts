import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIP,
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
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

export class BulkDeleteUsersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Silmek için en az 1 kullanıcı seçmelisiniz.' })
  @IsString({ each: true })
  userIds!: string[];
}

export class UpdateUserProfileDto {
  @IsString()
  @MinLength(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır.' })
  @MaxLength(30, { message: 'Kullanıcı adı en fazla 30 karakter olabilir.' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Kullanıcı adı yalnızca harf, rakam, nokta, tire ve alt çizgi içerebilir.',
  })
  username!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolName?: string;
}

export class BulkCreateUsersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'En az 1 kullanıcı adı girmelisiniz.' })
  @IsString({ each: true })
  usernames!: string[];

  @IsString()
  @MinLength(6, { message: 'Başlangıç şifresi en az 6 karakter olmalıdır.' })
  @MaxLength(72)
  defaultPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolName?: string;
}

export class ResetEloDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
