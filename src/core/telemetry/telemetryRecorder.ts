import { v4 as uuidv4 } from 'uuid';
import { TelemetryEvent, TelemetryEventType, GamePhase, RoleId } from '../models/types';

export class TelemetryRecorder {
  private events: TelemetryEvent[] = [];
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  record(
    round: number,
    phase: GamePhase,
    eventType: TelemetryEventType,
    actorId: string,
    actorRole: RoleId | 'system' | 'facilitator',
    data: Record<string, any>
  ): TelemetryEvent {
    const event: TelemetryEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      round,
      phase,
      eventType,
      actorId,
      actorRole,
      data,
    };
    this.events.push(event);
    return event;
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  getEventsByType(type: TelemetryEventType): TelemetryEvent[] {
    return this.events.filter(e => e.eventType === type);
  }

  getEventsByPlayer(playerId: string): TelemetryEvent[] {
    return this.events.filter(e => e.actorId === playerId);
  }

  getEventsByRound(round: number): TelemetryEvent[] {
    return this.events.filter(e => e.round === round);
  }

  clear(): void {
    this.events = [];
  }
}
