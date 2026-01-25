import { useUser } from '../context/UserContext';
import Layout from '../components/Layout';
import ScheduleManager from '../components/ScheduleManager';
import { useLanguage } from '../i18n';

export default function SchedulePage() {
    const { profile, loading } = useUser();
    const { t } = useLanguage();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <Layout>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {t('schedule.title', 'Schedule')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {t('schedule.configureDescription', 'Configure the days and times you are available.')}
                </p>
            </div>
            <ScheduleManager
                userId={profile.id}
                isStaff={profile.isStaff}
                ownerId={profile.ownerId}
            />
        </Layout>
    );
}
