import { useEffect, useState } from "react";
import { cars, fetchBookingsFromSheet, type Booking } from "@/lib/data";
import { Car, CheckCircle, XCircle, ClipboardList } from "lucide-react";
import { isBookingApproved } from "@/lib/booking-utils";

const today = new Date().toISOString().split("T")[0];

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetchBookingsFromSheet().then(setBookings);
  }, []);

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const borrowedCarIds = new Set(bookings.filter((b) => isBookingApproved(b.status)).map((b) => b.carId));
  const activeBookings = borrowedCarIds.size;
  const availableCars = cars.filter((car) => !borrowedCarIds.has(car.id)).length;

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard CLARA</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Car Log and Reservation Application — Informasi ketersediaan kendaraan dinas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label="Total Peminjaman" value={totalBookings} color="bg-primary" />
        <StatCard icon={Car} label="Sedang Dipinjam" value={activeBookings} color="bg-destructive" />
        <StatCard icon={CheckCircle} label="Kendaraan Tersedia" value={availableCars} color="bg-success" />
        <StatCard icon={ClipboardList} label="Menunggu Persetujuan" value={pendingBookings} color="bg-warning" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Daftar Kendaraan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => {
            const available = !borrowedCarIds.has(car.id);
            return (
              <div key={car.id} className="bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <img src={car.image} alt={car.name} className="w-full h-44 object-cover" loading="lazy" />
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-card-foreground">{car.name}</h3>
                     <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                         available
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                       {available ? "Tersedia" : "Sedang Dipinjam"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{car.type}</span>
                    <span>•</span>
                    <span>{car.capacity} kursi</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-xl border p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-primary-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
