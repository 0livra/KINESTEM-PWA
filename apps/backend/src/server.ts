import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { postgresService } from './config/postgres';
import { mongoService } from './config/mongo';
import { serialService } from './modules/hardware-gateway/serial.service';
import { hardwareGateway } from './modules/hardware-gateway/hardware.gateway';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  // Protección anti-DoS (Slowloris y retención de conexión)
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  server.timeout = 15000;
  server.keepAliveTimeout = 4000;

  await postgresService.connect();
  await mongoService.connect();
  await serialService.init();
  hardwareGateway.init(server);

  server.listen(env.PORT, env.HOST, () => {
    console.log('='.repeat(60));
    console.log('  KINESTEM Backend & Hardware Gateway');
    console.log(`  Entorno:   ${env.NODE_ENV}`);
    console.log(`  HTTP:      http://${env.HOST}:${env.PORT}`);
    console.log(`  WebSocket: ws://${env.HOST}:${env.PORT}`);
    console.log(`  Health:    http://${env.HOST}:${env.PORT}/api/v1/health`);
    console.log('='.repeat(60));
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[Server] ${signal} recibida. Apagado seguro...`);
    hardwareGateway.close();
    serialService.close();
    server.close(async () => {
      await postgresService.close();
      await mongoService.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Server] Error crítico:', err);
  process.exit(1);
});
