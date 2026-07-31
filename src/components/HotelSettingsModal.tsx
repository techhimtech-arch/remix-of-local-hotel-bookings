import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HotelSettings } from '@/types/hotel';
import { Building2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HotelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: HotelSettings;
  onSave: (settings: Partial<HotelSettings>) => void;
}

export const HotelSettingsModal: React.FC<HotelSettingsModalProps> = ({
  open,
  onOpenChange,
  settings,
  onSave,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<HotelSettings>(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings, open]);

  const handleChange = (key: keyof HotelSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    toast({ title: 'Settings Saved', description: 'Hotel details & bill profile updated successfully.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="h-5 w-5 text-primary" />
            Hotel & Bill Header Settings
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          <div className="space-y-2">
            <Label className="font-semibold">Hotel / Property Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Royal Heritage Hotel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tagline / Subheading</Label>
            <Input
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              placeholder="e.g. Your Home Away From Home"
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Full hotel address..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone / Contact</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@hotel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>GSTIN / Tax ID</Label>
              <Input
                value={formData.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label>Default GST Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={28}
                value={formData.taxRate}
                onChange={(e) => handleChange('taxRate', Number(e.target.value))}
                placeholder="12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Check-in Time</Label>
              <Input
                value={formData.checkInTime}
                onChange={(e) => handleChange('checkInTime', e.target.value)}
                placeholder="12:00 PM"
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out Time</Label>
              <Input
                value={formData.checkOutTime}
                onChange={(e) => handleChange('checkOutTime', e.target.value)}
                placeholder="11:00 AM"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Parchi / Bill Terms & Conditions</Label>
            <Textarea
              value={formData.terms}
              onChange={(e) => handleChange('terms', e.target.value)}
              placeholder="Rules printed at bottom of receipt..."
              rows={4}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-1.5">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
