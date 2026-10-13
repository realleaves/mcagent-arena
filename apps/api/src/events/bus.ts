import { EventEmitter } from 'node:events';
import type { StoredEvent } from '../db/store.js';
export class EventBus {
  private bus = new EventEmitter();
  constructor() {
    this.bus.setMaxListeners(100);
  }
  publish(e: StoredEvent) {
    this.bus.emit(e.battleId, e);
  }
  subscribe(id: string, listener: (e: StoredEvent) => void) {
    this.bus.on(id, listener);
    return () => this.bus.off(id, listener);
  }
}
