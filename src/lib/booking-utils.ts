type BookingLike = {
  id?: string;
  carId?: string;
  status: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
};

function normalizeTimeValue(value?: string, fallback = "00:00") {
  if (!value) return fallback;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function toDateTime(date: string, time?: string, fallback?: string) {
  return new Date(`${date}T${normalizeTimeValue(time, fallback)}`);
}

export function isBookingReturned(status: string) {
  return status === "returned";
}

export function isBookingApproved(status: string) {
  return status === "approved";
}

export function isBookingActiveNow(booking: BookingLike, reference = new Date()) {
  if (!isBookingApproved(booking.status)) return false;

  const start = toDateTime(booking.startDate, booking.startTime, "00:00");
  const end = toDateTime(booking.endDate, booking.endTime, "23:59");

  return start <= reference && end >= reference;
}

export function isCarAvailableForPeriod(
  bookings: BookingLike[],
  carId: string,
  _startDate: string,
  _endDate: string,
  _startTime?: string,
  _endTime?: string,
  excludeBookingId?: string
) {
  // Sebuah mobil dianggap tidak tersedia jika masih ada peminjaman yang
  // sudah disetujui (approved) dan belum dikembalikan (returned), tanpa
  // memperhatikan tanggal/jam — sehingga mobil yang belum kembali tidak
  // dapat dialokasikan untuk peminjaman baru.
  return !bookings.some((booking) => {
    if (booking.id === excludeBookingId) return false;
    if (booking.carId !== carId) return false;
    return isBookingApproved(booking.status);
  });
}