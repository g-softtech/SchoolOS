import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // The worker process stays alive to process jobs
  console.log('Notification Worker successfully started.');
}
bootstrap();
