import { useNavigate } from 'react-router-dom';
import { useLicense } from '@/hooks/useLicense';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { LICENSE_CONFIG } from '@/lib/license';

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const { status } = useLicense();
  const navigate = useNavigate();

  if (status.kind === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>
              {status.wasActivated ? 'Subscription Expired' : 'Free Trial Ended'}
            </CardTitle>
            <CardDescription>
              {status.wasActivated
                ? `Your subscription expired on ${status.expiredAt.toLocaleDateString()}.`
                : `Your ${LICENSE_CONFIG.trialDays}-day free trial has ended.`}{' '}
              Renew for ₹{LICENSE_CONFIG.priceInr.toLocaleString('en-IN')}/year to keep using Hotel Manager.
              Your data is safe.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/license')}>Renew / Enter Key</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showTrialBanner = status.kind === 'trial' && status.daysLeft <= 14;
  const showRenewBanner = status.kind === 'active' && status.daysLeft <= 14;

  return (
    <>
      {(showTrialBanner || showRenewBanner) && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              {showTrialBanner
                ? `Free trial: ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left.`
                : `Subscription expires in ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'}.`}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/license')}>
            {showTrialBanner ? 'Subscribe' : 'Renew'}
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
