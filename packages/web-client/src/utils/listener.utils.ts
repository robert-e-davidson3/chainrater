import { EventEmitter } from "events";

export class ListenerManager {
  private listeners = new Set<{
    emitter: EventEmitter;
    eventName: string;
    callback: Callback;
  }>();

  add(emitter: EventEmitter, eventName: string, callback: Callback): void;
  add(emitter: EventEmitter, eventNames: string[], callback: Callback): void;
  add(
    emitter: EventEmitter,
    eventNameOrNames: string | string[],
    callback: Callback,
  ) {
    const eventNames =
      typeof eventNameOrNames === "string"
        ? [eventNameOrNames]
        : eventNameOrNames;
    for (const eventName of eventNames) {
      this.listeners.add({ emitter, eventName, callback });
      emitter.on(eventName, callback);
    }
  }

  remove(emitter: EventEmitter, eventName: string, callback: Callback): void;
  remove(emitter: EventEmitter, eventNames: string[], callback: Callback): void;
  remove(
    emitter: EventEmitter,
    eventNameOrNames: string | string[],
    callback: Callback,
  ): void {
    const eventNames =
      typeof eventNameOrNames === "string"
        ? [eventNameOrNames]
        : eventNameOrNames;
    for (const eventName of eventNames) {
      this.listeners.delete({ emitter, eventName, callback });
      emitter.off(eventName, callback);
    }
  }

  clear() {
    const listeners = Array.from(this.listeners);
    this.listeners.clear();
    for (const { emitter, eventName, callback } of listeners)
      emitter.off(eventName, callback);
  }
}

export type Callback = (...args: any[]) => void;
