import readline from 'node:readline';
import { createTikTokConnector } from './lib/tiktok-connector';
import type { WorkerStartConfig } from './lib/protocol';
import { TikTokSession } from './lib/session';
import { createTranslator } from './lib/translators';
import { StdoutNdjsonWriter } from './lib/writer';

async function readConfig(): Promise<WorkerStartConfig> {
  const lineReader = readline.createInterface({
    input: process.stdin,
    terminal: false
  });

  return new Promise<WorkerStartConfig>((resolve, reject) => {
    let settled = false;

    lineReader.once('line', (line) => {
      settled = true;
      lineReader.removeAllListeners('close');
      lineReader.close();

      try {
        resolve(JSON.parse(line) as WorkerStartConfig);
      } catch (error) {
        reject(error);
      }
    });

    lineReader.once('close', () => {
      if (!settled) {
        reject(new Error('未收到会话配置'));
      }
    });
  });
}

async function main() {
  const writer = new StdoutNdjsonWriter();

  try {
    const config = await readConfig();
    const session = new TikTokSession({
      config,
      connector: createTikTokConnector(config),
      translator: createTranslator(
        config.translatorProvider,
        config.translatorConfig
      ),
      writer
    });

    await session.start();

    const shutdown = async () => {
      await session.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    writer.write({
      type: 'error',
      message:
        error instanceof Error ? error.message : 'worker 启动失败，原因未知',
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
}

void main();
