import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BandService } from './band.service';
import { JsonSchemaService } from './json-schema.service';

@Module({
    imports: [],
    controllers: [AppController],
    providers: [AppService, BandService, JsonSchemaService],
})
export class AppModule {}
