import pino from 'pino';
import pinoPretty from 'pino-pretty';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const transport = IS_PRODUCTION
  ? undefined
  : pinoPretty({
      colorize: true,
      translateTime: 'SYS HH:MM:ss.l',
      ignore: 'pid,hostname',
    });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers.set-cookie',
      'body.password',
      'body.current_password',
      'body.new_password',
      'body.confirm_password',
      'DATABASE_URL',
      'REDIS_URL',
      'GEMINI_API_KEY',
      'GROQ_API_KEY',
      'OPENAI_API_KEY',
      'S3_SECRET_ACCESS_KEY',
      'SESSION_SECRET',
    ],
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export type Logger = typeof logger;
