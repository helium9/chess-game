import {
    collection,
    doc,
    addDoc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

class WebRTCSignalingService {
    constructor() {
        this.localConnection = null;
        this.remoteConnection = null;
        this.callDoc = null;
        this.unsubscribeCallDoc = null;
        this.unsubscribeAnswerCandidates = null;
        this.unsubscribeOfferCandidates = null;
        this.onConnectionStateChange = null;
        this.onDataChannelMessage = null;
        this.dataChannel = null;
    }

    // Initialize WebRTC peer connection
    initializePeerConnection() {
        const configuration = {
            iceServers: [
                {
                    urls: [
                        'stun:stun1.l.google.com:19302',
                        'stun:stun2.l.google.com:19302',
                    ],
                },
            ],
            iceCandidatePoolSize: 10,
        };

        this.localConnection = new RTCPeerConnection(configuration);

        // Set up data channel for game state exchange
        this.dataChannel = this.localConnection.createDataChannel('gameState', {
            ordered: true
        });

        this.setupDataChannelHandlers(this.dataChannel);

        // Handle remote data channel
        this.localConnection.ondatachannel = (event) => {
            const receiveChannel = event.channel;
            this.setupDataChannelHandlers(receiveChannel);
        };

        // Handle ICE connection state changes
        this.localConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.localConnection.connectionState);
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(this.localConnection.connectionState);
            }
        };

        return this.localConnection;
    }

    // Set up data channel event handlers
    setupDataChannelHandlers(channel) {
        channel.onopen = () => {
            console.log('Data channel opened');
        };

        channel.onclose = () => {
            console.log('Data channel closed');
        };

        channel.onmessage = (event) => {
            console.log('Received message:', event.data);
            if (this.onDataChannelMessage) {
                this.onDataChannelMessage(JSON.parse(event.data));
            }
        };

        channel.onerror = (error) => {
            // Only log unexpected errors, not normal close operations
            if (error.error && error.error.message !== 'User-Initiated Abort, reason=Close called') {
                console.error('Data channel error:', error);
            } else {
                console.log('Data channel closed normally');
            }
        };
    }

    // Create a new call (initiator)
    async createCall() {
        try {
            const callsCollection = collection(db, 'calls');
            this.callDoc = doc(callsCollection);

            const offerCandidates = collection(this.callDoc, 'offerCandidates');
            const answerCandidates = collection(this.callDoc, 'answerCandidates');

            // Initialize peer connection
            const pc = this.initializePeerConnection();

            // Collect ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    addDoc(offerCandidates, event.candidate.toJSON());
                }
            };

            // Create offer
            const offerDescription = await pc.createOffer();
            await pc.setLocalDescription(offerDescription);

            const offer = {
                sdp: offerDescription.sdp,
                type: offerDescription.type,
            };

            // Save call document with offer
            await setDoc(this.callDoc, {
                offer,
                createdAt: serverTimestamp(),
                status: 'waiting'
            });

            // Listen for remote answer
            this.unsubscribeCallDoc = onSnapshot(this.callDoc, (snapshot) => {
                const data = snapshot.data();
                if (!pc.currentRemoteDescription && data?.answer) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    pc.setRemoteDescription(answerDescription);
                }
            });

            // Listen for remote ICE candidates
            this.unsubscribeAnswerCandidates = onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });

            return this.callDoc.id;
        } catch (error) {
            console.error('Error creating call:', error);
            throw error;
        }
    }

    // Join an existing call (receiver)
    async joinCall(callId) {
        try {
            this.callDoc = doc(db, 'calls', callId);

            const offerCandidates = collection(this.callDoc, 'offerCandidates');
            const answerCandidates = collection(this.callDoc, 'answerCandidates');

            // Initialize peer connection
            const pc = this.initializePeerConnection();

            // Collect ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    addDoc(answerCandidates, event.candidate.toJSON());
                }
            };

            // Get call document
            const callSnapshot = await getDoc(this.callDoc);
            if (!callSnapshot.exists()) {
                throw new Error('Call not found');
            }

            const callData = callSnapshot.data();
            if (!callData.offer) {
                throw new Error('No offer found in call');
            }

            // Set remote description from offer
            const offerDescription = new RTCSessionDescription(callData.offer);
            await pc.setRemoteDescription(offerDescription);

            // Create answer
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            const answer = {
                type: answerDescription.type,
                sdp: answerDescription.sdp,
            };

            // Update call document with answer
            await updateDoc(this.callDoc, {
                answer,
                status: 'connected'
            });

            // Listen for remote ICE candidates
            this.unsubscribeOfferCandidates = onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });

            return true;
        } catch (error) {
            console.error('Error joining call:', error);
            throw error;
        }
    }

    // Send graceful disconnect notification
    sendDisconnectNotification() {
        try {
            if (this.dataChannel && this.dataChannel.readyState === 'open') {
                console.log('Sending graceful disconnect notification');
                this.dataChannel.send(JSON.stringify({
                    type: 'disconnect',
                    data: {
                        type: 'gracefulDisconnect',
                        message: 'Player left the game'
                    },
                    timestamp: Date.now()
                }));
                return true;
            } else {
                console.log('Data channel not available for disconnect notification');
                return false;
            }
        } catch (error) {
            console.log('Could not send disconnect notification (channel likely closed):', error.message);
            return false;
        }
    }

    // Send game state through data channel
    sendGameState(gameState) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'gameState',
                data: gameState,
                timestamp: Date.now()
            }));
        } else {
            console.warn('Data channel not ready for sending');
        }
    }

    // Send move through data channel
    sendMove(move) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'move',
                data: move,
                timestamp: Date.now()
            }));
        } else {
            console.warn('Data channel not ready for sending');
        }
    }

    // Disconnect and cleanup
    async disconnect() {
        try {
            // Send graceful disconnect notification before closing
            const notificationSent = this.sendDisconnectNotification();

            // Only delay if notification was actually sent
            if (notificationSent) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Close data channel
            if (this.dataChannel) {
                this.dataChannel.close();
                this.dataChannel = null;
            }

            // Close peer connection
            if (this.localConnection) {
                this.localConnection.close();
                this.localConnection = null;
            }

            // Unsubscribe from Firestore listeners
            if (this.unsubscribeCallDoc) {
                this.unsubscribeCallDoc();
                this.unsubscribeCallDoc = null;
            }

            if (this.unsubscribeAnswerCandidates) {
                this.unsubscribeAnswerCandidates();
                this.unsubscribeAnswerCandidates = null;
            }

            if (this.unsubscribeOfferCandidates) {
                this.unsubscribeOfferCandidates();
                this.unsubscribeOfferCandidates = null;
            }

            // Delete call document from Firestore
            if (this.callDoc) {
                await deleteDoc(this.callDoc);
                this.callDoc = null;
            }

            console.log('WebRTC connection disconnected and cleaned up');
        } catch (error) {
            console.error('Error during disconnect:', error);
        }
    }

    // Set callback for connection state changes
    setConnectionStateCallback(callback) {
        this.onConnectionStateChange = callback;
    }

    // Set callback for data channel messages
    setDataChannelMessageCallback(callback) {
        this.onDataChannelMessage = callback;
    }

    // Get current connection state
    getConnectionState() {
        return this.localConnection ? this.localConnection.connectionState : 'closed';
    }
}

export default WebRTCSignalingService;