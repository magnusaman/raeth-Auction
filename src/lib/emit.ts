import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function emitAuctionUpdate(auctionId: string, data: any) {
  emitter.emit(`auction:${auctionId}`, data);
}

export function onAuctionUpdate(
  auctionId: string,
  handler: (data: any) => void
) {
  emitter.on(`auction:${auctionId}`, handler);
  return () => {
    emitter.off(`auction:${auctionId}`, handler);
  };
}

export function emitTournamentUpdate(tournamentId: string, data: any) {
  emitter.emit(`tournament:${tournamentId}`, data);
}

export function onTournamentUpdate(
  tournamentId: string,
  handler: (data: any) => void
) {
  emitter.on(`tournament:${tournamentId}`, handler);
  return () => {
    emitter.off(`tournament:${tournamentId}`, handler);
  };
}
