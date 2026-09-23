// Сервис для работы с резервами товара

import { Reservation } from './types';

const RESERVATIONS_KEY = 'sh_reservations';

export function getAllReservations(): Reservation[] {
  const stored = localStorage.getItem(RESERVATIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getReservationByItemId(itemId: string): Reservation | null {
  const all = getAllReservations();
  return all.find(r => r.itemId === itemId && new Date(r.until) >= new Date()) || null;
}

export function getActiveReservations(): Reservation[] {
  const all = getAllReservations();
  const now = new Date();
  return all.filter(r => new Date(r.until) >= now);
}

export function getExpiredReservations(): Reservation[] {
  const all = getAllReservations();
  const now = new Date();
  return all.filter(r => new Date(r.until) < now);
}

export function getReservationsByClient(clientId: string): Reservation[] {
  return getAllReservations().filter(r => r.clientId === clientId);
}

export function getReservationsByManager(managerId: string): Reservation[] {
  return getAllReservations().filter(r => r.managerId === managerId);
}

export function saveReservation(reservation: Reservation): void {
  const all = getAllReservations();
  // Удаляем старый резерв для этого товара, если есть
  const filtered = all.filter(r => r.itemId !== reservation.itemId);
  filtered.push(reservation);
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(filtered));
}

export function deleteReservation(id: string): void {
  const all = getAllReservations().filter(r => r.id !== id);
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(all));
}

export function extendReservation(id: string, newUntil: string): void {
  const all = getAllReservations();
  const idx = all.findIndex(r => r.id === id);
  if (idx !== -1) {
    all[idx].until = newUntil;
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(all));
  }
}

// Автоматически удалить просроченные резервы (для cleanup)
export function cleanupExpiredReservations(): number {
  const all = getAllReservations();
  const now = new Date();
  const active = all.filter(r => new Date(r.until) >= now);
  const removed = all.length - active.length;
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(active));
  return removed;
}

// Создать новый резерв
export function createReservation(params: {
  itemId: string;
  productName: string;
  shortName: string;
  batchCode: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  until: string;
  notes?: string;
  managerId: string;
  managerName: string;
}): Reservation {
  const reservation: Reservation = {
    ...params,
    id: `res-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  saveReservation(reservation);
  return reservation;
}
