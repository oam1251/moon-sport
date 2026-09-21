import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import FormField from '../components/FormField';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { downloadBackup } from '../api/backups';
import { getBusinessSettings, updateBusinessSettings } from '../api/settings';
import { parseNumericInput } from '../utils/format';

export default function Settings() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalText, setGoalText] = useState('0');
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  useEffect(() => {
    getBusinessSettings().then((s) => setGoalText(String(s.monthlyGoal)));
  }, []);

  const handleBackup = async () => {
    setError(null);
    setDownloading(true);
    try {
      await downloadBackup();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    setGoalSaved(false);
    try {
      await updateBusinessSettings({ monthlyGoal: parseNumericInput(goalText) });
      setGoalSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="screen-header">
        <h1 className="title">Ajustes</h1>
      </div>

      <h2 className="section-label">Meta mensual</h2>
      <p className="muted-text" style={{ marginBottom: 12 }}>
        Se muestra como barra de progreso en Inicio, comparada contra las
        ventas del mes.
      </p>
      <FormField label="Meta de ventas del mes" type="number" value={goalText} onChange={setGoalText} />
      {goalSaved && <p className="muted-text">Meta guardada.</p>}
      <PrimaryButton label="Guardar meta" onClick={handleSaveGoal} loading={savingGoal} />

      <h2 className="section-label">Clientes</h2>
      <button className="btn-secondary" onClick={() => navigate('/ajustes/clientes')}>
        Gestionar clientes
      </button>

      <h2 className="section-label">Respaldo</h2>
      <p className="muted-text" style={{ marginBottom: 12 }}>
        {isSupabaseConfigured
          ? 'Además del respaldo automático diario, puedes descargar una copia completa de tus datos cuando quieras.'
          : 'Puedes descargar una copia de los datos de ejemplo actuales.'}
      </p>
      {error && <p className="error-text">{error}</p>}
      <PrimaryButton label="Descargar respaldo" onClick={handleBackup} loading={downloading} />

      {isSupabaseConfigured && (
        <>
          <h2 className="section-label">Cuenta</h2>
          <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </>
      )}
    </ScreenContainer>
  );
}
