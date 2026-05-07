import { useState } from "react";
import { getApiUrl, setApiUrl, getDefaultApiUrl } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, CheckCircle, Info } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [url, setUrl] = useState(getApiUrl());
  const defaultUrl = getDefaultApiUrl();
  const isUsingDefault = url.trim() === defaultUrl || url.trim() === "";

  const handleSave = () => {
    setApiUrl(url.trim());
    toast({ title: "Berhasil", description: "URL API Google Sheets berhasil disimpan" });
  };

  const handleTest = async () => {
    if (!url.trim()) {
      toast({ title: "Error", description: "Masukkan URL API terlebih dahulu", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`${url.trim()}?action=getBookings`);
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Koneksi Berhasil!", description: `Terhubung. ${data.data?.length || 0} data ditemukan.` });
      } else {
        toast({ title: "Gagal", description: "Respons tidak valid dari API", variant: "destructive" });
      }
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat terhubung ke API. Pastikan URL benar.", variant: "destructive" });
    }
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan API</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hubungkan aplikasi dengan Google Spreadsheet sebagai database
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Link className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-card-foreground">Google Sheets API URL</h2>
            <p className="text-xs text-muted-foreground">URL dari Apps Script Web App yang sudah di-deploy</p>
          </div>
        </div>

        {isUsingDefault && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
            <span>
              <strong>API sudah terhubung otomatis.</strong> URL default sudah tertanam di sistem — database akan ikut di browser manapun tanpa perlu setting ulang.
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label>API URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={defaultUrl}
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave}>
            <CheckCircle className="w-4 h-4 mr-2" /> Simpan
          </Button>
          <Button variant="outline" onClick={handleTest}>
            Test Koneksi
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-card-foreground">Cara Setup</h2>
        <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
          <li>Buat Google Spreadsheet baru dengan 2 sheet: <strong>"Kendaraan"</strong> dan <strong>"Peminjaman"</strong></li>
          <li>Sheet <strong>Kendaraan</strong> — Header: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">id | name | capacity | type | active</code></li>
          <li>Sheet <strong>Peminjaman</strong> — Header: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">id | borrowerName | teamName | keperluan | startDate | endDate | startTime | endTime | carId | carName | status | createdAt</code></li>
          <li>Buka menu <strong>Extensions → Apps Script</strong></li>
          <li>Paste kode Apps Script terbaru untuk CLARA yang sudah mendukung kolom <strong>carName</strong></li>
          <li>Deploy sebagai <strong>Web App</strong> → Anyone can access → Copy URL</li>
          <li>Paste URL di atas dan klik <strong>Simpan</strong></li>
        </ol>
      </div>
    </div>
  );
}
