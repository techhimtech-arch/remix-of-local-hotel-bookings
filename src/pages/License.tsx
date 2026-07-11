import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useLicense } from '@/hooks/useLicense';
import { generateKey, LICENSE_CONFIG } from '@/lib/license';
import { KeyRound, ShieldCheck, Clock, AlertTriangle, Copy } from 'lucide-react';

export default function License() {
  const { status, tryActivate } = useLicense();
  const [key, setKey] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminDate, setAdminDate] = useState(() => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [generated, setGenerated] = useState<string>('');

  const handleActivate = () => {
    const res = tryActivate(key);
    if (res.ok) {
      toast({ title: 'Activated!', description: `Valid until ${res.expiresAt.toLocaleDateString()}` });
      setKey('');
    } else {
      toast({ title: 'Activation failed', description: res.reason, variant: 'destructive' });
    }
  };

  const handleGenerate = () => {
    const d = new Date(adminDate + 'T23:59:59Z');
    if (isNaN(d.getTime())) {
      toast({ title: 'Invalid date', variant: 'destructive' });
      return;
    }
    setGenerated(generateKey(d));
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">License</h1>
        <p className="text-muted-foreground">Manage your Hotel Manager subscription.</p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.kind === 'active' && <ShieldCheck className="h-5 w-5 text-primary" />}
            {status.kind === 'trial' && <Clock className="h-5 w-5 text-primary" />}
            {status.kind === 'expired' && <AlertTriangle className="h-5 w-5 text-destructive" />}
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {status.kind === 'active' && (
            <>
              <Badge className="bg-primary">Active</Badge>
              <p className="text-sm">
                <span className="font-medium">{status.daysLeft} days</span> remaining · Valid until{' '}
                {status.expiresAt.toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground break-all">Key: {status.key}</p>
            </>
          )}
          {status.kind === 'trial' && (
            <>
              <Badge variant="secondary">Free Trial</Badge>
              <p className="text-sm">
                <span className="font-medium">{status.daysLeft} days</span> left in your{' '}
                {LICENSE_CONFIG.trialDays}-day trial. Ends on {status.expiresAt.toLocaleDateString()}.
              </p>
            </>
          )}
          {status.kind === 'expired' && (
            <>
              <Badge variant="destructive">Expired</Badge>
              <p className="text-sm">
                Your {status.wasActivated ? 'subscription' : 'free trial'} expired on{' '}
                {status.expiredAt.toLocaleDateString()}. Please renew to keep using the app.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pay */}
      <Card>
        <CardHeader>
          <CardTitle>Renew / Subscribe</CardTitle>
          <CardDescription>
            ₹{LICENSE_CONFIG.priceInr.toLocaleString('en-IN')} / year. Pay via UPI and share the transaction ID —
            admin will send you an activation key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">UPI ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{LICENSE_CONFIG.upiId}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(LICENSE_CONFIG.upiId)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">₹{LICENSE_CONFIG.priceInr.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payee</span>
              <span>{LICENSE_CONFIG.payeeName}</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            After payment, email your UPI transaction ID to{' '}
            <span className="font-medium">{LICENSE_CONFIG.supportEmail}</span>. You'll receive your activation
            key within 24 hours.
          </p>
        </CardContent>
      </Card>

      {/* Activate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Enter Activation Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="key">Activation Key</Label>
            <Input
              id="key"
              placeholder="HBM-YYYYMMDD-XXXXXX"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="font-mono"
            />
          </div>
          <Button onClick={handleActivate} disabled={!key.trim()}>
            Activate
          </Button>
        </CardContent>
      </Card>

      {/* Admin — hidden by default */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin tools</CardTitle>
          <CardDescription>Only for the product owner — generate keys for paying customers.</CardDescription>
        </CardHeader>
        <CardContent>
          {!adminOpen ? (
            <Button variant="outline" size="sm" onClick={() => setAdminOpen(true)}>
              Show admin key generator
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry date</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={adminDate}
                  onChange={(e) => setAdminDate(e.target.value)}
                />
              </div>
              <Button onClick={handleGenerate}>Generate key</Button>
              {generated && (
                <div className="rounded-md border p-3 flex items-center justify-between bg-muted/30">
                  <code className="text-sm">{generated}</code>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(generated)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
