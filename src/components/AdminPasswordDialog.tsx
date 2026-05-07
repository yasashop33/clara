import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

const ADMIN_PASSWORD = "umum1234";

interface AdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
}

export default function AdminPasswordDialog({ open, onOpenChange, onSuccess, title = "Verifikasi Admin" }: AdminPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setPassword("");
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setPassword("");
      setError(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Password Admin</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Masukkan password admin"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">Password salah. Silakan coba lagi.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Batal</Button>
            <Button type="submit">Verifikasi</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
