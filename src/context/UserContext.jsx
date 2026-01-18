import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // Dados do Firestore (Staff ou Owner)
    const [role, setRole] = useState(null); // 'professional', 'staff', 'admin', 'client'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cleanupSnapshot = () => { };

        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            // Limpar subscrição anterior se houver mudança de user
            cleanupSnapshot();

            setUser(currentUser);
            if (currentUser) {
                setLoading(true);
                try {
                    // 1. Tentar ler Staff Lookup (Leitura única para detetar papel)
                    const lookupRef = doc(db, "staff_lookup", currentUser.uid);
                    const lookupSnap = await getDoc(lookupRef);

                    if (lookupSnap.exists()) {
                        // É STAFF
                        const { ownerId, staffId } = lookupSnap.data();
                        const staffRef = doc(db, `professionals/${ownerId}/staff/${staffId}`);

                        // Subscrever atualizações em tempo real para o Staff
                        cleanupSnapshot = onSnapshot(staffRef, (docSnap) => {
                            if (docSnap.exists()) {
                                const sData = docSnap.data();
                                setProfile({
                                    ...sData,
                                    id: staffId,
                                    ownerId: ownerId,
                                    isStaff: true,
                                    logoUrl: sData.photoUrl, // Normalizar foto para UI
                                    businessName: sData.name,  // Normalizar nome para UI
                                    paymentStatus: 'active'
                                });
                                setRole('staff');
                            } else {
                                console.error("Staff profile not found");
                            }
                            setLoading(false);
                        });
                    } else {
                        // 2. Se não é Staff, ver se é Profissional (Owner)
                        const proRef = doc(db, "professionals", currentUser.uid);
                        const proSnap = await getDoc(proRef);

                        if (proSnap.exists()) {
                            // Subscrever atualizações do Owner
                            cleanupSnapshot = onSnapshot(proRef, (docSnap) => {
                                if (docSnap.exists()) {
                                    setProfile({ ...docSnap.data(), id: currentUser.uid, isStaff: false });
                                    setRole('professional');
                                }
                                setLoading(false);
                            });
                        } else {
                            // 3. Admin ou User sem perfil
                            // Verifica Admin
                            const adminRef = doc(db, "admins", currentUser.uid);
                            const adminSnap = await getDoc(adminRef);
                            if (adminSnap.exists()) {
                                setRole('admin');
                                setProfile(adminSnap.data());
                            } else {
                                // Try to load Client profile
                                const clientRef = doc(db, "clients", currentUser.uid);
                                const clientSnap = await getDoc(clientRef);
                                if (clientSnap.exists()) {
                                    const clientData = clientSnap.data();
                                    setProfile({
                                        ...clientData,
                                        id: currentUser.uid,
                                        logoUrl: clientData.photoURL, // Normalize photo for UI
                                        businessName: clientData.name || currentUser.displayName || 'Cliente'
                                    });
                                    // Subscribe to real-time updates
                                    cleanupSnapshot = onSnapshot(clientRef, (docSnap) => {
                                        if (docSnap.exists()) {
                                            const data = docSnap.data();
                                            setProfile({
                                                ...data,
                                                id: currentUser.uid,
                                                logoUrl: data.photoURL,
                                                businessName: data.name || currentUser.displayName || 'Cliente'
                                            });
                                        }
                                    });
                                }
                                setRole('client');
                            }
                            setLoading(false);
                        }
                    }

                } catch (err) {
                    console.error("UserContext Error:", err);
                    setLoading(false);
                }
            } else {
                setProfile(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            cleanupSnapshot();
        };
    }, []);

    return (
        <UserContext.Provider value={{ user, profile, role, loading }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
