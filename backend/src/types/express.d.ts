import 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: bigint;
      telegramId: bigint;
      firstName: string;
      lastName: string;
      username: string;
    };
  }
}