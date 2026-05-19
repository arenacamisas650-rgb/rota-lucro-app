import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calculateDistance, simplifyRoute } from '../utils/geo';

export const useGPS = () => {
  const activeShift = useAppStore(state => state.activeShift);
  const addShiftRoutePoint = useAppStore(state => state.addShiftRoutePoint);
  const addLog = useAppStore(state => state.addLog);

  const [currentPosition, setCurrentPosition] = useState(null); // { lat, lng, speed, accuracy }
  const [accumulatedDistance, setAccumulatedDistance] = useState(0);
  const [gpsError, setGpsError] = useState(null);

  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const standstillCountRef = useRef(0); // Contador de vezes que o motorista ficou parado

  // Reseta distância se o turno mudar ou iniciar
  useEffect(() => {
    if (activeShift) {
      setAccumulatedDistance(0);
      lastPositionRef.current = null;
      standstillCountRef.current = 0;
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [activeShift?.id]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada no seu navegador.');
      addLog('GPS não suportado pelo navegador', 'error');
      return;
    }

    addLog('Iniciando rastreamento de GPS inteligente...');

    const handleSuccess = (position) => {
      const { latitude: lat, longitude: lng, speed, accuracy } = position.coords;
      const now = Date.now();

      setCurrentPosition({ lat, lng, speed, accuracy });
      setGpsError(null);

      // Throttling adaptativo:
      // Se a precisão for ruim (> 50 metros), descarta o ponto para evitar saltos malucos no mapa
      if (accuracy > 50) return;

      const timeDiff = now - lastUpdateTimeRef.current;
      const currentSpeed = speed || 0; // m/s

      // Se a velocidade for muito baixa (< 0.5 m/s ou ~1.8 km/h), consideramos que está parado
      const isStandstill = currentSpeed < 0.5;

      if (isStandstill) {
        standstillCountRef.current += 1;
      } else {
        standstillCountRef.current = 0;
      }

      // Se estiver parado há muito tempo, throttling de tempo: atualiza no máximo a cada 60s
      if (isStandstill && standstillCountRef.current > 3 && timeDiff < 60000) {
        return; 
      }

      // Throttling geral: atualiza no máximo a cada 5 segundos em movimento rápido para economizar bateria
      if (!isStandstill && timeDiff < 5000) {
        return;
      }

      if (lastPositionRef.current) {
        const dist = calculateDistance(
          lastPositionRef.current.lat,
          lastPositionRef.current.lng,
          lat,
          lng
        );

        // Apenas registra o ponto se tiver se movido mais de 10 metros
        if (dist > 0.01) {
          setAccumulatedDistance(prev => prev + dist);
          addShiftRoutePoint(lat, lng);
          lastPositionRef.current = { lat, lng };
          lastUpdateTimeRef.current = now;
        }
      } else {
        // Primeiro ponto do trajeto
        addShiftRoutePoint(lat, lng);
        lastPositionRef.current = { lat, lng };
        lastUpdateTimeRef.current = now;
      }
    };

    const handleError = (error) => {
      let msg = 'Erro desconhecido ao acessar GPS.';
      if (error.code === 1) msg = 'Permissão de localização negada.';
      else if (error.code === 2) msg = 'Posição GPS indisponível.';
      else if (error.code === 3) msg = 'Tempo limite de resposta do GPS excedido.';

      setGpsError(msg);
      addLog(`Erro GPS: ${msg}`, 'warning');
    };

    // Configuração de precisão adaptativa baseada em atividade
    // enableHighAccuracy consome mais bateria. Usamos True, mas o watchId pode ser recriado se pausado
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      addLog('Rastreamento de GPS finalizado.');
    }
  };

  return {
    currentPosition,
    accumulatedDistance,
    gpsError,
    isTracking: watchIdRef.current !== null
  };
};
