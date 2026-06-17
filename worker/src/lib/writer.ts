import type { WorkerEvent } from './protocol';

export interface EventWriter {
  write(event: WorkerEvent): void;
}

export class StdoutNdjsonWriter implements EventWriter {
  write(event: WorkerEvent) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
}
