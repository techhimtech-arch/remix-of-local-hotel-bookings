import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Booking, Guest, Room, HotelSettings } from '@/types/hotel';
import { downloadInvoice, ensureInvoiceNumber, getPaidAmount } from '@/lib/invoice';
import { Printer, Download, Share2, Copy, Check, Receipt, Building2, User, Calendar, ShieldCheck } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  guest?: Guest;
  room?: Room;
  groupBookings?: { booking: Booking; room?: Room }[] | null;
  settings: HotelSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  open,
  onOpenChange,
  booking,
  guest,
  room,
  groupBookings,
  settings,
}) => {
  const { toast } = useToast();
  const [viewFormat, setViewFormat] = useState<'thermal' | 'a4'>('thermal');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!booking) return null;

  const invNo = ensureInvoiceNumber(booking);
  const items = groupBookings && groupBookings.length > 1 ? groupBookings : [{ booking, room }];
  
  let grandTotal = 0;
  const itemRows = items.map(({ booking: b, room: r }) => {
    const nights = Math.max(1, differenceInDays(parseISO(b.checkOut), parseISO(b.checkIn)));
    const rate = nights ? b.totalAmount / nights : b.totalAmount;
    grandTotal += b.totalAmount;
    return {
      booking: b,
      room: r,
      nights,
      rate,
      total: b.totalAmount,
      desc: r ? `Room ${r.roomNumber} (${r.type})${b.bedNumber ? ` - Bed #${b.bedNumber}` : ''}` : 'Room',
      stayPeriod: `${format(parseISO(b.checkIn), 'dd MMM')} to ${format(parseISO(b.checkOut), 'dd MMM yyyy')}`,
    };
  });

  const totalPaid = items.reduce((s, it) => s + getPaidAmount(it.booking), 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);
  const paymentStatus = balanceDue === 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid';

  // Calculate tax breakdown if taxRate > 0
  const taxRate = settings.taxRate || 0;
  const baseAmount = taxRate > 0 ? grandTotal / (1 + taxRate / 100) : grandTotal;
  const taxAmount = grandTotal - baseAmount;
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;

  const handlePrint = () => {
    window.print();
  };

  const generateWhatsAppMessage = () => {
    const lines = [
      `*🧾 RECEIPT / BILL - ${settings.name.toUpperCase()}*`,
      `Invoice No: ${invNo}`,
      `Date: ${format(new Date(), 'dd MMM yyyy')}`,
      `--------------------------------`,
      `*Guest Name:* ${guest?.name || 'Guest'}`,
      `*Phone:* ${guest?.phone || 'N/A'}`,
      `*Check-in:* ${format(parseISO(booking.checkIn), 'dd MMM yyyy')} (${settings.checkInTime})`,
      `*Check-out:* ${format(parseISO(booking.checkOut), 'dd MMM yyyy')} (${settings.checkOutTime})`,
      `--------------------------------`,
      ...itemRows.map(
        (it) => `• ${it.desc} (${it.nights} night${it.nights > 1 ? 's' : ''}): ₹${it.total.toLocaleString()}`
      ),
      `--------------------------------`,
      `*Grand Total:* ₹${grandTotal.toLocaleString()}`,
      `*Paid Amount:* ₹${totalPaid.toLocaleString()}`,
      `*Balance Due:* ₹${balanceDue.toLocaleString()}`,
      `*Status:* ${paymentStatus.toUpperCase()}`,
      `--------------------------------`,
      `Thank you for staying with us! 🙏`,
      `Phone: ${settings.phone}`,
    ];
    return lines.join('\n');
  };

  const handleWhatsAppShare = () => {
    const text = generateWhatsAppMessage();
    const rawPhone = guest?.phone ? guest.phone.replace(/[^0-9]/g, '') : '';
    const phoneWithCountry = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const url = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied to Clipboard!', description: 'Parchi text copied. You can paste it into SMS or WhatsApp.' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    const withInv = booking.invoiceNumber ? booking : { ...booking, invoiceNumber: invNo };
    downloadInvoice(withInv, guest, room, groupBookings, settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-none print:shadow-none print:border-none print:overflow-visible">
        {/* Top Header & View Mode Selector - Hidden during print */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Receipt className="h-5 w-5 text-primary" />
              Booking Parchi / Bill Preview
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewFormat}
              onValueChange={(v) => v && setViewFormat(v as 'thermal' | 'a4')}
              className="border rounded-lg p-0.5"
            >
              <ToggleGroupItem value="thermal" size="sm" className="text-xs px-2.5">
                Thermal Slip (POS)
              </ToggleGroupItem>
              <ToggleGroupItem value="a4" size="sm" className="text-xs px-2.5">
                Tax Invoice (A4)
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Action Buttons Toolbar - Hidden during print */}
        <div className="print:hidden flex flex-wrap items-center gap-2 bg-muted/40 p-2.5 rounded-lg border my-2">
          <Button size="sm" onClick={handlePrint} className="gap-1.5 shadow-sm">
            <Printer className="h-4 w-4" />
            Print Parchi
          </Button>
          <Button size="sm" variant="outline" onClick={handleWhatsAppShare} className="gap-1.5 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950">
            <Share2 className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="gap-1.5">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCopyText} className="gap-1.5 ml-auto">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </Button>
        </div>

        {/* Printable Area Wrapper */}
        <div ref={printRef} className="print-parchi-container py-2">
          {viewFormat === 'thermal' ? (
            /* THERMAL POS PARCHI VIEW (80mm Style) */
            <div className="mx-auto max-w-[360px] bg-card text-card-foreground border-2 border-dashed border-border rounded-xl p-5 shadow-sm font-mono text-xs space-y-4 print:border-none print:shadow-none print:w-full print:max-w-none">
              {/* Hotel Branding */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-muted-foreground/40">
                <h2 className="font-sans font-extrabold text-base tracking-tight uppercase">{settings.name}</h2>
                {settings.tagline && <p className="text-[11px] font-sans text-muted-foreground">{settings.tagline}</p>}
                <p className="text-[11px] leading-tight">{settings.address}</p>
                <p className="text-[11px]">Ph: {settings.phone}</p>
                {settings.gstNumber && <p className="text-[11px] font-semibold">GSTIN: {settings.gstNumber}</p>}
              </div>

              {/* Receipt Title & Status */}
              <div className="flex items-center justify-between border-b border-dashed border-muted-foreground/40 pb-2">
                <div>
                  <div className="font-bold text-sm">RECEIPT # {invNo}</div>
                  <div className="text-[10px] text-muted-foreground">{format(new Date(), 'dd-MMM-yyyy hh:mm a')}</div>
                </div>
                <Badge variant={paymentStatus === 'Paid' ? 'default' : paymentStatus === 'Partial' ? 'secondary' : 'destructive'} className="text-[10px] uppercase font-bold">
                  {paymentStatus === 'Paid' ? 'PAID' : paymentStatus === 'Partial' ? 'PARTIAL' : 'DUE'}
                </Badge>
              </div>

              {/* Guest Details */}
              <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-muted-foreground/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-bold text-right">{guest?.name || 'Walk-in Guest'}</span>
                </div>
                {guest?.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile:</span>
                    <span>{guest.phone}</span>
                  </div>
                )}
                {guest?.idNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID ({guest.idType}):</span>
                    <span>{guest.idNumber}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Check-In:</span>
                  <span>{format(parseISO(booking.checkIn), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-Out:</span>
                  <span>{format(parseISO(booking.checkOut), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests:</span>
                  <span>{(booking.adults || 1)} Adult{(booking.adults || 1) > 1 ? 's' : ''}{booking.children ? `, ${booking.children} Child` : ''}</span>
                </div>
              </div>

              {/* Particulars Table */}
              <div className="space-y-2 pb-3 border-b border-dashed border-muted-foreground/40">
                <div className="flex justify-between font-bold border-b pb-1 text-[11px]">
                  <span>Item / Room</span>
                  <span>Qty</span>
                  <span>Amount</span>
                </div>
                {itemRows.map((it, idx) => (
                  <div key={idx} className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between font-medium">
                      <span>{it.desc}</span>
                      <span>₹{it.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{it.nights} night(s) @ ₹{it.rate.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Payment Summary */}
              <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-muted-foreground/40">
                {taxRate > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (Excl. Tax):</span>
                      <span>₹{baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST ({taxRate / 2}%):</span>
                      <span>₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST ({taxRate / 2}%):</span>
                      <span>₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-sm font-bold pt-1">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Advance Paid:</span>
                  <span>₹{totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-destructive">
                  <span>Balance Due:</span>
                  <span>₹{balanceDue.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment History Log */}
              {booking.payments && booking.payments.length > 0 && (
                <div className="space-y-1 pb-3 border-b border-dashed border-muted-foreground/40 text-[10px]">
                  <div className="font-bold text-[11px]">Payments Received:</div>
                  {booking.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{format(parseISO(p.date), 'dd/MM/yy')} ({p.method})</span>
                      <span className="font-semibold">₹{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Terms & Footer */}
              <div className="text-center space-y-2 pt-1 text-[10px] text-muted-foreground">
                {settings.terms && (
                  <div className="text-left whitespace-pre-line text-[9px] bg-muted/30 p-2 rounded border border-dashed">
                    <p className="font-bold text-[10px] text-foreground mb-1">Hotel Rules & Terms:</p>
                    {settings.terms}
                  </div>
                )}
                <p className="font-sans font-medium text-foreground pt-1">Thank you for visiting! Safe travels.</p>
                <div className="text-[9px] tracking-wider uppercase font-mono opacity-60">*** COMPUTER GENERATED PARCHI ***</div>
              </div>
            </div>
          ) : (
            /* STANDARD A4 TAX INVOICE VIEW */
            <div className="bg-card text-card-foreground border rounded-xl p-6 sm:p-8 shadow-sm space-y-6 font-sans print:border-none print:shadow-none print:p-0">
              {/* Header */}
              <div className="flex flex-wrap justify-between items-start gap-4 border-b pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">{settings.name}</h1>
                  </div>
                  {settings.tagline && <p className="text-sm text-muted-foreground mt-0.5">{settings.tagline}</p>}
                  <p className="text-xs text-muted-foreground mt-2 max-w-sm">{settings.address}</p>
                  <p className="text-xs text-muted-foreground">Phone: {settings.phone} {settings.email && `| Email: ${settings.email}`}</p>
                  {settings.gstNumber && <p className="text-xs font-semibold text-foreground mt-1">GSTIN: {settings.gstNumber}</p>}
                </div>

                <div className="text-right space-y-1">
                  <Badge variant="outline" className="text-lg font-bold px-3 py-1 border-primary text-primary">
                    TAX INVOICE
                  </Badge>
                  <div className="text-xs font-mono font-semibold pt-1">Invoice #: {invNo}</div>
                  <div className="text-xs text-muted-foreground">Date: {format(new Date(), 'dd MMMM yyyy')}</div>
                  <div className="pt-2">
                    <Badge variant={paymentStatus === 'Paid' ? 'default' : paymentStatus === 'Partial' ? 'secondary' : 'destructive'}>
                      Payment Status: {paymentStatus.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Guest & Stay Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg border">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Guest Details
                  </p>
                  <p className="font-bold text-base">{guest?.name || 'Walk-in Guest'}</p>
                  <p className="text-xs text-muted-foreground">Phone: {guest?.phone || 'N/A'}</p>
                  {guest?.idNumber && <p className="text-xs text-muted-foreground">{guest.idType}: {guest.idNumber}</p>}
                </div>

                <div className="space-y-1 text-sm sm:text-right">
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1 sm:justify-end">
                    <Calendar className="h-3.5 w-3.5" /> Stay Period
                  </p>
                  <p className="font-medium text-sm">
                    {format(parseISO(booking.checkIn), 'dd MMM yyyy')} → {format(parseISO(booking.checkOut), 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check-in: {settings.checkInTime} | Check-out: {settings.checkOutTime}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Guests: {(booking.adults || 1)} Adult(s) {booking.children ? `, ${booking.children} Child(ren)` : ''}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Nights</th>
                      <th className="p-3 text-right">Rate / Night</th>
                      <th className="p-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itemRows.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <p className="font-semibold">{it.desc}</p>
                          <p className="text-xs text-muted-foreground">{it.stayPeriod}</p>
                        </td>
                        <td className="p-3 text-center">{it.nights}</td>
                        <td className="p-3 text-right font-mono">₹{it.rate.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold">₹{it.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary & Tax Calculation */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                <div className="w-full sm:w-1/2 space-y-3">
                  {settings.terms && (
                    <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                      <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Terms & Conditions
                      </p>
                      <p className="whitespace-pre-line leading-relaxed">{settings.terms}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-1/2 space-y-2 text-sm bg-card p-4 rounded-lg border">
                  {taxRate > 0 && (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal (Tax Excl.):</span>
                        <span className="font-mono">₹{baseAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST ({taxRate / 2}%):</span>
                        <span className="font-mono">₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST ({taxRate / 2}%):</span>
                        <span className="font-mono">₹{sgst.toFixed(2)}</span>
                      </div>
                      <div className="border-t my-1"></div>
                    </>
                  )}

                  <div className="flex justify-between text-base font-bold">
                    <span>Grand Total:</span>
                    <span className="font-mono text-primary">₹{grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Advance Paid:</span>
                    <span className="font-mono">₹{totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-destructive border-t pt-2">
                    <span>Balance Amount Due:</span>
                    <span className="font-mono">₹{balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center border-t pt-4 text-xs text-muted-foreground">
                <p>Thank you for staying with us at {settings.name}!</p>
                <p className="text-[10px] mt-0.5">This is a computer-generated tax invoice. No signature required.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
