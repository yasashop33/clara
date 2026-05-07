import { useState } from "react";
import SettingsPage from "./SettingsPage";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";

export default function ProtectedSettingsPage() {
  const [verified, setVerified] = useState(false);

  return verified ? (
    <SettingsPage />
  ) : (
    <AdminPasswordDialog
      open
      onOpenChange={() => {}}
      onSuccess={() => setVerified(true)}
      title="Akses Pengaturan API"
    />
  );
}