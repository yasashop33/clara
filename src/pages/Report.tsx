import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cars, fetchBookingsFromSheet, getBookings, updateBookingStatusOnSheet, type Booking } from "@/lib/data";
import { FileBarChart, CheckCircle, XCircle, Clock } from "lucide-react";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";

export default function Report() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(getBookings());
  const [returnAuthDialog, setReturnAuthDialog] = useState(false);
  const [pendingReturnBooking, setPendingReturnBooking] = useState<Booking | null>(null);

  const refreshBookings = async () => {
    const latestBookings = await fetchBookingsFromSheet();
    setBookings(latestBookings);
  };

  useEffect(() => {
    void refreshBookings();
  }, []);

  const approved = bookings.filter((booking) => booking.status === "approved");
  const rejected = bookings.filter((booking) => booking.status === "rejected");
  const pending = bookings.filter((booking) => booking.status === "pending");
  const returned = bookings.filter((booking) => booking.status === "returned");

  const resolveCarName = (booking: Booking) => booking.carName || cars.find((car) => car.id === booking.carId)?.name || "—";

  const handleMarkReturned = async (booking: Booking) => {
    const success = await updateBookingStatusOnSheet(booking.id, "returned", booking.carId, booking.carName);
    await refreshBookings();

    toast(
      success
        ? { title: "Berhasil", description: `${resolveCarName(booking)} ditandai sudah kembali` }
        : { title: "Sinkronisasi gagal", description: "Status lokal berubah, tetapi spreadsheet gagal diperbarui", variant: "destructive" }
    );
  };

  const requestMarkReturned = (booking: Booking) => {
    setPendingReturnBooking(booking);
    setReturnAuthDialog(true);
  };

  const handleReturnVerified = async () => {
    if (!pendingReturnBooking) return;
    setReturnAuthDialog(false);
    await handleMarkReturned(pendingReturnBooking);
    setPendingReturnBooking(null);
  };

  const carUsage = cars.map((car) => ({
    ...car,
    total: bookings.filter((booking) => booking.carId === car.id || booking.carName === car.name).length,
    approvedCount: approved.filter((booking) => booking.carId === car.id || booking.carName === car.name).length,
  }));

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Report Peminjaman</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan dan laporan peminjaman kendaraan dinas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard icon={FileBarChart} label="Total Peminjaman" value={bookings.length} color="bg-primary" />
        <SummaryCard icon={CheckCircle} label="Disetujui" value={approved.length} color="bg-success" />
        <SummaryCard icon={Clock} label="Menunggu" value={pending.length} color="bg-warning" />
        <SummaryCard icon={XCircle} label="Selesai / Ditolak" value={returned.length + rejected.length} color="bg-destructive" />
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-card-foreground text-lg">Penggunaan per Kendaraan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Kendaraan</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Jenis</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Total Dialokasi</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Disetujui</th>
              </tr>
            </thead>
            <tbody>
              {carUsage.map((car) => (
                <tr key={car.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-medium text-card-foreground flex items-center gap-3">
                    <img src={car.image} alt={car.name} className="w-12 h-8 rounded object-cover" loading="lazy" />
                    {car.name}
                  </td>
                  <td className="p-3 text-muted-foreground">{car.type}</td>
                  <td className="p-3 text-muted-foreground">{car.total}</td>
                  <td className="p-3 text-muted-foreground">{car.approvedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-card-foreground text-lg">Riwayat Semua Peminjaman</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Peminjam</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tim</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Keperluan</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Mobil</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tanggal</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Belum ada data</td></tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium text-card-foreground">{booking.borrowerName}</td>
                    <td className="p-3 text-muted-foreground">{booking.teamName}</td>
                    <td className="p-3 text-muted-foreground max-w-[150px] truncate">{booking.keperluan}</td>
                    <td className="p-3 text-muted-foreground">{resolveCarName(booking)}</td>
                    <td className="p-3 text-muted-foreground">{booking.startDate} — {booking.endDate}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        booking.status === "approved" ? "bg-success/10 text-success" :
                         booking.status === "returned" ? "bg-primary/10 text-primary" :
                        booking.status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>
                        {booking.status === "approved" ? "Disetujui" : booking.status === "returned" ? "Sudah Kembali" : booking.status === "rejected" ? "Ditolak" : "Menunggu"}
                      </span>
                    </td>
                     <td className="p-3">
                       {booking.status === "approved" ? (
                          <Button size="sm" variant="outline" onClick={() => requestMarkReturned(booking)}>
                           Mobil Sudah Kembali
                         </Button>
                       ) : (
                         <span className="text-muted-foreground">—</span>
                       )}
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPasswordDialog
        open={returnAuthDialog}
        onOpenChange={(open) => {
          setReturnAuthDialog(open);
          if (!open) setPendingReturnBooking(null);
        }}
        onSuccess={() => void handleReturnVerified()}
        title="Verifikasi Pengembalian Mobil"
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-xl border p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-primary-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
