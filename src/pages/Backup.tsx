import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, AlertTriangle, ShieldCheck, Loader2, FileSpreadsheet, Users, CalendarCheck, Receipt } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { encryptBackup, decryptAndRestore } from '@/lib/backup';
import { useHotelData } from '@/hooks/useHotelData';
import { exportBookingsToCSV, exportGuestsToCSV, exportExpensesToCSV } from '@/lib/export';

const Backup = () => {
  const { bookings, guests, expenses, getGuestById, getRoomById } = useHotelData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportPwd, setExportPwd] = useState('');
  const [exportPwd2, setExportPwd2] = useState('');
  const [importPwd, setImportPwd] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const handleExport = async () => {
    if (exportPwd.length < 6) {
      toast({ title: 'Weak password', description: 'Use at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (exportPwd !== exportPwd2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    try {
      setBusy('export');
      const blob = await encryptBackup(exportPwd);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotel-backup-${new Date().toISOString().slice(0, 10)}.hbm`;
      a.click();
      URL.revokeObjectURL(url);
      setExportPwd('');
      setExportPwd2('');
      toast({ title: 'Encrypted backup downloaded', description: 'Keep the password safe — you will need it to restore.' });
    } catch (e) {
      toast({ title: 'Export failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setPendingFile(f ?? null);
  };

  const handleImport = async () => {
    if (!pendingFile) {
      toast({ title: 'Choose a backup file first', variant: 'destructive' });
      return;
    }
    if (!importPwd) {
      toast({ title: 'Enter the backup password', variant: 'destructive' });
      return;
    }
    try {
      setBusy('import');
      const count = await decryptAndRestore(pendingFile, importPwd);
      toast({ title: 'Data restored!', description: `${count} data set(s) imported. Reloading...` });
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast({ title: 'Import failed', description: (e as Error).message, variant: 'destructive' });
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backup, Exports & Restore</h1>
        <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Backups are encrypted on your device with AES-256. Excel/CSV exports can be opened in Microsoft Excel or Google Sheets.
        </p>
      </div>

      {/* Excel & CSV Exports Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Excel / CSV Data Exports
          </CardTitle>
          <CardDescription>Export readable spreadsheets for accounting, tax filing, or custom record keeping.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => {
                exportBookingsToCSV(bookings, getGuestById, getRoomById);
                toast({ title: 'Bookings CSV Downloaded', description: `${bookings.length} booking records exported.` });
              }}
              className="gap-2 justify-start h-auto py-3 bg-card"
            >
              <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs">Export Bookings</div>
                <div className="text-[11px] text-muted-foreground">{bookings.length} records</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                exportGuestsToCSV(guests, bookings);
                toast({ title: 'Guests CSV Downloaded', description: `${guests.length} guest profiles exported.` });
              }}
              className="gap-2 justify-start h-auto py-3 bg-card"
            >
              <Users className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs">Export Guests DB</div>
                <div className="text-[11px] text-muted-foreground">{guests.length} profiles</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                exportExpensesToCSV(expenses);
                toast({ title: 'Expenses CSV Downloaded', description: `${expenses.length} expense entries exported.` });
              }}
              className="gap-2 justify-start h-auto py-3 bg-card"
            >
              <Receipt className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs">Export Expenses</div>
                <div className="text-[11px] text-muted-foreground">{expenses.length} entries</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Export Encrypted Backup (.hbm)</CardTitle>
            <CardDescription>Download all hotel data as a password-protected encrypted file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-pwd">Backup password</Label>
              <Input id="exp-pwd" type="password" value={exportPwd} onChange={(e) => setExportPwd(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-pwd2">Confirm password</Label>
              <Input id="exp-pwd2" type="password" value={exportPwd2} onChange={(e) => setExportPwd2(e.target.value)} placeholder="Repeat password" />
            </div>
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span>If you lose this password, the backup <strong>cannot</strong> be recovered. Save it somewhere safe.</span>
            </div>
            <Button onClick={handleExport} className="w-full" disabled={busy !== null}>
              {busy === 'export' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Encrypting...</> : <><Download className="mr-2 h-4 w-4" /> Download Encrypted Backup</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Restore Backup</CardTitle>
            <CardDescription>Import from a previously exported .hbm backup file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span>Restoring will <strong>replace</strong> all current data. Export a backup first if needed.</span>
            </div>
            <div className="space-y-1.5">
              <Label>Backup file</Label>
              <input ref={fileInputRef} type="file" accept=".hbm,.json,application/octet-stream,application/json" className="hidden" onChange={handleFilePick} />
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
                <Upload className="mr-2 h-4 w-4" />
                {pendingFile ? pendingFile.name : 'Choose Backup File'}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imp-pwd">Backup password</Label>
              <Input id="imp-pwd" type="password" value={importPwd} onChange={(e) => setImportPwd(e.target.value)} placeholder="Password used at export" />
            </div>
            <Button onClick={handleImport} className="w-full" disabled={busy !== null || !pendingFile}>
              {busy === 'import' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Decrypting...</> : <>Restore Data</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Backup;

