import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import {
    format, parseISO, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
    startOfDay, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
    isSameDay, isSameMonth, isToday, getDay
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, User2, Phone, Clock4, ListFilter, Plus } from 'lucide-react';
import Layout from '../components/Layout';
import ManualBookingModal from '../components/ManualBookingModal';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

export default function AgendaPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
    const [schedule, setSchedule] = useState(null);
    const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month', 'list'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchBookings = async (ownerId, userProfile, isStaffUser) => {
        try {
            const allBookings = [];

            if (isStaffUser) {
                // Staff only sees their own bookings
                const bookingsSnap = await getDocs(collection(db, `professionals/${ownerId}/staff/${userProfile.id}/bookings`));
                bookingsSnap.docs.forEach(d => {
                    allBookings.push({
                        id: d.id,
                        ...d.data(),
                        responsibleName: userProfile.name.split(' ')[0],
                        isStaff: true,
                        staffId: userProfile.id
                    });
                });
            } else {
                // Owner sees everything (Owner + All Staff)

                // 1. Fetch Owner Bookings
                const ownerBookingsSnap = await getDocs(collection(db, `professionals/${ownerId}/bookings`));
                ownerBookingsSnap.docs.forEach(d => {
                    allBookings.push({
                        id: d.id,
                        ...d.data(),
                        responsibleName: userProfile.name.split(' ')[0],
                        isStaff: false
                    });
                });

                // 2. Fetch Staff Bookings
                const staffSnap = await getDocs(collection(db, `professionals/${ownerId}/staff`));

                const staffPromises = staffSnap.docs.map(async (staffDoc) => {
                    const staffData = staffDoc.data();
                    const bookingsSnap = await getDocs(collection(db, `professionals/${ownerId}/staff/${staffDoc.id}/bookings`));
                    return bookingsSnap.docs.map(d => ({
                        id: d.id,
                        ...d.data(),
                        responsibleName: staffData.name.split(' ')[0],
                        isStaff: true,
                        staffId: staffDoc.id
                    }));
                });

                const staffBookingsMatrix = await Promise.all(staffPromises);
                staffBookingsMatrix.forEach(bookings => allBookings.push(...bookings));
            }

            setBookings(allBookings);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Check Role Logic
                    let userProfile = null;
                    let isStaffUser = false;
                    let ownerId = user.uid;

                    // 1. Try Professional (Owner)
                    let docSnap = await getDoc(doc(db, "professionals", user.uid));

                    if (docSnap.exists()) {
                        userProfile = { id: user.uid, ...docSnap.data(), role: 'professional' };
                    } else {
                        // 2. Try Staff Lookup
                        const lookupRef = doc(db, "staff_lookup", user.uid);
                        const lookupSnap = await getDoc(lookupRef);
                        if (lookupSnap.exists()) {
                            isStaffUser = true;
                            const lookupData = lookupSnap.data();
                            ownerId = lookupData.ownerId;
                            // Fetch Staff Details
                            const staffDoc = await getDoc(doc(db, `professionals/${ownerId}/staff/${lookupData.staffId}`));
                            if (staffDoc.exists()) {
                                userProfile = {
                                    id: lookupData.staffId,
                                    ...staffDoc.data(),
                                    ownerId: ownerId,
                                    isStaff: true,
                                    role: 'staff' // Force role for Layout
                                };
                            }
                        }
                    }

                    if (userProfile) {
                        setProfile(userProfile);
                        await fetchBookings(ownerId, userProfile, isStaffUser);

                        // Schedule settings
                        const schedulePath = isStaffUser
                            ? `professionals/${ownerId}/staff/${userProfile.id}/settings`
                            : `professionals/${ownerId}/settings`;

                        const scheduleSnap = await getDoc(doc(db, schedulePath, 'schedule'));
                        if (scheduleSnap.exists()) setSchedule(scheduleSnap.data());
                    }
                } catch (err) {
                    console.error("Auth check error:", err);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [refreshTrigger]);

    const refetchBookings = () => {
        if (profile) {
            const ownerId = profile.isStaff ? profile.ownerId : profile.id;
            fetchBookings(ownerId, profile, profile.isStaff);
        }
        setRefreshTrigger(prev => prev + 1);
    };

    // Navigation
    const navigate = (direction) => {
        const add = direction === 'next';
        if (viewMode === 'day' || viewMode === 'list') {
            setSelectedDate(add ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
        } else if (viewMode === 'week') {
            setSelectedDate(add ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
        } else {
            setSelectedDate(add ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1));
        }
    };

    // Get bookings for a specific day
    const getDayBookings = (date) => {
        return bookings
            .filter(b => isSameDay(parseISO(b.date), date))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    // Get week days
    const getWeekDays = () => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    };

    // Get month days
    const getMonthDays = () => {
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start, end });

        // Add padding for first week
        const firstDay = getDay(start);
        const paddingStart = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0
        for (let i = 0; i < paddingStart; i++) {
            days.unshift(subDays(start, paddingStart - i));
        }

        // Add padding for last week
        while (days.length % 7 !== 0) {
            days.push(addDays(end, days.length - eachDayOfInterval({ start, end }).length - paddingStart + 1));
        }

        return days;
    };

    const DAY_MAP = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!profile) return null;

    const currentDayBookings = getDayBookings(selectedDate);

    return (
        <Layout role={profile.role || 'professional'}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Agenda</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.5rem 1rem',
                            background: 'color-mix(in srgb, var(--accent-primary), transparent 90%)',
                            border: '1px solid color-mix(in srgb, var(--accent-primary), transparent 80%)',
                            borderRadius: '10px',
                            color: 'var(--accent-primary)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <Plus size={16} strokeWidth={2.5} /> Nova Marcação
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* View Selector */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        padding: '3px'
                    }}>
                        {[
                            { id: 'day', label: 'Dia' },
                            { id: 'week', label: 'Semana' },
                            { id: 'month', label: 'Mês' },
                            { id: 'list', label: 'Lista' }
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setViewMode(v.id)}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    background: viewMode === v.id ? 'var(--bg-elevated)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '5px',
                                    color: viewMode === v.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.1s ease'
                                }}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>

                    {/* Date Nav */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        padding: '3px'
                    }}>
                        <button onClick={() => navigate('prev')} style={{ padding: '0.375rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ padding: '0 0.75rem', fontSize: '0.8125rem', fontWeight: 500, minWidth: '100px', textAlign: 'center', color: 'var(--text-primary)' }}>
                            {viewMode === 'month'
                                ? format(selectedDate, "MMMM yyyy", { locale: pt })
                                : viewMode === 'week'
                                    ? `${format(getWeekDays()[0], "d MMM", { locale: pt })} - ${format(getWeekDays()[6], "d MMM", { locale: pt })}`
                                    : format(selectedDate, "d MMM", { locale: pt })
                            }
                        </span>
                        <button onClick={() => navigate('next')} style={{ padding: '0.375rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedDate(startOfDay(new Date()))}
                        style={{
                            padding: '0.375rem 0.875rem',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary-hover)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                    >
                        Hoje
                    </button>
                </div>
            </div>

            {/* DAY VIEW */}
            {viewMode === 'day' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
                        </span>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {currentDayBookings.length} marcações
                        </span>
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                        {HOURS.map(hour => {
                            const hourBookings = currentDayBookings.filter(b => parseISO(b.date).getHours() === hour);
                            return (
                                <div key={hour} style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', minHeight: '50px' }}>
                                    <div style={{ width: '50px', padding: '0.25rem', borderRight: '1px solid var(--border-default)', color: 'var(--text-muted)', fontSize: '0.6875rem', textAlign: 'right' }}>
                                        {String(hour).padStart(2, '0')}:00
                                    </div>
                                    <div style={{ flex: 1, position: 'relative', padding: '2px' }}>
                                        {hourBookings.map(b => (
                                            <div key={b.id} style={{
                                                background: b.isStaff ? 'color-mix(in srgb, #ec4899, transparent 92%)' : 'color-mix(in srgb, var(--accent-primary), transparent 92%)',
                                                borderLeft: `3px solid ${b.isStaff ? '#ec4899' : 'var(--accent-primary)'}`,
                                                borderRadius: '4px',
                                                padding: '0.25rem 0.5rem',
                                                marginBottom: '2px',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div>
                                                    <span style={{ fontWeight: 600, color: b.isStaff ? '#ec4899' : 'var(--accent-primary)' }}>{format(parseISO(b.date), 'HH:mm')}</span>
                                                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-primary)' }}>{b.clientName}</span>
                                                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>{b.serviceName}</span>
                                                </div>
                                                {!profile?.isStaff && (
                                                    <div style={{ fontSize: '0.625rem', fontWeight: 600, background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {b.responsibleName}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '700px' }}>
                            {/* Week Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                                <div style={{ padding: '0.5rem', borderRight: '1px solid var(--border-default)' }}></div>
                                {getWeekDays().map((day, i) => (
                                    <div
                                        key={i}
                                        onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                                        style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            borderRight: i < 6 ? '1px solid var(--border-default)' : 'none',
                                            cursor: 'pointer',
                                            background: isToday(day) ? 'color-mix(in srgb, var(--accent-primary), transparent 95%)' : 'transparent',
                                            transition: 'background 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {format(day, 'EEE', { locale: pt })}
                                        </div>
                                        <div style={{
                                            fontSize: '0.9375rem',
                                            fontWeight: isToday(day) ? 700 : 500,
                                            color: isToday(day) ? 'var(--accent-primary)' : 'var(--text-primary)'
                                        }}>
                                            {format(day, 'd')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Week Grid */}
                            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                                {HOURS.map(hour => (
                                    <div key={hour} style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '1px solid var(--border-default)', minHeight: '40px' }}>
                                        <div style={{ padding: '0.125rem 0.25rem', borderRight: '1px solid var(--border-default)', color: 'var(--text-muted)', fontSize: '0.625rem', textAlign: 'right' }}>
                                            {String(hour).padStart(2, '0')}:00
                                        </div>
                                        {getWeekDays().map((day, i) => {
                                            const dayBookings = getDayBookings(day).filter(b => parseISO(b.date).getHours() === hour);
                                            return (
                                                <div
                                                    key={i}
                                                    style={{
                                                        borderRight: i < 6 ? '1px solid var(--border-default)' : 'none',
                                                        padding: '1px',
                                                        background: isToday(day) ? 'rgba(99,102,241,0.02)' : 'transparent'
                                                    }}
                                                >
                                                    {dayBookings.map(b => (
                                                        <div key={b.id} style={{
                                                            background: b.isStaff ? '#ec4899' : 'var(--accent-primary)',
                                                            borderRadius: '3px',
                                                            padding: '2px 4px',
                                                            fontSize: '0.5625rem',
                                                            color: 'white',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            marginBottom: '1px'
                                                        }}>
                                                            {format(parseISO(b.date), 'HH:mm')} • {b.responsibleName}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MONTH VIEW */}
            {viewMode === 'month' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '700px' }}>
                            {/* Month Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                                    <div key={d} style={{ padding: '0.625rem', textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {d}
                                    </div>
                                ))}
                            </div>
                            {/* Month Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                                {getMonthDays().map((day, i) => {
                                    const dayBookings = getDayBookings(day);
                                    const inCurrentMonth = isSameMonth(day, selectedDate);
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                                            style={{
                                                minHeight: '80px',
                                                padding: '0.375rem',
                                                borderBottom: '1px solid var(--border-default)',
                                                borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border-default)' : 'none',
                                                background: isToday(day) ? 'color-mix(in srgb, var(--accent-primary), transparent 95%)' : (!inCurrentMonth ? 'var(--bg-primary)' : 'transparent'),
                                                cursor: 'pointer',
                                                opacity: inCurrentMonth ? 1 : 0.5,
                                                transition: 'background 0.2s ease'
                                            }}
                                            onMouseOver={(e) => inCurrentMonth && (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                            onMouseOut={(e) => e.currentTarget.style.background = isToday(day) ? 'rgba(99,102,241,0.05)' : (!inCurrentMonth ? 'rgba(0,0,0,0.02)' : 'transparent')}
                                        >
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: isToday(day) ? 700 : 500,
                                                color: isToday(day) ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {format(day, 'd')}
                                            </div>
                                            {dayBookings.slice(0, 3).map(b => (
                                                <div key={b.id} style={{
                                                    background: b.isStaff ? '#ec4899' : 'var(--accent-primary)',
                                                    borderRadius: '3px',
                                                    padding: '2px 4px',
                                                    fontSize: '0.5625rem',
                                                    color: 'white',
                                                    marginBottom: '2px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {format(parseISO(b.date), 'HH:mm')} • {b.responsibleName}
                                                </div>
                                            ))}
                                            {dayBookings.length > 3 && (
                                                <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                                                    +{dayBookings.length - 3} mais
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
                        </span>
                    </div>
                    {currentDayBookings.length === 0 ? (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <CalendarDays size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p style={{ fontSize: '0.9375rem' }}>Nenhuma marcação registada para este dia.</p>
                        </div>
                    ) : (
                        <div>
                            {currentDayBookings.map((b, idx) => (
                                <div key={b.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem 1.25rem',
                                    borderBottom: idx < currentDayBookings.length - 1 ? '1px solid var(--border-default)' : 'none',
                                    transition: 'background 0.2s ease',
                                    background: b.isStaff ? 'rgba(236, 72, 153, 0.02)' : 'transparent'
                                }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = b.isStaff ? 'rgba(236, 72, 153, 0.02)' : 'transparent'}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: b.isStaff
                                            ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(236, 72, 153, 0.05))'
                                            : 'linear-gradient(135deg, var(--bg-elevated), var(--bg-card))',
                                        border: b.isStaff ? '1px solid rgba(236, 72, 153, 0.2)' : '1px solid var(--border-default)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        color: b.isStaff ? '#ec4899' : 'var(--accent-primary)',
                                        flexShrink: 0
                                    }}>
                                        {format(parseISO(b.date), 'HH:mm')}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {b.clientName}
                                            </div>
                                            {!profile?.isStaff && (
                                                <div style={{
                                                    fontSize: '0.625rem',
                                                    fontWeight: 600,
                                                    background: b.isStaff ? '#ec4899' : 'var(--accent-primary)',
                                                    color: 'white',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px'
                                                }}>
                                                    {b.responsibleName}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            {b.serviceName} • {b.duration}min • <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{b.price}€</span>
                                        </div>
                                    </div>
                                    {b.clientPhone && (
                                        <a href={`tel:${b.clientPhone}`} style={{
                                            padding: '0.625rem',
                                            background: 'rgba(34,197,94,0.1)',
                                            borderRadius: '10px',
                                            color: 'var(--accent-success)',
                                            transition: 'all 0.2s ease'
                                        }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.2)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
                                        >
                                            <Phone size={18} strokeWidth={1.75} />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* Manual Booking Modal */}
            <ManualBookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                professionalId={profile.id}
                isStaff={profile.isStaff}
                ownerId={profile.ownerId}
                onBookingAdded={refetchBookings}
            />
        </Layout>
    );
}
