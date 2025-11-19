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
    return 'Не удалось получить доступ к камере/микрофону.';
  }
  const name = error.name || '';
  const message = (error.message || '').toLowerCase();
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Доступ к камере/микрофону запрещён браузером.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Камера или микрофон не найдены.';
  }
  if (message.includes('secure') || message.includes('https')) {
    return 'Требуется HTTPS соединение.';
  }
  return 'Ошибка доступа к устройствам.';
};

const ConsultationRoom: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number | null>(null);
  
  // WebRTC State Refs
  const politeRef = useRef(false);
  const isMakingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingLocalCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const effectAbortRef = useRef(false);

  // UI State
  const [info, setInfo] = useState<ConsultationDetails | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [callDuration, setCallDuration] = useState('00:00');
  
  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'waiting' | 'connecting' | 'connected' | 'ended'>('idle');
  const [isRemoteOnline, setIsRemoteOnline] = useState(false);
  
  // Media State
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteMediaState, setRemoteMediaState] = useState({ video: true, audio: true });
  
  // File Upload
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Orientation for PIP
  const [viewportOrientation, setViewportOrientation] = useState<'portrait' | 'landscape'>(
    () => (typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
  );

  const consultationId = Number(id);
  const canManageConsultation = user?.role === 'doctor';
  const wsBase = process.env.REACT_APP_WS_URL || 
    (window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`);

  // --- Helpers ---

  const startTimer = useCallback(() => {
    if (callTimerRef.current) return;
    callStartRef.current = Date.now();
    callTimerRef.current = setInterval(() => {
      if (callStartRef.current) {
        const diff = Date.now() - callStartRef.current;
        const minutes = Math.floor(diff / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
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

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

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

  // --- WebRTC Logic ---

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
    }
  }, [sendMessage]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current;
    if (!pc) return;

    const offerCollision = isMakingOfferRef.current || pc.signalingState !== 'stable';
    
    // Perfect negotiation logic
    if (offerCollision && !politeRef.current) {
      ignoreOfferRef.current = true;
      return;
    }

    ignoreOfferRef.current = false;
    if (offerCollision && politeRef.current) {
      await pc.setLocalDescription({ type: 'rollback' });
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingCandidates();
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendMessage({ type: 'answer', payload: answer });
    } catch (error) {
      console.error('Handle offer error', error);
    }
  }, [sendMessage, flushPendingCandidates]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      isSettingRemoteAnswerPendingRef.current = true;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingCandidates();
    } catch (error) {
      console.error('Handle answer error', error);
    } finally {
      isSettingRemoteAnswerPendingRef.current = false;
    }
  }, [flushPendingCandidates]);

  const handleCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    
    if (ignoreOfferRef.current) return;

    if (!pc.remoteDescription) {
      pendingRemoteCandidatesRef.current.push(candidate);
    } else {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Add ICE error', error);
      }
    }
  }, []);

  const setupPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.toJSON();
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendMessage({ type: 'ice', payload: candidate });
        } else {
          pendingLocalCandidatesRef.current.push(candidate);
        }
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        // Only create offer if we are stable or it's a new negotiation
        // The polite logic handles collisions, but we shouldn't spam offers
        if (pc.signalingState === 'stable') {
           await createOffer();
        }
      } catch (error) {
        console.error('Negotiation error', error);
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
        stopTimer();
      }
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API missing');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      if (effectAbortRef.current) {
        stream.getTracks().forEach(t => t.stop());
        pc.close();
        return;
      }

      localStreamRef.current = stream;
      setMediaError(null);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

    } catch (error: any) {
      setMediaError(getMediaErrorMessage(error));
    }
  }, [createOffer, sendMessage, startTimer, stopTimer]);

  // --- Cleanup ---
  const cleanup = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // --- Lifecycle ---

  // Fetch Consultation Info
  useEffect(() => {
    if (!consultationId) return;
    api.get(`/consultations/${consultationId}`)
      .then(({ data }) => setInfo(data))
      .catch(console.error);
  }, [consultationId]);

  // Handle Orientation
  useEffect(() => {
    const handleResize = () => {
      const next = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      setViewportOrientation(next);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Connection Logic
  useEffect(() => {
    if (!consultationId || !user) return;
    effectAbortRef.current = false;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const init = async () => {
      await setupPeerConnection();

      const ws = new WebSocket(`${wsBase}/api/v1/ws/consultations/${consultationId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (effectAbortRef.current) return;
        setConnectionStatus('connecting');
        // Flush local candidates
        while (pendingLocalCandidatesRef.current.length) {
          const c = pendingLocalCandidatesRef.current.shift();
          if (c) sendMessage({ type: 'ice', payload: c });
        }
      };

      ws.onmessage = async (event) => {
        if (effectAbortRef.current) return;
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          switch (type) {
            case 'system':
              const evt = data.event || payload?.event;
              if (evt === 'ready') {
                politeRef.current = !payload.shouldCreateOffer;
                setIsRemoteOnline(true);
                if (payload.shouldCreateOffer) {
                   // We are the designated offerer
                   // Ensure we trigger negotiation if tracks are added
                   const pc = pcRef.current;
                   if (pc && pc.signalingState === 'stable') {
                      await createOffer();
                   }
                }
              } else if (evt === 'peer_joined') {
                 setIsRemoteOnline(true);
                 // If we are already connected or waiting, this confirms remote is there.
                 // If we are the impolite peer (offerer), we might need to offer again if previous attempt failed
                 // But generally 'ready' sets the roles.
              } else if (evt === 'peer_left') {
                 setIsRemoteOnline(false);
                 setConnectionStatus('waiting');
              } else if (evt === 'call_ended') {
                 setConnectionStatus('ended');
                 cleanup();
              }
              break;
            
            case 'offer':
              await handleOffer(payload);
              break;
            
            case 'answer':
              await handleAnswer(payload);
              break;
            
            case 'ice':
              await handleCandidate(payload);
              break;

            case 'chat':
              setMessages(prev => [...prev, {
                id: `${payload.senderId}-${Date.now()}`,
                senderId: payload.senderId,
                senderName: payload.senderName,
                text: payload.text,
                timestamp: new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })
              }]);
              break;

            case 'file':
              setMessages(prev => [...prev, {
                id: `file-${payload.id}`,
                senderId: payload.senderId,
                senderName: payload.senderName,
                text: '',
                fileUrl: payload.downloadUrl,
                fileName: payload.fileName,
                fileType: payload.fileType,
                timestamp: new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })
              }]);
              break;

            case 'media':
              if (payload.senderId !== user.id) {
                setRemoteMediaState(prev => ({
                  video: payload.videoEnabled ?? prev.video,
                  audio: payload.audioEnabled ?? prev.audio
                }));
              }
              break;
          }
        } catch (e) {
          console.error('WS Message Error', e);
        }
      };
    };

    init();

    return () => {
      effectAbortRef.current = true;
      cleanup();
    };
  }, [consultationId, user, wsBase, setupPeerConnection, createOffer, handleOffer, handleAnswer, handleCandidate, sendMessage, cleanup]);

  // --- Handlers ---

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const enabled = !isAudioEnabled;
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = enabled);
    setIsAudioEnabled(enabled);
    sendMessage({ type: 'media', payload: { audioEnabled: enabled, senderId: user?.id } });
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const enabled = !isVideoEnabled;
    localStreamRef.current.getVideoTracks().forEach(t => t.enabled = enabled);
    setIsVideoEnabled(enabled);
    sendMessage({ type: 'media', payload: { videoEnabled: enabled, senderId: user?.id } });
  };

  const handleLeave = () => {
    cleanup();
    navigate('/consultations');
  };

  const handleEnd = async () => {
    if (!window.confirm('Завершить консультацию для всех участников?')) return;
    try {
      await api.post(`/consultations/${consultationId}/complete`);
    } catch(e) {
      console.error(e);
    }
    handleLeave();
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessage({ type: 'chat', payload: { text: messageText.trim() } });
    setMessageText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', file.name);
    
    try {
      const { data } = await api.post(`/consultations/${consultationId}/files`, formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Backend broadcasts 'file' event, so we don't add message manually here to avoid dupes
      // unless the backend DOESN'T broadcast to sender? Usually WS broadcasts to room.
      // Assuming backend broadcasts to ALL, including sender.
    } catch (e) {
      setFileError('Ошибка загрузки файла');
      setTimeout(() => setFileError(null), 3000);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Render ---

  const remoteTitle = user?.role === 'doctor' ? info?.patient_name : info?.doctor_name;
  const remoteRole = user?.role === 'doctor' ? 'Пациент' : 'Врач';

  return (
    <div className="consultation-room">
      {/* Header */}
      <header className="room-header">
        <div className="room-info">
          <p className="room-label">Консультация</p>
          <h2>{remoteTitle || 'Собеседник'}</h2>
        </div>
        <div className={`status-pill status-${connectionStatus}`}>
          {connectionStatus === 'connected' ? 'На связи' :
           connectionStatus === 'connecting' ? 'Подключение...' :
           connectionStatus === 'waiting' ? 'Ожидание...' : 'Завершено'}
        </div>
      </header>

      {/* Body */}
      <div className="room-body">
        <div className="video-stage">
          {/* Remote Video */}
          <div className="video-container remote">
            <video ref={remoteVideoRef} className="video-element" autoPlay playsInline />
            <div className="video-overlay">
              <span className="participant-name">{remoteTitle}</span>
              <div className="status-indicator">
                {isRemoteOnline ? (
                  !remoteMediaState.video && <span style={{fontSize:12, opacity:0.7}}>{renderIcon('video-off', 14)} Камера выкл</span>
                ) : (
                  <span style={{fontSize:12, opacity:0.7}}>Не в сети</span>
                )}
              </div>
            </div>
            {(!isRemoteOnline || !remoteMediaState.video) && (
               <div className="video-placeholder">
                 {renderIcon('users', 48)}
                 <p>{!isRemoteOnline ? 'Ожидание подключения...' : 'Собеседник отключил камеру'}</p>
               </div>
            )}
          </div>

          {/* Local Video PIP */}
          <div className={`video-container local orientation-${viewportOrientation}`}>
            <video ref={localVideoRef} className="video-element" autoPlay playsInline muted />
            {!isVideoEnabled && (
               <div className="video-placeholder">
                 {renderIcon('video-off', 24)}
               </div>
            )}
          </div>
        </div>
        
        {mediaError && <div style={{color:'#f87171', textAlign:'center', fontSize:14}}>{mediaError}</div>}

        {/* Controls */}
        <div className="controls-bar">
           <button className={`control-btn ${!isAudioEnabled ? 'danger' : ''}`} onClick={toggleAudio}>
             {renderIcon(isAudioEnabled ? 'microphone' : 'microphone-off', 24)}
           </button>
           <button className={`control-btn ${!isVideoEnabled ? 'danger' : ''}`} onClick={toggleVideo}>
             {renderIcon(isVideoEnabled ? 'video-camera' : 'video-camera-off', 24)}
           </button>
           <button className={`control-btn ${isChatOpen ? 'active' : ''}`} onClick={() => setIsChatOpen(!isChatOpen)}>
             {renderIcon('chat', 24)}
           </button>
           <button className="control-btn danger" onClick={handleLeave}>
             {renderIcon('phone', 24)}
           </button>
        </div>
      </div>

      {/* Chat Side Panel */}
      <div className={`chat-panel ${isChatOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>Чат</h3>
          <button className="chat-btn" onClick={() => setIsChatOpen(false)}>✕</button>
        </div>
        
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} style={{ 
               alignSelf: msg.senderId === user?.id ? 'flex-end' : 'flex-start',
               background: msg.senderId === user?.id ? '#3b82f6' : '#374151',
               padding: '8px 12px', borderRadius: 12, maxWidth: '85%'
            }}>
               <div style={{fontSize:11, opacity:0.7, marginBottom:4}}>{msg.senderName}</div>
               {msg.fileUrl ? (
                 <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{display:'flex', alignItems:'center', gap:8, color:'white', textDecoration:'none'}}>
                   {renderIcon('paperclip', 16)} {msg.fileName}
                 </a>
               ) : (
                 <div>{msg.text}</div>
               )}
               <div style={{fontSize:10, opacity:0.5, marginTop:4, textAlign:'right'}}>{msg.timestamp}</div>
            </div>
          ))}
        </div>

        <div className="chat-input-area">
          <button className="chat-btn" onClick={() => fileInputRef.current?.click()}>
            {renderIcon('paperclip', 20)}
          </button>
          <input 
            className="chat-input" 
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Сообщение..."
          />
          <button className="chat-btn" onClick={handleSendMessage}>
            {renderIcon('arrow-right-circle', 20)}
          </button>
          <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
        </div>
      </div>
    </div>
  );
};

export default ConsultationRoom;
