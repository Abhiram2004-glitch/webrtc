import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices
} from 'react-native-webrtc';

import io from 'socket.io-client';
import { WebRTCCallbacks, SignalingMessage, CallEvent, CallEventData, ChatMessage } from '../types';

class WebRTCService {
  private socket: any | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dataChannel: any | null = null;
  private callbacks: WebRTCCallbacks | null = null;
  private roomId: string = '';
  private userId: string = '';
  private isInitialized: boolean = false;

  // ICE servers configuration
  private configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.ekiga.net' },
      { urls: 'stun:stun.ideasip.com' },
      { urls: 'stun:stun.schlund.de' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.voiparound.com' },
      { urls: 'stun:stun.voipbuster.com' },
      { urls: 'stun:stun.voipstunt.com' },
      { urls: 'stun:stun.counterpath.com' },
      { urls: 'stun:stun.1und1.de' },
      { urls: 'stun:stun.gmx.net' },
      { urls: 'stun:stun.voipbuster.com' },
      { urls: 'stun:stun.voipstunt.com' },
      { urls: 'stun:stun.voiparound.com' },
      { urls: 'stun:stun.voipbuster.com' },
      { urls: 'stun:stun.voipstunt.com' },
    ],
    iceCandidatePoolSize: 10,
  };

  async initialize(
    signalingServer: string,
    roomId: string,
    userId: string,
    callbacks: WebRTCCallbacks
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('WebRTC service already initialized');
      return;
    }

    this.roomId = roomId;
    this.userId = userId;
    this.callbacks = callbacks;

    try {
      // Initialize socket connection
      await this.initializeSocket(signalingServer);

      // Initialize peer connection
      await this.initializePeerConnection();

      this.isInitialized = true;
      console.log('WebRTC service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      throw error;
    }
  }

  private async initializeSocket(signalingServer: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(signalingServer, {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('Connected to signaling server');
        this.socket?.emit('join', this.roomId);
        resolve();
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
      });

      // Handle signaling messages
      this.socket.on('offer', (data: any) => this.handleOffer(data));
      this.socket.on('answer', (data: any) => this.handleAnswer(data));
      this.socket.on('ice-candidate', (data: any) => this.handleIceCandidate(data));
      this.socket.on('room:update', (data: any) => this.handleRoomUpdate(data));
      this.socket.on('chat-message', (data: any) => this.handleChatMessage(data));
      this.socket.on('joined', (data: any) => this.handleJoined(data));
      this.socket.on('incoming-call', (data: any) => this.handleIncomingCall(data));
      this.socket.on('call-accepted', (data: any) => this.handleCallAccepted(data));
      this.socket.on('call-rejected', (data: any) => this.handleCallRejected(data));
      this.socket.on('call-ended', (data: any) => this.handleCallEnded(data));
      this.socket.on('user-disconnected', (data: any) => this.handleUserDisconnected(data));

      // Set connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Socket connection timeout'));
        }
      }, 10000);
    });
  }

  private async initializePeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Handle ICE candidates
    (this.peerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log('Sending ICE candidate...');
        this.socket?.emit('ice-candidate', {
          roomId: this.roomId,
          candidate: event.candidate,
          sender: this.userId,
        });
      } else {
        console.log('ICE gathering completed');
      }
    };

    // Handle ICE gathering state changes
    (this.peerConnection as any).onicegatheringstatechange = () => {
      const state = this.peerConnection?.iceGatheringState || 'new';
      console.log('ICE Gathering state:', state);
    };

    // Handle remote stream
    (this.peerConnection as any).ontrack = (event: any) => {
      console.log('Remote track added:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.callbacks?.onRemoteStream(event.streams[0]);
      }
    };

    // Handle connection state changes
    (this.peerConnection as any).oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState || 'new';
      console.log('ICE Connection state:', state);
      this.callbacks?.onConnectionStateChange(state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('WebRTC connection established successfully!');
      } else if (state === 'failed' || state === 'disconnected') {
        console.log('WebRTC connection failed or disconnected');
      }
    };

    // Handle signaling state changes
    (this.peerConnection as any).onsignalingstatechange = () => {
      const state = this.peerConnection?.signalingState || 'new';
      console.log('Signaling state:', state);
    };

    // Create data channel for chat
    this.dataChannel = this.peerConnection.createDataChannel('chat', {
      ordered: true,
    });

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onmessage = (event: any) => {
      const message: ChatMessage = JSON.parse(event.data);
      this.callbacks?.onChatMessage(message);
    };

    // Handle incoming data channel
    (this.peerConnection as any).ondatachannel = (event: any) => {
      const channel = event.channel;
      channel.onmessage = (ev: any) => {
        const message: ChatMessage = JSON.parse(ev.data);
        this.callbacks?.onChatMessage(message);
      };
    };
  }

  async startLocalStream(video: boolean = true, audio: boolean = true): Promise<void> {
    try {
      const constraints: any = {
        video: video ? {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { min: 15, ideal: 30, max: 30 },
          facingMode: 'user',
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      };

      console.log('Requesting media with constraints:', constraints);
      this.localStream = await mediaDevices.getUserMedia(constraints);

      // Add media tracks to peer connection
      if (this.peerConnection && this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          console.log(`Adding ${track.kind} track to peer connection`);
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      this.callbacks?.onLocalStream(this.localStream);
      console.log('Local stream started successfully');
    } catch (error) {
      console.error('Failed to start local stream:', error);
      
      // Try with simpler constraints if the first attempt fails
      if (video || audio) {
        console.log('Retrying with simpler constraints...');
        try {
          const simpleConstraints = {
            video: video ? true : false,
            audio: audio ? true : false,
          };
          
          this.localStream = await mediaDevices.getUserMedia(simpleConstraints);
          
          if (this.peerConnection && this.localStream) {
            this.localStream.getTracks().forEach((track) => {
              this.peerConnection?.addTrack(track, this.localStream!);
            });
          }
          
          this.callbacks?.onLocalStream(this.localStream);
          console.log('Local stream started with simple constraints');
        } catch (retryError) {
          console.error('Failed to start local stream with simple constraints:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  private async handleOffer(data: any): Promise<void> {
    try {
      if (!this.peerConnection) {
        console.log('Peer connection not ready for offer');
        return;
      }

      console.log('Received offer, validating SDP...');
      
      // Validate SDP data
      if (!data.sdp || !data.sdp.type || !data.sdp.sdp) {
        console.error('Invalid SDP data received:', data);
        return;
      }

      // Check if we already have a remote description
      if (this.peerConnection.remoteDescription) {
        console.log('Remote description already set, ignoring duplicate offer');
        return;
      }

      // Ensure local stream is ready before setting remote description
      if (!this.localStream) {
        console.log('Local stream not ready, starting it first...');
        await this.startLocalStream(true, true);
      }

      console.log('Setting remote description...');
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );

      console.log('Creating answer...');
      const answer = await this.peerConnection.createAnswer();
      
      console.log('Setting local description...');
      await this.peerConnection.setLocalDescription(answer);

      this.socket?.emit('answer', {
        roomId: this.roomId,
        sdp: answer,
        sender: this.userId,
      });
      
      console.log('Answer sent successfully');
    } catch (error) {
      console.error('Error handling offer:', error);
      
      // Try to recover by recreating the peer connection
      if ((error as Error).message.includes('error_content') || (error as Error).message.includes('InvalidStateError')) {
        console.log('Attempting to recover from SDP error...');
        await this.recoverFromSDPError();
      }
    }
  }

  private async handleAnswer(data: any): Promise<void> {
    try {
      if (!this.peerConnection) {
        console.log('Peer connection not ready for answer');
        return;
      }

      // Validate SDP data
      if (!data.sdp || !data.sdp.type || !data.sdp.sdp) {
        console.error('Invalid SDP data received:', data);
        return;
      }

      // Check if we already have a remote description
      if (this.peerConnection.remoteDescription) {
        console.log('Remote description already set, ignoring duplicate answer');
        return;
      }

      console.log('Received answer, setting remote description...');
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );
      
      console.log('Answer processed successfully');
    } catch (error) {
      console.error('Error handling answer:', error);
      
      // Try to recover from SDP error
      if ((error as Error).message.includes('error_content') || (error as Error).message.includes('InvalidStateError')) {
        console.log('Attempting to recover from SDP error...');
        await this.recoverFromSDPError();
      }
    }
  }

  private async handleIceCandidate(data: any): Promise<void> {
    try {
      if (!this.peerConnection) {
        console.log('Peer connection not ready for ICE candidate');
        return;
      }

      console.log('Adding ICE candidate...');
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  private handleRoomUpdate(data: any): void {
    const clients = data.clients || [];
    this.callbacks?.onRoomUpdate(clients);
    
    // If a new user joined and we're already in a call, establish connection
    if (data.action === 'user-joined' && clients.length > 1) {
      console.log('New user joined, establishing video connection...');
      this.startVideoCall();
    }
  }

  private handleChatMessage(data: ChatMessage): void {
    this.callbacks?.onChatMessage(data);
  }

  private handleJoined(data: any): void {
    console.log('Successfully joined room:', data);
    this.callbacks?.onRoomUpdate(data.clients || []);
    
    // If there are other users in the room, automatically start video call
    if (data.clients && data.clients.length > 1) {
      console.log('Multiple users in room, starting video call...');
      this.startVideoCall();
    }
  }

  private handleIncomingCall(data: any): void {
    this.callbacks?.onCallEvents('incoming-call', {
      caller: data.caller,
      callerSocketId: data.callerSocketId,
    });
  }

  private handleCallAccepted(data: any): void {
    this.callbacks?.onCallEvents('call-accepted', {
      accepter: data.accepter,
    });
  }

  private handleCallRejected(data: any): void {
    this.callbacks?.onCallEvents('call-rejected', {
      rejecter: data.rejecter,
    });
  }

  private handleCallEnded(data: any): void {
    this.callbacks?.onCallEvents('call-ended', {
      ender: data.ender,
    });
  }

  private handleUserDisconnected(data: any): void {
    this.callbacks?.onCallEvents('user-left', {
      userId: data.disconnectedSocket,
    });
  }

  async createOffer(): Promise<void> {
    try {
      if (!this.peerConnection) {
        console.log('Peer connection not ready for offer creation');
        return;
      }

      // Ensure local stream is ready
      if (!this.localStream) {
        console.log('Local stream not ready, starting it first...');
        await this.startLocalStream(true, true);
      }

      console.log('Creating offer with proper constraints...');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: true,
      });
      
      console.log('Setting local description...');
      await this.peerConnection.setLocalDescription(offer);

      this.socket?.emit('offer', {
        roomId: this.roomId,
        sdp: offer,
        sender: this.userId,
      });
      
      console.log('Offer sent successfully');
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  private async recoverFromSDPError(): Promise<void> {
    try {
      console.log('Recovering from SDP error by recreating peer connection...');
      
      // Close existing peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
      }
      
      // Reinitialize peer connection
      await this.initializePeerConnection();
      
      // Re-add local stream if available
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }
      
      console.log('Peer connection recovery completed');
    } catch (error) {
      console.error('Error during SDP recovery:', error);
    }
  }

  private async startVideoCall(): Promise<void> {
    try {
      if (!this.peerConnection || !this.localStream) {
        console.log('Peer connection or local stream not ready');
        return;
      }

      console.log('Creating offer for video call...');
      await this.createOffer();
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  }

  toggleCamera(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  toggleMicrophone(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  switchCamera(): void {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack && (videoTrack as any)._switchCamera) {
      (videoTrack as any)._switchCamera();
    }
  }

  sendChatMessage(message: string): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      // Fallback to socket if data channel is not available
      this.socket?.emit('chat-message', {
        roomId: this.roomId,
        sender: this.userId,
        message: message,
      });
      return;
    }

    const chatMessage: ChatMessage = {
      sender: this.userId,
      message: message,
      time: Date.now(),
      senderId: this.userId,
    };

    this.dataChannel.send(JSON.stringify(chatMessage));
  }

  makeCall(targetSocketId: string): void {
    this.socket?.emit('call-user', {
      roomId: this.roomId,
      targetSocketId: targetSocketId,
      sender: this.userId,
    });
  }

  acceptCall(callerSocketId: string): void {
    this.socket?.emit('call-accepted', {
      roomId: this.roomId,
      targetSocketId: callerSocketId,
      sender: this.userId,
    });
  }

  rejectCall(callerSocketId: string): void {
    this.socket?.emit('call-rejected', {
      roomId: this.roomId,
      targetSocketId: callerSocketId,
      sender: this.userId,
    });
  }

  endCall(): void {
    this.socket?.emit('end-call', {
      roomId: this.roomId,
      sender: this.userId,
    });
  }

  disconnect(): void {
    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isInitialized = false;
    console.log('WebRTC service disconnected');
  }
}

export default WebRTCService;