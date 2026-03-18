import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { createClub, joinClub, fetchClubDetails, fetchUserDetails, generateInviteCode } from '../utils/clubUtils';
import { Users, Plus, UserPlus, Copy, LogOut, Info } from 'lucide-react-native';
import { Club, User } from '../types';

const ClubScreen = () => {
  const { user, setUser, activeClub, setActiveClub, isLoading, setLoading } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [clubName, setClubName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [memberDetails, setMemberDetails] = useState<User[]>([]);

  // Mock User for development if none exists
  useEffect(() => {
    if (!user) {
      setUser({
        uid: 'dev_user_123',
        name: 'Dev User',
        email: 'dev@example.com',
        avatar: '',
        clubs: []
      });
    }
  }, [user]);

  // Fetch club details if user has clubs but no active club
  useEffect(() => {
    const initClub = async () => {
      if (user && user.clubs.length > 0 && !activeClub) {
        if (!isFirebaseConfigured) return;
        setLoading(true);
        const club = await fetchClubDetails(user.clubs[0]);
        if (club) setActiveClub(club);
        setLoading(false);
      }
    };
    initClub();
  }, [user, activeClub]);

  // Fetch member names when active club changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (activeClub && isFirebaseConfigured) {
        const details = await Promise.all(
          activeClub.members.map(uid => fetchUserDetails(uid))
        );
        setMemberDetails(details.filter(d => d !== null) as User[]);
      }
    };
    fetchMembers();
  }, [activeClub]);

  const handleCreateClub = async () => {
    if (!clubName.trim() || !user) return;
    try {
      setLoading(true);

      if (!isFirebaseConfigured) {
        // DEV MODE: Mock a successful creation
        console.log("Firebase not configured. Using Mock Club.");
        const mockClub: Club = {
          clubId: `mock_${Date.now()}`,
          name: clubName,
          adminUid: user.uid,
          inviteCode: generateInviteCode(),
          members: [user.uid]
        };
        setActiveClub(mockClub);
        setUser({ ...user, clubs: [...user.clubs, mockClub.clubId] });
        setIsCreating(false);
        setClubName('');
        return;
      }

      console.log("Attempting to create club:", clubName, "for user:", user.uid);
      const newClub = await createClub(clubName, user.uid);
      console.log("Club created successfully:", newClub.clubId);
      setActiveClub(newClub);
      setUser({ ...user, clubs: [...user.clubs, newClub.clubId] });
      setIsCreating(false);
      setClubName('');
    } catch (error: any) {
      console.error("Error creating club:", error);
      Alert.alert('Error', `Failed to create club: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async () => {
    if (!inviteCode.trim() || !user) return;
    try {
      setLoading(true);

      if (!isFirebaseConfigured) {
        Alert.alert('Dev Mode', 'Firebase is not configured. Join club mock only.');
        return;
      }

      const joinedClub = await joinClub(inviteCode, user.uid);
      setActiveClub(joinedClub);
      setUser({ ...user, clubs: [...user.clubs, joinedClub.clubId] });
      setIsJoining(false);
      setInviteCode('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join club');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (activeClub) {
      Alert.alert('Invite Code', `Your club invite code is: ${activeClub.inviteCode}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.containerFull}>
      {!isFirebaseConfigured && (
        <View style={styles.devNotice}>
          <Info color="#856404" size={16} />
          <Text style={styles.devNoticeText}>
            Firebase not configured. Running in Mock Mode.
          </Text>
        </View>
      )}
      
      {!activeClub ? (
        <View style={styles.container}>
          <Users color="#FF6B6B" size={80} strokeWidth={1.5} style={{ marginBottom: 20 }} />
          <Text style={styles.title}>Welcome to MealMates</Text>
          <Text style={styles.subtitle}>Join a club with your roommates or create a new one to start tracking meals.</Text>

          {isCreating ? (
            <View style={styles.form}>
              <TextInput 
                style={styles.input} 
                placeholder="Enter Club Name (e.g., Room 402)" 
                value={clubName}
                onChangeText={setClubName}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateClub}>
                <Text style={styles.buttonText}>Create Club</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsCreating(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : isJoining ? (
            <View style={styles.form}>
              <TextInput 
                style={styles.input} 
                placeholder="Enter 6-digit Invite Code" 
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleJoinClub}>
                <Text style={styles.buttonText}>Join Club</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsJoining(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setIsCreating(true)}>
                <Plus color="white" size={20} />
                <Text style={styles.buttonText}>Create New Club</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsJoining(true)}>
                <UserPlus color="#FF6B6B" size={20} />
                <Text style={styles.secondaryButtonText}>Join with Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            <Text style={styles.clubName}>{activeClub.name}</Text>
            <TouchableOpacity style={styles.inviteContainer} onPress={copyToClipboard}>
              <Text style={styles.inviteLabel}>Invite Code:</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{activeClub.inviteCode}</Text>
                <Copy color="#6C757D" size={16} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.memberSection}>
            <Text style={styles.sectionTitle}>Members ({activeClub.members.length})</Text>
            <FlatList
              data={memberDetails.length > 0 ? memberDetails : [{ uid: user?.uid || '1', name: user?.name || 'You' }]}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <View style={styles.memberItem}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{item.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberStatus}>{activeClub.adminUid === item.uid ? 'Admin' : 'Member'}</Text>
                  </View>
                </View>
              )}
            />
          </View>

          <TouchableOpacity 
            style={styles.leaveButton} 
            onPress={() => setActiveClub(null)}
          >
            <LogOut color="#DC3545" size={20} />
            <Text style={styles.leaveButtonText}>Switch Club</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  containerFull: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devNotice: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  devNoticeText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  buttonGroup: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    alignItems: 'center',
    gap: 15,
  },
  input: {
    width: '100%',
    backgroundColor: '#F1F3F5',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
  },
  cancelText: {
    color: '#6C757D',
    fontSize: 14,
    marginTop: 5,
  },
  headerCard: {
    backgroundColor: 'white',
    padding: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  clubName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 15,
  },
  inviteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  codeBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
    letterSpacing: 1,
  },
  memberSection: {
    flex: 1,
    padding: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    gap: 15,
  },
  avatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFE3E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  memberStatus: {
    fontSize: 12,
    color: '#6C757D',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  leaveButtonText: {
    color: '#DC3545',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ClubScreen;
