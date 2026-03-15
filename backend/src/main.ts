import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

BigInt.prototype.toJSON = function() {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' })); 
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  app.enableShutdownHooks();

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['*'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`✅ Server running on port ${port}`);
  console.log(`🔥 CORS полностью открыт для всех доменов!`);
  console.log(`🤖 Бот запускается в фоновом режиме...`);

  // Не ждём завершения бота
  process.nextTick(() => {
    console.log('✅ Приложение полностью готово к работе');
  });
}

bootstrap();