import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHotelData } from '@/hooks/useHotelData';
import { BedDouble, BedSingle, DollarSign, TrendingUp, LogIn, LogOut, TrendingDown, PiggyBank, Receipt } from 'lucide-react';
import { format, isToday, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ReceiptModal } from '@/components/ReceiptModal';
import { ensureInvoiceNumber } from '@/lib/invoice';
import { Booking } from '@/types/hotel';


const Dashboard = () => {
  const { rooms, bookings, expenses, getGuestById, getRoomById, getAvailableBeds, hotelSettings, updateBooking } = useHotelData();

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<Booking | null>(null);

  const openReceipt = (booking: Booking) => {
    const withInv = booking.invoiceNumber ? booking : { ...booking, invoiceNumber: ensureInvoiceNumber(booking) };
    if (!booking.invoiceNumber) updateBooking(withInv);
    setSelectedReceiptBooking(withInv);
    setReceiptOpen(true);
  };

  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const occupied = rooms.filter((r) => r.status === 'Occupied').length;
    const available = rooms.filter((r) => r.status === 'Available').length;

    // Count total beds and available beds for dormitories
    const dormRooms = rooms.filter((r) => r.type === 'Dormitory');
    const totalDormBeds = dormRooms.reduce((s, r) => s + (r.totalBeds || 0), 0);
    const availDormBeds = dormRooms.reduce((s, r) => s + getAvailableBeds(r.id).length, 0);

    const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

    const todayCheckIns = bookings.filter(
      (b) => b.status === 'Confirmed' && isToday(parseISO(b.checkIn))
    );
    const todayCheckOuts = bookings.filter(
      (b) => b.status === 'Checked-in' && isToday(parseISO(b.checkOut))
    );

    const monthStart = startOfMonth(new Date());
    const monthRevenue = bookings
      .filter((b) => b.status !== 'Cancelled' && isWithinInterval(parseISO(b.checkIn), { start: monthStart, end: endOfMonth(new Date()) }))
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const monthExpenses = expenses
      .filter((e) => isWithinInterval(parseISO(e.date), { start: monthStart, end: endOfMonth(new Date()) }))
      .reduce((sum, e) => sum + e.amount, 0);

    const profit = monthRevenue - monthExpenses;

    // Housekeeping stats
    const dirtyRooms = rooms.filter((r) => r.housekeepingStatus === 'Dirty').length;
    const cleaningRooms = rooms.filter((r) => r.housekeepingStatus === 'Cleaning').length;

    return {
      totalRooms, occupied, available, occupancyRate,
      todayCheckIns, todayCheckOuts,
      monthRevenue, monthExpenses, profit,
      totalDormBeds, availDormBeds,
      dirtyRooms, cleaningRooms,
    };
  }, [rooms, bookings, expenses, getAvailableBeds]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{hotelSettings.name}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRooms}</div>
            <p className="text-xs text-muted-foreground">{stats.available} available · {stats.occupied} occupied</p>
            {stats.totalDormBeds > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <BedSingle className="inline h-3 w-3 mr-0.5" />
                {stats.availDormBeds}/{stats.totalDormBeds} dorm beds free
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.occupancyRate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCheckIns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-outs</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCheckOuts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* P&L row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.monthRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{stats.monthExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit / Loss</CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{stats.profit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Housekeeping alert */}
      {(stats.dirtyRooms > 0 || stats.cleaningRooms > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 text-sm">
              {stats.dirtyRooms > 0 && (
                <span className="font-medium text-amber-800">
                  {stats.dirtyRooms} room{stats.dirtyRooms > 1 ? 's' : ''} need cleaning
                </span>
              )}
              {stats.cleaningRooms > 0 && (
                <span className="font-medium text-sky-700">
                  {stats.cleaningRooms} room{stats.cleaningRooms > 1 ? 's' : ''} being cleaned
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><LogIn className="h-4 w-4" /> Today's Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.todayCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins today</p>
            ) : (
              <div className="space-y-3">
                {stats.todayCheckIns.map((b) => {
                  const guest = getGuestById(b.guestId);
                  const room = getRoomById(b.roomId);
                  return (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{guest?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">Room {room?.roomNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openReceipt(b)}>
                          <Receipt className="h-3.5 w-3.5 text-primary" /> Parchi
                        </Button>
                        <Badge>Confirmed</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><LogOut className="h-4 w-4" /> Today's Check-outs</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.todayCheckOuts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-outs today</p>
            ) : (
              <div className="space-y-3">
                {stats.todayCheckOuts.map((b) => {
                  const guest = getGuestById(b.guestId);
                  const room = getRoomById(b.roomId);
                  return (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{guest?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">Room {room?.roomNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openReceipt(b)}>
                          <Receipt className="h-3.5 w-3.5 text-primary" /> Parchi
                        </Button>
                        <Badge variant="secondary">Checked-in</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Modal */}
      {selectedReceiptBooking && (
        <ReceiptModal
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          booking={selectedReceiptBooking}
          guest={getGuestById(selectedReceiptBooking.guestId)}
          room={getRoomById(selectedReceiptBooking.roomId)}
          groupBookings={
            selectedReceiptBooking.groupId
              ? bookings
                  .filter((x) => x.groupId === selectedReceiptBooking.groupId)
                  .map((x) => ({ booking: x, room: getRoomById(x.roomId) }))
              : null
          }
          settings={hotelSettings}
        />
      )}
    </div>
  );
};

export default Dashboard;

