// App.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import VideoCallScreen from './screens/VideoCallScreen';

const App: React.FC = () => {
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const joinCall = (): void => {
    if (!roomId.trim()) {
      Alert.alert('Error', 'Please enter a room ID');
      return;
    }
    
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsInCall(true);
  };

  const generateRandomRoom = (): void => {
    const randomRoom = 'room-' + Math.random().toString(36).substring(2, 8);
    setRoomId(randomRoom);
  };

  const generateRandomUser = (): void => {
    const randomUser = 'user-' + Math.random().toString(36).substring(2, 8);
    setUserId(randomUser);
  };

  if (isInCall) {
    return (
      <VideoCallScreen 
        route={{ params: { roomId, userId } }}
        navigation={{
          goBack: () => setIsInCall(false)
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.content}>
        <Text style={styles.title}>WebRTC Video Call</Text>
        <Text style={styles.subtitle}>Enter details to join a video call</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter your name"
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.randomButton} onPress={generateRandomUser}>
            <Text style={styles.randomButtonText}>Random</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Room ID</Text>
          <TextInput
            style={styles.input}
            value={roomId}
            onChangeText={setRoomId}
            placeholder="Enter room ID or generate one"
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.randomButton} onPress={generateRandomRoom}>
            <Text style={styles.randomButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.joinButton} onPress={joinCall}>
          <Text style={styles.joinButtonText}>📹 Join Video Call</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How to use:</Text>
          <Text style={styles.infoText}>
            1. Enter your name{'\n'}
            2. Enter a room ID or generate one{'\n'}
            3. Share the room ID with someone{'\n'}
            4. Both users join the same room{'\n'}
            5. Start video calling!
          </Text>
        </View>

        <View style={styles.serverInfo}>
          <Text style={styles.serverText}>
            Connected to: https://your-app-name.onrender.com
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  randomButton: {
    position: 'absolute',
    right: 10,
    top: 35,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  randomButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  serverInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  serverText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default App;