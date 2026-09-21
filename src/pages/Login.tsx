import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError('Correo o contraseña incorrectos.');
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="Moon Sport" className="login-logo" />
        <p className="eyebrow" style={{ textAlign: 'center' }}>
          Moon Sport
        </p>
        <h1 className="title" style={{ fontSize: 20, textAlign: 'center', marginBottom: 20 }}>
          Iniciar sesión
        </h1>
        <FormField label="Correo" type="text" value={email} onChange={setEmail} required />
        <FormField
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <PrimaryButton label="Entrar" type="submit" loading={loading} />
      </form>
    </div>
  );
}
