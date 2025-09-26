// types/index.ts
import { MediaStream } from 'react-native-webrtc';

export interface VideoCallScreenProps {
  route?: {
    params?: {
      roomId?: string;
      userId?: string;
    };
  };
  navigation?: {
    goBack: () => void;
  };
}

export interface ChatMessage {
  sender: string;
  message: string;
  time: number;
  senderId: string;
}

export type CallEvent = 
  | 'incoming-call'
  | 'call-accepted'
  | 'call-rejected'
  | 'call-ended'
  | 'user-left'
  | 'user-joined';

export interface CallEventData {
  caller?: string;
  callerSocketId?: string;
  accepter?: string;
  rejecter?: string;
  ender?: string;
  userId?: string;
  roomId?: string;
}

export interface WebRTCCallbacks {
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: string) => void;
  onChatMessage: (message: ChatMessage) => void;
  onRoomUpdate: (clients: string[]) => void;
  onCallEvents: (event: CallEvent, data: CallEventData) => void;
}

export interface SignalingMessage {
  type: string;
  data?: any;
  roomId?: string;
  userId?: string;
  targetId?: string;
}

export interface PeerConnection {
  connection: any; // RTCPeerConnection
  socketId: string;
}

export interface RoomState {
  clients: string[];
  roomId: string;
}