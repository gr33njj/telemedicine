import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import { renderIcon } from '../components/Icons';
import './ConsultationRoom.css';

interface Message {
  id: string;
  senderId: number;
  senderName: string;
  text: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt?: string;
}


interface ConsultationDetails {
  id: number;
  status: string;
  doctor_name?: string;
  patient_name?: string;
  slot_start_time?: string | null;
  slot_end_time?: string | null;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

const getMediaErrorMessage = (error: any): string => {
  if (!error) {
    return 'Не удалось получить доступ к камере/микрофону. Проверьте разрешения браузера.';
  }
  const name = error.name || '';
  const message = (error.message || '').toLowerCase();
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Вы запретили доступ к камере или микрофону. Разрешите использование устройств в настройках браузера.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Камера или микрофон не найдены. Подключите устройство и попробуйте снова.';
  }
  if (message.includes('secure') || message.includes('https')) {
    return 'Для видеосвязи требуется открыть сайт по защищенному протоколу HTTPS.';
  }
  return 'Не удалось получить доступ к камере/микрофону. Проверьте разрешения браузера.';
};

const ConsultationRoom: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number | null>(null);
  const politeRef = useRef(false);
  const isMakingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingLocalCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const effectAbortRef = useRef(false);

  const [info, setInfo] = useState<ConsultationDetails | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [callDuration, setCallDuration] = useState('00:00');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'waiting' | 'connecting' | 'connected' | 'ended'>('idle');
  const [isRemoteOnline, setIsRemoteOnline] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteMediaState, setRemoteMediaState] = useState({ video: true, audio: true });
  const [remoteOrientation, setRemoteOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [viewportOrientation, setViewportOrientation] = useState<'portrait' | 'landscape'>(
    () => (typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
  );
  const orientationRef = useRef<'portrait' | 'landscape'>(viewportOrientation);
  const [fileError, setFileError] = useState<string | null>(null);

  const consultationId = Number(id);

  const wsBase =
    process.env.REACT_APP_WS_URL ||
    (window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`);
  const canManageConsultation = user?.role === 'doctor';

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      return;
    }

    while (pendingRemoteCandidatesRef.current.length) {
      const candidate = pendingRemoteCandidatesRef.current.shift();
      if (!candidate) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Add ICE (flush) error', error);
      }
    }
  }, []);

  const buildFileMessage = useCallback(
    (payload: {
      id: number;
      fileName: string;
      fileType?: string;
      downloadUrl: string;
      uploadedAt?: string;
      senderId?: number;
      senderName?: string;
    }): Message => ({
      id: `file-${payload.id}`,
      senderId: payload.senderId ?? 0,
      senderName: payload.senderName ?? 'Участник',
      text: '',
      timestamp: new Date(payload.uploadedAt ?? Date.now()).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      fileUrl: payload.downloadUrl,
      fileName: payload.fileName,
      fileType: payload.fileType,
      uploadedAt: payload.uploadedAt,
    }),
    [],
  );

  const sendMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    },
    []
  );

  const cleanup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    pendingRemoteCandidatesRef.current = [];
    ignoreOfferRef.current = false;
    isSettingRemoteAnswerPendingRef.current = false;
    pendingLocalCandidatesRef.current = [];
  }, []);

  const startTimer = useCallback(() => {
    if (callTimerRef.current) return;
    callStartRef.current = Date.now();
    callTimerRef.current = setInterval(() => {
      if (callStartRef.current) {
        const diff = Date.now() - callStartRef.current;
        const minutes = Math.floor(diff / 60000)
          .toString()
          .padStart(2, '0');
        const seconds = Math.floor((diff % 60000) / 1000)
          .toString()
          .padStart(2, '0');
        setCallDuration(`${minutes}:${seconds}`);
      }
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    callStartRef.current = null;
    setCallDuration('00:00');
  }, []);

  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || isMakingOfferRef.current) return;
    try {
      isMakingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendMessage({ type: 'offer', payload: offer });
    } catch (error) {
      console.error('Offer error', error);
    } finally {
      isMakingOfferRef.current = false;
      ignoreOfferRef.current = false;
    }
  }, [sendMessage]);

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const pc = pcRef.current;
      if (!pc) return;
      const offerDescription = new RTCSessionDescription(offer);
      const readyForOffer =
        !isMakingOfferRef.current &&
        (pc.signalingState === 'stable' || isSettingRemoteAnswerPendingRef.current);
      const offerCollision = !readyForOffer;

      if (offerCollision && !politeRef.current) {
        console.warn('Ignoring offer due to collision (impolite peer)');
        ignoreOfferRef.current = true;
        return;
      }
      ignoreOfferRef.current = false;

      try {
        if (offerCollision && politeRef.current) {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit),
            pc.setRemoteDescription(offerDescription),
          ]);
        } else {
          await pc.setRemoteDescription(offerDescription);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage({ type: 'answer', payload: answer });
        await flushPendingCandidates();
      } catch (error) {
        console.error('Answer error', error);
      }
    },
    [sendMessage, flushPendingCandidates],
  );

  const handleRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        isSettingRemoteAnswerPendingRef.current = true;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingCandidates();
      } catch (error) {
        console.error('Remote answer error', error);
      } finally {
        isSettingRemoteAnswerPendingRef.current = false;
      }
    },
    [flushPendingCandidates],
  );

  const handleNewICE = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;
     if (ignoreOfferRef.current) return;
    if (!pc.remoteDescription) {
      pendingRemoteCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Add ICE error', error);
    }
  }, []);

  const refreshVideoTrack = useCallback(
    async (orientation: 'portrait' | 'landscape') => {
      if (!localStreamRef.current || !pcRef.current || !navigator.mediaDevices?.getUserMedia) {
        return;
      }
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
      if (!sender) return;

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'user',
            aspectRatio: orientation === 'landscape' ? 16 / 9 : 9 / 16,
            width: orientation === 'landscape' ? { ideal: 1280 } : { ideal: 720 },
            height: orientation === 'landscape' ? { ideal: 720 } : { ideal: 1280 },
          },
          audio: false,
        };
        const updatedStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newVideoTrack = updatedStream.getVideoTracks()[0];
        await sender.replaceTrack(newVideoTrack);

        const audioTracks = localStreamRef.current.getAudioTracks();
        const combinedStream = new MediaStream([...audioTracks, newVideoTrack]);
        localStreamRef.current.getVideoTracks().forEach((track) => track.stop());
        localStreamRef.current = combinedStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = combinedStream;
        }
      } catch (error) {
        console.warn('Failed to refresh video track', error);
      }
    },
    [],
  );

  const setupPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ice', payload: candidate });
      } else {
        pendingLocalCandidatesRef.current.push(candidate);
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        await createOffer();
      } catch (error) {
        console.error('Negotiation error', error);
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        const playPromise = remoteVideoRef.current.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {
            /* ignore autoplay errors */
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionStatus('connected');
        startTimer();
        setIsRemoteOnline(true);
      } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setConnectionStatus('ended');
        setIsRemoteOnline(false);
        stopTimer();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        try {
          pc.restartIce();
        } catch (error) {
          console.warn('Failed to restart ICE', error);
        }
      }
    };

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API недоступен в этом браузере.');
      }

      if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        throw new Error('SecureContextRequired');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const shouldAbort = effectAbortRef.current || pcRef.current !== pc;
      if (shouldAbort) {
        stream.getTracks().forEach((track) => track.stop());
        pc.close();
        if (pcRef.current === pc) {
          pcRef.current = null;
        }
        return;
      }
      localStreamRef.current = stream;
      setMediaError(null);
      const tracks = stream.getTracks();
      if (pc.signalingState === 'closed') {
        tracks.forEach((track) => track.stop());
        return;
      }
      tracks.forEach((track) => pc.addTrack(track, stream));
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        const playPromise = localVideoRef.current.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {
            /* ignore autoplay errors */
          });
        }
      }
    } catch (error: any) {
      const friendlyMessage =
        error?.message === 'SecureContextRequired'
          ? 'Для видеосвязи откройте сайт по адресу https://doclink.it-mydoc.ru.'
          : getMediaErrorMessage(error);
      setMediaError(friendlyMessage);
      console.error('Media error', error);
    }
  }, [sendMessage, startTimer, stopTimer, createOffer]);

  const handleViewportOrientation = useCallback(() => {
    const nextOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    if (orientationRef.current !== nextOrientation) {
      orientationRef.current = nextOrientation;
      setViewportOrientation(nextOrientation);
      refreshVideoTrack(nextOrientation);
      sendMessage({
        type: 'orientation',
        payload: { orientation: nextOrientation },
      });
    }
  }, [refreshVideoTrack, sendMessage]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim()) return;
    sendMessage({
      type: 'chat',
      payload: { text: messageText.trim() },
    });
    setMessageText('');
  }, [messageText, sendMessage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !consultationId) return;

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', selectedFile.name);
      const { data } = await api.post(`/consultations/${consultationId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const message = buildFileMessage({
        id: data.id,
        fileName: data.file_name,
        fileType: data.file_type,
        downloadUrl: data.download_url,
        uploadedAt: data.uploaded_at,
        senderId: user?.id,
        senderName: 'Вы',
      });
      setMessages((prev) => [...prev, message]);
    } catch (error) {
      console.error('File upload error', error);
      setFileError('Не удалось прикрепить файл');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (!fileError) return;
    const timerId = setTimeout(() => setFileError(null), 4000);
    return () => clearTimeout(timerId);
  }, [fileError]);

  const handleLeaveCall = useCallback(() => {
    cleanup();
    navigate('/consultations');
  }, [cleanup, navigate]);

  const handleEndCall = async () => {
    if (!canManageConsultation) {
      handleLeaveCall();
      return;
    }

    if (!window.confirm('Завершить консультацию?')) {
      return;
    }
    sendMessage({ type: 'end-call' });
    try {
      await api.post(`/consultations/${consultationId}/complete`);
    } catch (error) {
      console.warn('Complete consultation error', error);
    }
    cleanup();
    navigate('/consultations');
  };

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const enabled = !isAudioEnabled;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setIsAudioEnabled(enabled);
    sendMessage({
      type: 'media',
      payload: { audioEnabled: enabled, senderId: user?.id },
    });
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const enabled = !isVideoEnabled;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setIsVideoEnabled(enabled);
    sendMessage({
      type: 'media',
      payload: { videoEnabled: enabled, senderId: user?.id },
    });
  };

  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        const { data } = await api.get(`/consultations/${consultationId}`);
        setInfo(data);
      } catch (error) {
        console.error('Failed to fetch consultation', error);
      }
    };

    fetchConsultation();
  }, [consultationId]);

  useEffect(() => {
    handleViewportOrientation();
    window.addEventListener('resize', handleViewportOrientation);
    window.addEventListener('orientationchange', handleViewportOrientation);
    return () => {
      window.removeEventListener('resize', handleViewportOrientation);
      window.removeEventListener('orientationchange', handleViewportOrientation);
    };
  }, [handleViewportOrientation]);

  useEffect(() => {
    if (!consultationId || !user) return;
    effectAbortRef.current = false;

    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    let isMounted = true;

    const init = async () => {
      await setupPeerConnection();

      const ws = new WebSocket(`${wsBase}/api/v1/ws/consultations/${consultationId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnectionStatus('connecting');
        if (pendingLocalCandidatesRef.current.length) {
          pendingLocalCandidatesRef.current.forEach((candidate) => {
            sendMessage({ type: 'ice', payload: candidate });
          });
          pendingLocalCandidatesRef.current = [];
        }
      };

      ws.onmessage = async (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'system': {
              const eventType = data.event || data.payload?.event;
              const payload = data.payload || {};
              if (eventType === 'connected') {
                setConnectionStatus('waiting');
              }
              if (eventType === 'ready') {
                politeRef.current = !payload.shouldCreateOffer;
                setIsRemoteOnline(true);
                if (payload.shouldCreateOffer) {
                  setConnectionStatus('connecting');
                  await createOffer();
                }
              }
              if (eventType === 'peer_joined') {
                setIsRemoteOnline(true);
                setConnectionStatus('connecting');
              }
              if (eventType === 'peer_left') {
                setIsRemoteOnline(false);
                setConnectionStatus('waiting');
                stopTimer();
              }
              if (eventType === 'call_ended') {
                setConnectionStatus('ended');
                setIsRemoteOnline(false);
                stopTimer();
                cleanup();
              }
              break;
            }
            case 'offer':
              await createAnswer(data.payload);
              break;
            case 'answer':
              await handleRemoteAnswer(data.payload);
              break;
            case 'ice':
              await handleNewICE(data.payload);
              break;
            case 'chat': {
              const payload = data.payload;
              setMessages((prev) => [
                ...prev,
                {
                  id: `${payload.senderId}-${payload.timestamp}`,
                  senderId: payload.senderId,
                  senderName: payload.senderName,
                  text: payload.text,
                  timestamp: new Date(payload.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
              ]);
              break;
            }
            case 'media': {
              const payload = data.payload;
              if (payload?.senderId !== user.id) {
                setRemoteMediaState((prev) => ({
                  video: payload.videoEnabled ?? prev.video,
                  audio: payload.audioEnabled ?? prev.audio,
                }));
              }
              break;
            }
            case 'file': {
              const payload = data.payload;
              if (payload) {
                const message = buildFileMessage({
                  id: payload.id,
                  fileName: payload.fileName ?? payload.file_name,
                  fileType: payload.fileType ?? payload.file_type,
                  downloadUrl: payload.downloadUrl ?? payload.download_url,
                  uploadedAt: payload.uploadedAt ?? payload.uploaded_at,
                  senderId: payload.senderId ?? payload.sender_id,
                  senderName: payload.senderName ?? payload.sender_name,
                });
                setMessages((prev) => [...prev, message]);
              }
              break;
            }
            case 'orientation': {
              const payload = data.payload;
              const orientation = payload?.orientation === 'landscape' ? 'landscape' : 'portrait';
              setRemoteOrientation(orientation);
              break;
            }
            default:
              break;
          }
        } catch (error) {
          console.error('WS message error', error);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnectionStatus('ended');
        cleanup();
      };

      ws.onerror = () => {
        setConnectionStatus('ended');
        cleanup();
      };
    };

    init();

    return () => {
      effectAbortRef.current = true;
      isMounted = false;
      cleanup();
    };
  }, [
    consultationId,
    user,
    wsBase,
    navigate,
    setupPeerConnection,
    createOffer,
    createAnswer,
    handleRemoteAnswer,
    handleNewICE,
    cleanup,
    stopTimer,
  ]);

  const remoteDisplayName =
    user?.role === 'doctor' ? info?.patient_name || 'Пациент' : info?.doctor_name || 'Врач';
  const remoteRoleLabel = user?.role === 'doctor' ? 'Пациент' : 'Врач';
  const headerTitle =
    user?.role === 'doctor' ? info?.patient_name || 'Видеоконсультация' : info?.doctor_name || 'Видеоконсультация';

  return (
    <div className={`consultation-room ${isChatOpen ? 'has-chat' : ''}`}>
      <div className="room-header">
        <div>
          <p className="room-label">Консультация</p>
          <h2>{headerTitle}</h2>
          <p className="room-subtitle">
            {info?.slot_start_time
              ? `Запланировано: ${new Date(info.slot_start_time).toLocaleString('ru-RU')}`
              : 'Ожидание подключения второго участника'}
          </p>
        </div>
        <div className={`status-pill status-${connectionStatus}`}>
          {connectionStatus === 'connected'
            ? 'На связи'
            : connectionStatus === 'connecting'
              ? 'Подключаем…'
              : connectionStatus === 'waiting'
                ? 'Ожидание собеседника'
                : connectionStatus === 'ended'
                  ? 'Завершено'
                  : 'Подготовка'}
        </div>
      </div>

      <div className="room-body">
        <div className="video-stage">
          <div className={`video-tile remote orientation-${remoteOrientation}`}>
            <video ref={remoteVideoRef} className="video-element" autoPlay playsInline />
            <div className="video-overlay">
              <div className="participant-info">
                <span className="participant-name">{remoteDisplayName}</span>
                <span className="participant-role">
                  {remoteRoleLabel} · {isRemoteOnline ? 'в сети' : 'ожидание'}
                </span>
              </div>
              <div className="call-duration">{callDuration}</div>
            </div>
            {(!isRemoteOnline || !remoteMediaState.video) && (
              <div className="video-disabled-overlay">
                <div className="video-disabled-icon">{renderIcon('video-off', 32)}</div>
                <p>{isRemoteOnline ? 'Камера отключена' : 'Ожидание подключения'}</p>
              </div>
            )}
          </div>

          <div className={`video-tile local orientation-${viewportOrientation}`}>
            <video ref={localVideoRef} className="video-element" autoPlay playsInline muted />
            <div className="video-overlay">
              <div className="participant-info">
                <span className="participant-name">Вы</span>
                <span className="participant-role">{user?.role === 'doctor' ? 'Врач' : 'Пациент'}</span>
              </div>
            </div>
            {!isVideoEnabled && (
              <div className="video-disabled-overlay">
                <div className="video-disabled-icon">{renderIcon('video-off', 24)}</div>
                <p>Камера отключена</p>
              </div>
            )}
          </div>
        </div>

        {mediaError && <div className="media-error">{mediaError}</div>}

        <div className="controls-bar">
          <div className="controls-group">
            <button
              className={`control-button ${!isAudioEnabled ? 'muted' : ''}`}
              onClick={toggleAudio}
              title={isAudioEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
            >
              {renderIcon(isAudioEnabled ? 'mic' : 'mic-off', 20)}
              <span>{isAudioEnabled ? 'Микрофон' : 'Включить микрофон'}</span>
            </button>
            <button
              className={`control-button ${!isVideoEnabled ? 'muted' : ''}`}
              onClick={toggleVideo}
              title={isVideoEnabled ? 'Выключить камеру' : 'Включить камеру'}
            >
              {renderIcon(isVideoEnabled ? 'video' : 'video-off', 20)}
              <span>{isVideoEnabled ? 'Камера' : 'Включить камеру'}</span>
            </button>
            <button className={`control-button ${isChatOpen ? 'active' : ''}`} onClick={() => setIsChatOpen(!isChatOpen)}>
              {renderIcon('chat', 20)}
              <span>{isChatOpen ? 'Скрыть чат' : 'Чат'}</span>
            </button>
          </div>

          <div className="controls-group">
            <button
              className={`control-button ${isUploadingFile ? 'muted' : ''}`}
              onClick={() => !isUploadingFile && fileInputRef.current?.click()}
              title="Отправить файл"
              disabled={isUploadingFile}
            >
              {renderIcon('paperclip', 20)}
              <span>{isUploadingFile ? 'Загружаем…' : 'Файл'}</span>
            </button>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>

          <div className="controls-group">
            <button className="control-button ghost" onClick={handleLeaveCall}>
              {renderIcon('phone', 20)}
              <span>Выйти</span>
            </button>
            {canManageConsultation && (
              <button className="control-button danger" onClick={handleEndCall}>
                {renderIcon('phone-end', 20)}
                <span>Завершить</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isChatOpen && (
        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Чат консультации</h3>
            <button className="chat-close-btn" onClick={() => setIsChatOpen(false)}>
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.senderId === user?.id ? 'me' : 'other'}`}
              >
                <div className="message-content">
                  <p className="message-author">{message.senderId === user?.id ? 'Вы' : message.senderName}</p>
                  {message.fileUrl ? (
                    <div className="message-file">
                      <div className="file-icon">{renderIcon('document', 20)}</div>
                      <div className="file-info">
                        <p className="file-name">{message.fileName || 'Файл'}</p>
                        <button
                          className="file-download"
                          onClick={() => window.open(message.fileUrl, '_blank')}
                          type="button"
                        >
                          {renderIcon('download', 16)} Скачать
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>
                <div className="message-timestamp">{message.timestamp}</div>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Введите сообщение..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              type="button"
              onClick={() => !isUploadingFile && fileInputRef.current?.click()}
              className={`attach-btn ${isUploadingFile ? 'disabled' : ''}`}
              disabled={isUploadingFile}
            >
              {renderIcon('paperclip', 18)}
            </button>
            {isUploadingFile && <span className="chat-uploading">Загрузка…</span>}
            {fileError && <span className="chat-error">{fileError}</span>}
            <button onClick={handleSendMessage} className="send-btn" type="button">
              {renderIcon('send', 18)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationRoom;

