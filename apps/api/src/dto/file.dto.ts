import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class FileDto {
    @IsNotEmpty()
    fieldname: string;

    @IsNotEmpty()
    originalname: string;

    @IsNotEmpty()
    encoding: string;

    @IsNotEmpty()
    mimetype: string;

    @IsNotEmpty()
    buffer: Buffer;

    @IsNumber()
    size: number;
}

export class ProtectDto {
    @IsNotEmpty()
    @IsString()
    password: string;
}

export class UnlockDto {
    @IsNotEmpty()
    @IsString()
    password: string;
}

export class SplitDto {
    @IsNotEmpty()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @Min(1)
    start: number;

    @IsNotEmpty()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @Min(1)
    end: number;
}
