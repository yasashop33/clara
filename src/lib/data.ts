import innova02Img from "@/assets/innova-02.jpeg";
import innova05Img from "@/assets/innova-05.jpeg";
import teriosImg from "@/assets/terios.jpeg";
import xeniaImg from "@/assets/xenia.jpeg";
import pantherImg from "@/assets/panther.jpeg";
import { isCarAvailableForPeriod } from "@/lib/booking-utils";

export interface Car {
  id: string;
  name: string;
  image: string;
  capacity: number;
  type: string;
}

export interface Booking {
  id: string;
  borrowerName: string;
  teamName: string;
  anggotaTim?: string;
  keperluan: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  carId: string;
  carName?: string;
  status: "pending" | "approved" | "rejected" | "returned";
  createdAt: string;
}

export const cars: Car[] = [
  { id: "innova-02", name: "Toyota Innova 02", image: innova02Img, capacity: 7, type: "MPV" },
  { id: "innova-05", name: "Toyota Innova 05", image: innova05Img, capacity: 7, type: "MPV" },
  { id: "terios-1", name: "Daihatsu Terios", image: teriosImg, capacity: 7, type: "SUV" },
  { id: "xenia-1", name: "Daihatsu Xenia", image: xeniaImg, capacity: 7, type: "MPV" },
  { id: "panther-1", name: "Isuzu Panther", image: pantherImg, capacity: 8, type: "MPV" },
];

const API_URL_KEY = "clara-api-url";
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbyIIBAL0QvKiP5v0npXaLG-92KyUpadnNeHdYfQV0p8w5SSa7Gw6E-X4nNHaQGbVBoD/exec";
const BOOKINGS_KEY = "bps-car-bookings";

function resolveCarName(carId?: string, carName?: string) {
  return carName || cars.find((car) => car.id === carId)?.name || "";
}

function normalizeTime(value?: string): string {
  if (!value) return "";
  if (value.includes("T")) {
    // Extract HH:mm directly from ISO string to avoid timezone shifts
    const match = value.match(/T(\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
  }
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return value;
}

function normalizeDate(value?: string): string {
  if (!value) return "";
  if (value.includes("T")) {
    // Extract YYYY-MM-DD directly from ISO string
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return value;
}

function normalizeBooking(booking: Partial<Booking>): Booking {
  return {
    id: booking.id || "",
    borrowerName: booking.borrowerName || "",
    teamName: booking.teamName || "",
    anggotaTim: booking.anggotaTim || "",
    keperluan: booking.keperluan || "",
    startDate: normalizeDate(booking.startDate),
    endDate: normalizeDate(booking.endDate),
    startTime: normalizeTime(booking.startTime),
    endTime: normalizeTime(booking.endTime),
    carId: booking.carId || "",
    carName: resolveCarName(booking.carId, booking.carName),
    status: (booking.status as Booking["status"]) || "pending",
    createdAt: booking.createdAt || "",
  };
}

export function getApiUrl(): string {
  return localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL;
}

export function setApiUrl(url: string) {
  localStorage.setItem(API_URL_KEY, url);
}

export function getDefaultApiUrl(): string {
  return DEFAULT_API_URL;
}

export async function fetchBookingsFromSheet(): Promise<Booking[]> {
  const url = getApiUrl();
  if (!url) return getBookingsLocal();

  try {
    const res = await fetch(`${url}?action=getBookings`);
    const data = await res.json();
    if (data.status === "success") {
      return (data.data as Partial<Booking>[]).map(normalizeBooking);
    }
    return getBookingsLocal();
  } catch {
    return getBookingsLocal();
  }
}

export async function saveBookingToSheet(booking: Booking): Promise<boolean> {
  const url = getApiUrl();
  const normalizedBooking = normalizeBooking(booking);

  if (!url) {
    saveBookingLocal(normalizedBooking);
    return true;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "addBooking", data: normalizedBooking }),
    });
    const result = await res.json();
    saveBookingLocal(normalizedBooking);
    return result.status === "success";
  } catch {
    saveBookingLocal(normalizedBooking);
    return false;
  }
}

export async function updateBookingStatusOnSheet(
  id: string,
  status: Booking["status"],
  carId?: string,
  carName?: string
): Promise<boolean> {
  const url = getApiUrl();
  const nextCarName = resolveCarName(carId, carName);

  updateBookingStatusLocal(id, status, carId, status === "approved" ? nextCarName : "");
  if (!url) return true;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "updateStatus", data: { id, status, carId: carId || "", carName: status === "approved" ? nextCarName : "" } }),
    });
    const result = await res.json();
    return result.status === "success";
  } catch {
    return false;
  }
}

export async function updateBookingOnSheet(id: string, updates: Partial<Booking>): Promise<boolean> {
  const url = getApiUrl();
  const normalizedUpdates: Partial<Booking> = { ...updates };

  if ("carId" in updates || "carName" in updates) {
    normalizedUpdates.carName = resolveCarName(updates.carId, updates.carName);
  }

  updateBookingLocal(id, normalizedUpdates);
  if (!url) return true;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "updateBooking", data: { id, ...normalizedUpdates } }),
    });
    const result = await res.json();
    return result.status === "success";
  } catch {
    return false;
  }
}

export function getBookingsLocal(): Booking[] {
  const raw = localStorage.getItem(BOOKINGS_KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed.map(normalizeBooking) : [];
}

function saveBookingLocal(booking: Booking) {
  const bookings = getBookingsLocal();
  bookings.push(normalizeBooking(booking));
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function updateBookingStatusLocal(id: string, status: Booking["status"], carId?: string, carName?: string) {
  const bookings = getBookingsLocal().map((booking) =>
    booking.id === id
      ? normalizeBooking({
          ...booking,
          status,
          ...(carId !== undefined ? { carId } : {}),
          ...(carName !== undefined ? { carName } : {}),
        })
      : normalizeBooking(booking)
  );
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function updateBookingLocal(id: string, updates: Partial<Booking>) {
  const bookings = getBookingsLocal().map((booking) =>
    booking.id === id ? normalizeBooking({ ...booking, ...updates }) : normalizeBooking(booking)
  );
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export function getBookings(): Booking[] {
  return getBookingsLocal();
}

export function saveBooking(booking: Booking) {
  saveBookingLocal(booking);
}

export function updateBookingStatus(id: string, status: Booking["status"], carId?: string, carName?: string) {
  updateBookingStatusLocal(id, status, carId, carName);
}

export function updateBooking(id: string, updates: Partial<Booking>) {
  updateBookingLocal(id, updates);
}

export function isCarAvailable(carId: string, startDate: string, endDate: string): boolean {
  return isCarAvailableForPeriod(getBookingsLocal(), carId, startDate, endDate);
}
