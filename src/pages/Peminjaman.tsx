import { useEffect, useState } from "react";
import {
  cars,
  fetchBookingsFromSheet,
  getBookings,
  saveBookingToSheet,
  updateBookingOnSheet,
  updateBookingStatusOnSheet,
  type Booking,
} from "@/lib/data";
import { isCarAvailableForPeriod } from "@/lib/booking-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Car, Pencil } from "lucide-react";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";

export default function Peminjaman() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(getBookings());
  const [form, setForm] = useState({
    borrowerName: "",
    teamName: "",
    anggotaTim: "",
    keperluan: "",
    startDate: "",
    endDate: "",
    startTime: "08:00",
    endTime: "17:00",
  });

  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; bookingId: string }>({ open: false, bookingId: "" });
  const [selectedCarId, setSelectedCarId] = useState("");

  const [editDialog, setEditDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [editForm, setEditForm] = useState({ borrowerName: "", teamName: "", anggotaTim: "", keperluan: "", startDate: "", endDate: "", startTime: "", endTime: "" });

  const [editApprovalDialog, setEditApprovalDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [editApprovalCarId, setEditApprovalCarId] = useState("");
  const [editApprovalStatus, setEditApprovalStatus] = useState<Booking["status"]>("pending");

  const [adminAuthDialog, setAdminAuthDialog] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void | Promise<void>) | null>(null);

  const resolveCarName = (carId: string, fallback?: string) => fallback || cars.find((car) => car.id === carId)?.name || "";

  const isCarAllocatable = (carId: string, booking: Pick<Booking, "id" | "startDate" | "endDate" | "startTime" | "endTime">) => {
    return isCarAvailableForPeriod(bookings, carId, booking.startDate, booking.endDate, booking.startTime, booking.endTime, booking.id);
  };

  const getAvailableCars = (booking: Pick<Booking, "id" | "startDate" | "endDate" | "startTime" | "endTime" | "carId">) => {
    return cars.filter((car) => car.id === booking.carId || isCarAllocatable(car.id, booking));
  };

  async function refreshBookings() {
    const latestBookings = await fetchBookingsFromSheet();
    setBookings(latestBookings);
  }

  useEffect(() => {
    void refreshBookings();
  }, []);

  const requireAdmin = (action: () => void | Promise<void>) => {
    setPendingAdminAction(() => action);
    setAdminAuthDialog(true);
  };

  const handleAdminVerified = async () => {
    setAdminAuthDialog(false);
    await pendingAdminAction?.();
    setPendingAdminAction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.borrowerName || !form.teamName || !form.anggotaTim || !form.keperluan || !form.startDate || !form.endDate) {
      toast({ title: "Error", description: "Semua field harus diisi", variant: "destructive" });
      return;
    }

    const booking: Booking = {
      id: crypto.randomUUID(),
      ...form,
      carId: "",
      carName: "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const success = await saveBookingToSheet(booking);
    await refreshBookings();
    setForm({ borrowerName: "", teamName: "", anggotaTim: "", keperluan: "", startDate: "", endDate: "", startTime: "08:00", endTime: "17:00" });

    toast(
      success
        ? { title: "Berhasil", description: "Peminjaman berhasil diajukan dan tersimpan di spreadsheet" }
        : { title: "Sinkronisasi gagal", description: "Data hanya tersimpan lokal, cek API URL atau deployment Apps Script", variant: "destructive" }
    );
  };

  const handleApproveClick = (bookingId: string) => {
    setSelectedCarId("");
    setApprovalDialog({ open: true, bookingId });
  };

  const handleApproveConfirm = async () => {
    if (!selectedCarId) {
      toast({ title: "Error", description: "Pilih mobil yang akan dialokasikan", variant: "destructive" });
      return;
    }

    const booking = bookings.find((item) => item.id === approvalDialog.bookingId);
    if (!booking) return;

    if (!isCarAllocatable(selectedCarId, booking)) {
      toast({ title: "Mobil tidak tersedia", description: "Mobil masih dalam proses peminjaman dan belum bisa diajukan lagi", variant: "destructive" });
      return;
    }

    const selectedCarName = resolveCarName(selectedCarId);
    const success = await updateBookingStatusOnSheet(approvalDialog.bookingId, "approved", selectedCarId, selectedCarName);
    await refreshBookings();
    setApprovalDialog({ open: false, bookingId: "" });

    toast(
      success
        ? { title: "Disetujui", description: `Mobil ${selectedCarName} berhasil dialokasikan dan disimpan di spreadsheet` }
        : { title: "Sinkronisasi gagal", description: "Approval lokal berubah, tetapi spreadsheet gagal diperbarui", variant: "destructive" }
    );
  };

  const handleReject = async (id: string) => {
    const success = await updateBookingStatusOnSheet(id, "rejected", "", "");
    await refreshBookings();

    toast(
      success
        ? { title: "Ditolak", description: "Peminjaman telah ditolak dan diperbarui di spreadsheet" }
        : { title: "Sinkronisasi gagal", description: "Penolakan lokal berubah, tetapi spreadsheet gagal diperbarui", variant: "destructive" }
    );
  };

  const openEditForm = (booking: Booking) => {
    setEditForm({ borrowerName: booking.borrowerName, teamName: booking.teamName, anggotaTim: booking.anggotaTim || "", keperluan: booking.keperluan, startDate: booking.startDate, endDate: booking.endDate, startTime: booking.startTime, endTime: booking.endTime });
    setEditDialog({ open: true, booking });
  };

  const handleEditFormSave = async () => {
    if (!editDialog.booking) return;

    const success = await updateBookingOnSheet(editDialog.booking.id, editForm);
    await refreshBookings();
    setEditDialog({ open: false, booking: null });

    toast(
      success
        ? { title: "Berhasil", description: "Data peminjaman berhasil diperbarui di spreadsheet" }
        : { title: "Sinkronisasi gagal", description: "Perubahan lokal tersimpan, tetapi spreadsheet gagal diperbarui", variant: "destructive" }
    );
  };

  const openEditApproval = (booking: Booking) => {
    setEditApprovalCarId(booking.carId);
    setEditApprovalStatus(booking.status);
    setEditApprovalDialog({ open: true, booking });
  };

  const handleEditApprovalSave = async () => {
    if (!editApprovalDialog.booking) return;
    const carId = editApprovalStatus === "approved" ? editApprovalCarId : "";

    if (editApprovalStatus === "approved" && !carId) {
      toast({ title: "Error", description: "Pilih mobil yang akan dialokasikan", variant: "destructive" });
      return;
    }

    if (editApprovalStatus === "approved" && !isCarAllocatable(carId, editApprovalDialog.booking)) {
      toast({ title: "Mobil tidak tersedia", description: "Mobil masih dalam proses peminjaman dan belum bisa dipakai ulang", variant: "destructive" });
      return;
    }

    const carName = editApprovalStatus === "approved" ? resolveCarName(carId, editApprovalDialog.booking.carName) : "";
    const success = await updateBookingOnSheet(editApprovalDialog.booking.id, { status: editApprovalStatus, carId, carName });
    await refreshBookings();
    setEditApprovalDialog({ open: false, booking: null });

    toast(
      success
        ? { title: "Berhasil", description: "Status approval dan nama mobil berhasil diperbarui di spreadsheet" }
        : { title: "Sinkronisasi gagal", description: "Perubahan approval lokal tersimpan, tetapi spreadsheet gagal diperbarui", variant: "destructive" }
    );
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-warning" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Disetujui";
    if (status === "rejected") return "Ditolak";
    return "Menunggu";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    if (dateStr.includes("T")) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getUTCDate()).padStart(2, "0");
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const year = date.getUTCFullYear();
        return `${day}-${month}-${year}`;
      }
    }
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "—";
    if (timeStr.includes("T")) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        const hours = String(date.getUTCHours()).padStart(2, "0");
        const minutes = String(date.getUTCMinutes()).padStart(2, "0");
        return `${hours}.${minutes}`;
      }
    }
    return timeStr.replace(":", ".");
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Input Peminjaman Mobil</h1>
        <p className="text-muted-foreground text-sm mt-1">Ajukan peminjaman dan kelola persetujuan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-1 bg-card border rounded-xl p-6 space-y-4 shadow-sm h-fit">
          <h2 className="font-semibold text-card-foreground text-lg">Form Peminjaman</h2>
          <div className="space-y-2">
            <Label>Nama Peminjam</Label>
            <Input value={form.borrowerName} onChange={(e) => setForm({ ...form, borrowerName: e.target.value })} placeholder="Nama lengkap" />
          </div>
          <div className="space-y-2">
            <Label>Nama Tim</Label>
            <Input value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} placeholder="Nama tim/bidang" />
          </div>
          <div className="space-y-2">
            <Label>Anggota Tim</Label>
            <Input value={form.anggotaTim} onChange={(e) => setForm({ ...form, anggotaTim: e.target.value })} placeholder="Nama anggota tim" />
          </div>
          <div className="space-y-2">
            <Label>Keperluan</Label>
            <Textarea value={form.keperluan} onChange={(e) => setForm({ ...form, keperluan: e.target.value })} placeholder="Jelaskan keperluan peminjaman" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jam Mulai</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Jam Selesai</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <Button type="submit" className="w-full">Ajukan Peminjaman</Button>
        </form>

        <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-semibold text-card-foreground text-lg">Daftar Peminjaman & Approval</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Peminjam</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tim</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Keperluan</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tanggal</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Jam</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Mobil</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">Belum ada data peminjaman</td></tr>
                ) : (
                  bookings.map((booking) => {
                    const carName = resolveCarName(booking.carId, booking.carName) || "—";
                    return (
                      <tr key={booking.id} className="border-t hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium text-card-foreground">{booking.borrowerName}</td>
                        <td className="p-3 text-muted-foreground">{booking.teamName}</td>
                        <td className="p-3 text-muted-foreground max-w-[150px] truncate">{booking.keperluan}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{formatTime(booking.startTime)} — {formatTime(booking.endTime)}</td>
                        <td className="p-3 text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <Car className="w-4 h-4" /> {carName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1.5">
                            {statusIcon(booking.status)} {statusLabel(booking.status)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {booking.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => requireAdmin(() => handleApproveClick(booking.id))}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Setujui
                                </Button>
                                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => requireAdmin(() => handleReject(booking.id))}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openEditForm(booking)} title="Edit data">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {booking.status !== "pending" && (
                              <Button size="sm" variant="ghost" onClick={() => requireAdmin(() => openEditApproval(booking))} title="Edit approval">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Mobil untuk Dialokasikan</DialogTitle>
          </DialogHeader>
          <Select value={selectedCarId} onValueChange={setSelectedCarId}>
            <SelectTrigger><SelectValue placeholder="Pilih mobil" /></SelectTrigger>
            <SelectContent>
              {getAvailableCars({ ...(bookings.find((item) => item.id === approvalDialog.bookingId) ?? { id: "", startDate: "", endDate: "", startTime: "", endTime: "", carId: "" }) }).map((car) => (
                <SelectItem key={car.id} value={car.id}>{car.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog({ open: false, bookingId: "" })}>Batal</Button>
            <Button onClick={handleApproveConfirm}>Setujui & Alokasi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Data Peminjaman</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Peminjam</Label><Input value={editForm.borrowerName} onChange={(e) => setEditForm({ ...editForm, borrowerName: e.target.value })} /></div>
            <div><Label>Nama Tim</Label><Input value={editForm.teamName} onChange={(e) => setEditForm({ ...editForm, teamName: e.target.value })} /></div>
            <div><Label>Anggota Tim</Label><Input value={editForm.anggotaTim} onChange={(e) => setEditForm({ ...editForm, anggotaTim: e.target.value })} /></div>
            <div><Label>Keperluan</Label><Textarea value={editForm.keperluan} onChange={(e) => setEditForm({ ...editForm, keperluan: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal Mulai</Label><Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} /></div>
              <div><Label>Tanggal Selesai</Label><Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jam Mulai</Label><Input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} /></div>
              <div><Label>Jam Selesai</Label><Input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, booking: null })}>Batal</Button>
            <Button onClick={handleEditFormSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editApprovalDialog.open} onOpenChange={(open) => setEditApprovalDialog({ ...editApprovalDialog, open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Status Approval</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select value={editApprovalStatus} onValueChange={(value) => setEditApprovalStatus(value as Booking["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="returned">Sudah Kembali</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editApprovalStatus === "approved" && (
              <div>
                <Label>Mobil</Label>
                <Select value={editApprovalCarId} onValueChange={setEditApprovalCarId}>
                  <SelectTrigger><SelectValue placeholder="Pilih mobil" /></SelectTrigger>
                  <SelectContent>
                    {getAvailableCars({ ...editApprovalDialog.booking, carId: editApprovalCarId || editApprovalDialog.booking?.carId || "" } as Booking).map((car) => (
                      <SelectItem key={car.id} value={car.id}>{car.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditApprovalDialog({ open: false, booking: null })}>Batal</Button>
            <Button onClick={handleEditApprovalSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminPasswordDialog
        open={adminAuthDialog}
        onOpenChange={(open) => { setAdminAuthDialog(open); if (!open) setPendingAdminAction(null); }}
        onSuccess={handleAdminVerified}
        title="Verifikasi Admin"
      />
    </div>
  );
}
