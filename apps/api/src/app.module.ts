import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// Controllers
import { OcrController } from './controllers/ocr.controller';
import { BgController } from './controllers/bg.controller';
import { EnhanceController } from './controllers/enhance.controller';
import { PdfController } from './controllers/pdf.controller';
import { HealthController } from './controllers/health.controller';

// Services
import { OcrService } from './services/ocr.service';
import { BgService } from './services/bg.service';
import { EnhanceService } from './services/enhance.service';
import { PdfService } from './services/pdf.service';

// Clients
import { OcrClient } from './microservices/ocr.client';
import { BgClient } from './microservices/bg.client';
import { EnhanceClient } from './microservices/enhance.client';
import { PdfClient } from './microservices/pdf.client';

@Module({
  imports: [],
  controllers: [
    OcrController,
    BgController,
    EnhanceController,
    PdfController,
    HealthController,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Services
    OcrService,
    BgService,
    EnhanceService,
    PdfService,
    // Clients
    OcrClient,
    BgClient,
    EnhanceClient,
    PdfClient,
  ],
})
export class AppModule { }
