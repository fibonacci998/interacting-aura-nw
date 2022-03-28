import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BandService } from './band.service';

@Module({
    imports: [],
    controllers: [AppController],
    providers: [AppService, BandService],
})
export class AppModule {}
