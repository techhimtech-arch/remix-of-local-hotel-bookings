import { Booking, Guest, Expense, Room } from '@/types/hotel';
import { ensureInvoiceNumber, getPaidAmount, getBalance, getPaymentStatus } from './invoice';
import { format, parseISO } from 'date-fns';

function downloadCSVFile(filename: string, csvContent: string) {
  // Add UTF-8 BOM so Excel opens Hindi/Urdu/Special characters correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(field: any): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportBookingsToCSV(
  bookings: Booking[],
  getGuestById: (id: string) => Guest | undefined,
  getRoomById: (id: string) => Room | undefined
) {
  const headers = [
    'Invoice No',
    'Guest Name',
    'Guest Phone',
    'Guest ID Type',
    'Guest ID Number',
    'Room Number',
    'Room Type',
    'Check In',
    'Check Out',
    'Source',
    'Adults',
    'Children',
    'Total Amount (INR)',
    'Paid Amount (INR)',
    'Balance Due (INR)',
    'Payment Status',
    'Booking Status',
    'Created At',
  ];

  const rows = bookings.map((b) => {
    const guest = getGuestById(b.guestId);
    const room = getRoomById(b.roomId);
    const paid = getPaidAmount(b);
    const bal = getBalance(b);
    const payStat = getPaymentStatus(b);
    const invNo = ensureInvoiceNumber(b);

    return [
      escapeCSV(invNo),
      escapeCSV(guest?.name || 'Unknown'),
      escapeCSV(guest?.phone || ''),
      escapeCSV(guest?.idType || ''),
      escapeCSV(guest?.idNumber || ''),
      escapeCSV(room?.roomNumber || ''),
      escapeCSV(room?.type || ''),
      escapeCSV(format(parseISO(b.checkIn), 'yyyy-MM-dd')),
      escapeCSV(format(parseISO(b.checkOut), 'yyyy-MM-dd')),
      escapeCSV(b.source || 'Walk-in'),
      escapeCSV(b.adults || 1),
      escapeCSV(b.children || 0),
      escapeCSV(b.totalAmount),
      escapeCSV(paid),
      escapeCSV(bal),
      escapeCSV(payStat),
      escapeCSV(b.status),
      escapeCSV(format(parseISO(b.createdAt), 'yyyy-MM-dd HH:mm')),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const filename = `hotel-bookings-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadCSVFile(filename, csvContent);
}

export function exportGuestsToCSV(guests: Guest[], bookings: Booking[]) {
  const headers = ['Guest Name', 'Phone Number', 'ID Type', 'ID Number', 'Total Bookings', 'Total Spent (INR)'];

  const rows = guests.map((g) => {
    const guestBookings = bookings.filter((b) => b.guestId === g.id);
    const totalSpent = guestBookings.reduce((s, b) => s + b.totalAmount, 0);

    return [
      escapeCSV(g.name),
      escapeCSV(g.phone),
      escapeCSV(g.idType),
      escapeCSV(g.idNumber),
      escapeCSV(guestBookings.length),
      escapeCSV(totalSpent),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const filename = `hotel-guests-database-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadCSVFile(filename, csvContent);
}

export function exportExpensesToCSV(expenses: Expense[]) {
  const headers = ['Date', 'Category', 'Vendor', 'Amount (INR)', 'Payment Method', 'Description'];

  const rows = expenses.map((e) => [
    escapeCSV(format(parseISO(e.date), 'yyyy-MM-dd')),
    escapeCSV(e.category),
    escapeCSV(e.vendor || ''),
    escapeCSV(e.amount),
    escapeCSV(e.paymentMethod),
    escapeCSV(e.description),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  const filename = `hotel-expenses-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadCSVFile(filename, csvContent);
}
