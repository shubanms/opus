import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/logo/LoadingScreen.jsx';
import useSettingsStore from '../store/settingsStore.js';
import { playIntro } from '../utils/sound.js';

export default function LoadingPage() {
  const navigate = useNavigate();
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const { sound, themeOnOpen } = useSettingsStore.getState();
    if (sound && themeOnOpen) playIntro();
    const fadeAt = setTimeout(() => setFadingOut(true), 3800);
    const goAt = setTimeout(() => navigate('/home', { replace: true }), 4400);
    return () => { clearTimeout(fadeAt); clearTimeout(goAt); };
  }, [navigate]);

  return <LoadingScreen fadingOut={fadingOut} />;
}
