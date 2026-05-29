import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 20, { message: 'Kullanıcı adı 3 ile 20 karakter arasında olmalıdır.' })
  username!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 50, { message: 'Şifre en az 8 karakter olmalıdır.' })
  password!: string;
}
