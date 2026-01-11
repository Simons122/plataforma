import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Clock, Check, ChevronLeft, ChevronRight, Calendar, Heart, Info } from 'lucide-react';
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter, startOfDay, addDays, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import Layout from '../components/Layout';

const DAY_MAP = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function ClientBooking() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [pro, setPro] = useState(null);
    const [staff, setStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [services, setServices] = useState([]);
    const [schedule, setSchedule] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(null);
    const [clientData, setClientData] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [toast, setToast] = useState(null);
    const [showStaffSelector, setShowStaffSelector] = useState(false);

    // Verificar se está logado e Forçar Login
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Redireciona para login e salva returnTo
                sessionStorage.setItem('returnTo', `/book/${slug}`);
                navigate('/client/auth');
            } else {
                const clientDoc = await getDoc(doc(db, 'clients', user.uid));
                if (clientDoc.exists()) {
                    const clientInfo = clientDoc.data();
                    setClientData({
                        name: clientInfo.name || user.displayName || '',
                        email: clientInfo.email || user.email || '',
                        phone: clientInfo.phone || ''
                    });
                    setCurrentUser(user);
                } else {
                    setClientData({
                        name: user.displayName || '',
                        email: user.email || '',
                        phone: ''
                    });
                    setCurrentUser(user);
                }
            }
        });

        return () => unsubscribe();
    }, [slug, navigate]);

    // Dados do Profissional
    useEffect(() => {
        if (slug) fetchData();
    }, [slug]);

    // Check favorites
    useEffect(() => {
        const checkFavorite = async () => {
            if (currentUser && pro) {
                const clientDoc = await getDoc(doc(db, 'clients', currentUser.uid));
                if (clientDoc.exists()) {
                    const favs = clientDoc.data().favorites || [];
                    setIsFavorite(favs.includes(pro.id));
                }
            }
        };
        checkFavorite();
    }, [currentUser, pro]);

    const fetchData = async () => {
        try {
            const q = query(collection(db, "professionals"), where("slug", "==", slug));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const proDoc = querySnapshot.docs[0];
                const proId = proDoc.id;
                setPro({ id: proId, ...proDoc.data() });

                // Fetch staff members
                const staffSnap = await getDocs(collection(db, `professionals/${proId}/staff`));
                const staffData = await Promise.all(staffSnap.docs.map(async (d) => {
                    const staffId = d.id;
                    const staffScheduleDoc = await getDoc(doc(db, `professionals/${proId}/staff/${staffId}/settings`, 'schedule'));
                    const staffBookingsSnap = await getDocs(collection(db, `professionals/${proId}/staff/${staffId}/bookings`));

                    return {
                        id: staffId,
                        ...d.data(),
                        schedule: staffScheduleDoc.exists() ? staffScheduleDoc.data() : null,
                        bookings: staffBookingsSnap.docs.map(b => ({ id: b.id, ...b.data() }))
                    };
                }));
                setStaff(staffData);

                const servicesSnap = await getDocs(collection(db, `professionals/${proId}/services`));
                setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                const scheduleSnap = await getDoc(doc(db, `professionals/${proId}/settings`, 'schedule'));
                if (scheduleSnap.exists()) {
                    setSchedule(scheduleSnap.data());
                }

                const bookingsSnap = await getDocs(collection(db, `professionals/${proId}/bookings`));
                setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                // Profissional não encontrado -> Redirecionar para Explorar
                console.warn("Profissional não encontrado para o slug:", slug);
                navigate('/client/explore');
            }
        } catch (e) {
            console.error("Erro detalhado no fetchData:", e);
            if (e.code === 'permission-denied') {
                console.warn("⚠️ Permissão negada! Possível bloqueio de leitura em 'bookings' ou 'clients'. Verifique as regras de segurança do Firestore.");
            }
        } finally {
            setLoading(false);
        }
    };

    function generateSlots() {
        if (!selectedService) return [];

        // Use staff schedule and bookings if staff is selected, otherwise use establishment
        const activeSchedule = selectedStaff ? selectedStaff.schedule : schedule;
        const activeBookings = selectedStaff ? selectedStaff.bookings : bookings;

        if (!activeSchedule) return [];

        const dayKey = DAY_MAP[selectedDate.getDay()];
        const daySchedule = activeSchedule[dayKey];

        if (!daySchedule || !daySchedule.enabled) return [];

        const slots = [];
        const [startH, startM] = daySchedule.start.split(':').map(Number);
        const [endH, endM] = daySchedule.end.split(':').map(Number);

        let current = setMinutes(setHours(selectedDate, startH), startM);
        const endTime = setMinutes(setHours(selectedDate, endH), endM);
        const duration = selectedService.duration || 30;

        const isSlotBooked = (slotTime) => {
            return activeBookings.some(booking => {
                const bookingDate = parseISO(booking.date);
                return isSameDay(bookingDate, slotTime) &&
                    bookingDate.getHours() === slotTime.getHours() &&
                    bookingDate.getMinutes() === slotTime.getMinutes();
            });
        };

        while (isBefore(addMinutes(current, duration), endTime) || (isSameDay(addMinutes(current, duration), endTime) && addMinutes(current, duration).getTime() <= endTime.getTime())) {
            const now = new Date();
            if (isSameDay(selectedDate, now) && isBefore(current, now)) {
                current = addMinutes(current, duration);
                continue;
            }

            if (!isSlotBooked(current)) {
                slots.push(new Date(current));
            }
            current = addMinutes(current, duration);
        }

        return slots;
    }
    const slots = generateSlots();

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const toggleFavorite = async () => {
        if (!currentUser || !pro) return;

        try {
            const clientRef = doc(db, 'clients', currentUser.uid);
            const proName = pro.businessName || pro.name;

            if (isFavorite) {
                await updateDoc(clientRef, { favorites: arrayRemove(pro.id) });
                setIsFavorite(false);
                showToast(`${proName} removido dos favoritos.`, 'info');
            } else {
                await updateDoc(clientRef, { favorites: arrayUnion(pro.id) });
                setIsFavorite(true);
                showToast(`${proName} adicionado aos favoritos!`, 'success');
            }
        } catch (error) {
            console.error("Erro ao atualizar favoritos:", error);
        }
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Determine booking path based on staff selection
            const bookingPath = selectedStaff
                ? `professionals/${pro.id}/staff/${selectedStaff.id}/bookings`
                : `professionals/${pro.id}/bookings`;

            // 1. Criar marcação no Firestore
            const bookingData = {
                serviceId: selectedService.id,
                serviceName: selectedService.name,
                price: selectedService.price,
                duration: selectedService.duration,
                date: selectedTime.toISOString(),
                clientName: clientData.name,
                clientEmail: clientData.email,
                clientPhone: clientData.phone,
                status: 'confirmed',
                createdAt: new Date().toISOString()
            };

            // Add staff info if staff is selected
            if (selectedStaff) {
                bookingData.staffId = selectedStaff.id;
                bookingData.staffName = selectedStaff.name;
            }

            const bookingRef = await addDoc(collection(db, bookingPath), bookingData);

            // 2. Enviar email
            try {
                const bookingDate = new Date(selectedTime);
                const formattedDate = format(bookingDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
                const formattedTime = format(bookingDate, 'HH:mm');
                const apiUrl = import.meta.env.PROD ? '/api/send-booking-email' : 'http://localhost:3001/api/send-booking-email';

                await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientEmail: clientData.email,
                        clientName: clientData.name,
                        professionalName: selectedStaff ? selectedStaff.name : pro.name,
                        businessName: pro.businessName || pro.name,
                        serviceName: selectedService.name,
                        bookingDate: formattedDate,
                        bookingTime: formattedTime,
                        price: selectedService.price,
                        bookingId: bookingRef.id
                    })
                });
            } catch (emailError) {
                console.error('Erro ao enviar email:', emailError);
            }

            setStep(4);
        } catch (e) {
            console.error(e);
            alert("Erro ao marcar. Tente novamente.");
        } finally {
            setSubmitting(false);
        }
    };

    const getDateOptions = () => {
        const dates = [];
        for (let i = 0; i < 14; i++) {
            dates.push(addDays(startOfDay(new Date()), i));
        }
        return dates;
    };

    // Render Loading ou Spinner de Redirect
    if (loading || !currentUser || !pro) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // Se chegou aqui, temos currentUser E pro -> Renderiza Layout
    return (
        <Layout role="client" brandName={currentUser.displayName || currentUser.email?.split('@')[0]}>
            <div style={{ paddingBottom: '2rem' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative' }}>

                    {/* Toast */}
                    {toast && (
                        <div className="animate-fade-in-down" style={{
                            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                            background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '50px',
                            boxShadow: 'var(--shadow-lg)', zIndex: 2000, display: 'flex', alignItems: 'center',
                            gap: '10px', border: '1px solid var(--border-default)', minWidth: '300px', justifyContent: 'center'
                        }}>
                            {toast.type === 'success' ? <Check size={18} color="var(--accent-success)" /> : <Info size={18} color="var(--accent-primary)" />}
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{toast.message}</span>
                        </div>
                    )}

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="animate-fade-in">
                        <div style={{
                            width: '80px', height: '80px', margin: '0 auto 1rem',
                            background: pro.logoUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', fontWeight: 700, boxShadow: 'var(--shadow-glow)', color: 'white',
                            overflow: 'hidden', padding: '3px'
                        }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {pro.logoUrl ? (
                                    <img src={pro.logoUrl} alt={pro.businessName || pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    (pro.businessName || pro.name).charAt(0).toUpperCase()
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                {pro.businessName || pro.name}
                            </h1>
                            <button
                                onClick={toggleFavorite}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: isFavorite ? 'var(--accent-danger)' : 'var(--text-muted)',
                                    padding: '4px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s',
                                    transform: isFavorite ? 'scale(1.1)' : 'scale(1)'
                                }}
                            >
                                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
                            </button>
                        </div>
                        {pro.businessName && <p style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{pro.name}</p>}
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 500 }}>{pro.profession}</p>
                    </div>

                    {/* Progress Bar */}
                    {step < 4 && (
                        <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', marginBottom: '2rem', overflow: 'hidden' }}>
                            <div style={{ width: `${(step / 3) * 100}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.4s ease' }} />
                        </div>
                    )}


                    {/* Main Card */}
                    <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-default)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ padding: '1.75rem' }}>
                            {/* Step 1: Choose Professional & Service */}
                            {step === 1 && (
                                <div className="animate-fade-in">
                                    {/* Professional Selector - Inside Card */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        {/* Selected Professional Bar */}
                                        <button
                                            onClick={() => staff.length > 0 && setShowStaffSelector(!showStaffSelector)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.875rem 1rem',
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '12px',
                                                cursor: staff.length > 0 ? 'pointer' : 'default',
                                                transition: 'all 0.2s ease',
                                                boxShadow: showStaffSelector ? 'var(--shadow-sm)' : 'none'
                                            }}
                                            className={staff.length > 0 ? "hover:border-[var(--accent-primary)]" : ""}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: selectedStaff
                                                        ? (selectedStaff.photoUrl ? 'transparent' : 'linear-gradient(135deg, #a855f7, #ec4899)')
                                                        : (pro.logoUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), #60a5fa)'),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    color: 'white',
                                                    overflow: 'hidden',
                                                    border: '2px solid var(--bg-card)',
                                                    flexShrink: 0
                                                }}>
                                                    {selectedStaff ? (
                                                        selectedStaff.photoUrl ? (
                                                            <img src={selectedStaff.photoUrl} alt={selectedStaff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            selectedStaff.name?.charAt(0).toUpperCase()
                                                        )
                                                    ) : (
                                                        pro.logoUrl ? (
                                                            <img src={pro.logoUrl} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            pro.name?.charAt(0).toUpperCase()
                                                        )
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {selectedStaff ? selectedStaff.name : pro.name}
                                                    </div>
                                                </div>
                                            </div>
                                            {staff.length > 0 && (
                                                <ChevronRight
                                                    size={18}
                                                    style={{
                                                        color: 'var(--text-muted)',
                                                        transition: 'transform 0.2s',
                                                        transform: showStaffSelector ? 'rotate(90deg)' : 'rotate(0deg)'
                                                    }}
                                                />
                                            )}
                                        </button>

                                        {/* Expanded Professional Options */}
                                        {showStaffSelector && staff.length > 0 && (
                                            <div
                                                className="animate-fade-in"
                                                style={{
                                                    marginTop: '0.75rem',
                                                    background: 'var(--bg-elevated)',
                                                    border: '1px solid var(--border-default)',
                                                    borderRadius: '12px',
                                                    padding: '0.75rem',
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                                    gap: '0.625rem'
                                                }}
                                            >
                                                {/* Establishment Owner */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedStaff(null);
                                                        setShowStaffSelector(false);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.625rem',
                                                        background: !selectedStaff ? 'var(--bg-card)' : 'var(--bg-secondary)',
                                                        border: !selectedStaff ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        textAlign: 'left'
                                                    }}
                                                    className="hover:bg-[var(--bg-card)]"
                                                >
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: pro.logoUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 700,
                                                        color: 'white',
                                                        overflow: 'hidden',
                                                        flexShrink: 0
                                                    }}>
                                                        {pro.logoUrl ? (
                                                            <img src={pro.logoUrl} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            pro.name?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {pro.name}
                                                    </div>
                                                </button>

                                                {/* Staff Members */}
                                                {staff.map(member => (
                                                    <button
                                                        key={member.id}
                                                        onClick={() => {
                                                            setSelectedStaff(member);
                                                            setShowStaffSelector(false);
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.625rem',
                                                            background: selectedStaff?.id === member.id ? 'var(--bg-card)' : 'var(--bg-secondary)',
                                                            border: selectedStaff?.id === member.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            textAlign: 'left'
                                                        }}
                                                        className="hover:bg-[var(--bg-card)]"
                                                    >
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: member.photoUrl ? 'transparent' : 'linear-gradient(135deg, #a855f7, #ec4899)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 700,
                                                            color: 'white',
                                                            overflow: 'hidden',
                                                            flexShrink: 0
                                                        }}>
                                                            {member.photoUrl ? (
                                                                <img src={member.photoUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                member.name?.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {member.name}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Escolha um serviço</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                        {services.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum serviço disponível.</p>
                                        ) : services.map(service => (
                                            <button key={service.id} onClick={() => { setSelectedService(service); setStep(2); }} style={{ textAlign: 'left', padding: '1.125rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="hover:border-[var(--accent-primary)] hover:bg-[var(--bg-elevated)]">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{service.name}</span>
                                                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-success)' }}>{service.price}€</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}><Clock size={14} />{service.duration} min</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Choose Date and Time */}
                            {step === 2 && (
                                <div className="animate-fade-in">
                                    <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem', padding: 0 }}><ChevronLeft size={16} /> Voltar</button>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Escolha data e horário</h2>
                                    <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                        {getDateOptions().map((date, i) => {
                                            const isSelected = isSameDay(date, selectedDate);
                                            const dayKey = DAY_MAP[date.getDay()];
                                            const isOpen = schedule && schedule[dayKey]?.enabled;
                                            return (
                                                <button key={i} onClick={() => isOpen && setSelectedDate(date)} disabled={!isOpen} style={{ flexShrink: 0, padding: '0.875rem', minWidth: '64px', background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)', border: '1px solid', borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-default)', borderRadius: '12px', cursor: isOpen ? 'pointer' : 'not-allowed', opacity: isOpen ? 1 : 0.4, textAlign: 'center', transition: 'all 0.2s ease', boxShadow: isSelected ? 'var(--shadow-glow)' : 'none' }}>
                                                    <div style={{ fontSize: '0.625rem', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '0.05em' }}>{format(date, 'EEE', { locale: pt })}</div>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: isSelected ? '#fff' : 'var(--text-primary)' }}>{format(date, 'd')}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horários - {format(selectedDate, "d 'de' MMMM", { locale: pt })}</h3>
                                    {!schedule ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>O profissional ainda não definiu os horários.</p> : slots.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum horário disponível neste dia.</p> : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
                                            {slots.map((slot, i) => (
                                                <button key={i} onClick={() => { setSelectedTime(slot); setStep(3); }} style={{ padding: '0.875rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }} className="hover:border-[var(--accent-primary)] hover:bg-[var(--bg-elevated)]">{format(slot, 'HH:mm')}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Confirm Details */}
                            {step === 3 && (
                                <div className="animate-fade-in">
                                    <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem', padding: 0 }}><ChevronLeft size={16} /> Voltar</button>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Os seus dados</h2>
                                    <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)', marginBottom: '1.75rem' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resumo da Marcação:</p>
                                        <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedService.name}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}><Calendar size={14} style={{ color: 'var(--accent-primary)' }} /><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{format(selectedTime, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt })}</p></div>
                                    </div>
                                    <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                                        <div><label className="label" style={{ marginBottom: '0.5rem' }}>Nome Completo</label><input type="text" required placeholder="Seu nome" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="input" /></div>
                                        <div><label className="label" style={{ marginBottom: '0.5rem' }}>Email</label><input type="email" required placeholder="seu@email.com" value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })} className="input" /></div>
                                        <div><label className="label" style={{ marginBottom: '0.5rem' }}>Telemóvel</label><input type="tel" required placeholder="9xx xxx xxx" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="input" /></div>
                                        <button type="submit" disabled={submitting} style={{ padding: '1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', marginTop: '0.75rem', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-md)' }} className="hover:bg-[var(--accent-primary-hover)]">{submitting ? 'A confirmar...' : 'Confirmar Reserva'}</button>
                                    </form>
                                </div>
                            )}


                            {/* Step 4: Success */}
                            {step === 4 && (
                                <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
                                    <div style={{ width: '72px', height: '72px', margin: '0 auto 1.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)' }}><Check size={36} strokeWidth={3} /></div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Reserva Confirmada!</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>Enviámos os detalhes para <strong>{clientData.email}</strong>.<br />Obrigado pela sua preferência!</p>
                                    <button onClick={() => navigate('/client/bookings')} style={{ padding: '0.875rem 2rem', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: '12px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }} className="hover:bg-[var(--bg-elevated)]">Ver as minhas marcações</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Powered by <strong style={{ color: 'var(--text-secondary)' }}>Booklyo</strong></p>
                </div>
            </div>
        </Layout>
    );
}
