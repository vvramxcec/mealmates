import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  FlatList,
  ActivityIndicator,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '../store/useAppStore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  createClub, 
  joinClub, 
  fetchClubDetails, 
  fetchUserDetails, 
  generateInviteCode,
  kickMember,
  deleteClub
} from '../utils/clubUtils';
import { Users, Plus, UserPlus, Copy, LogOut, Info, Trash2, UserMinus, Share2 } from 'lucide-react-native';
import { Club, User } from '../types';

const ClubScreen = () => {
  const { user, setUser, activeClub, setActiveClub, isLoading, setLoading } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [clubName, setClubName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [memberDetails, setMemberDetails] = useState<User[]>([]);

  const isAdmin = activeClub?.adminUid === user?.uid;

  // Real-time listener for club details
  useEffect(() => {
    if (!activeClub || !isFirebaseConfigured || activeClub.clubId.startsWith('mock_')) return;

    const unsubscribe = onSnapshot(doc(db, 'clubs', activeClub.clubId), async (docSnap) => {
      if (docSnap.exists()) {
        const updatedClub = { ...docSnap.data(), clubId: docSnap.id } as Club;
        
        // If members changed, fetch details again
        if (JSON.stringify(updatedClub.members) !== JSON.stringify(activeClub.members)) {
          const details = await Promise.all(
            updatedClub.members.map(uid => fetchUserDetails(uid))
          );
          setMemberDetails(details.filter(d => d !== null) as User[]);
        }
        
        setActiveClub(updatedClub);
      } else {
        // Club was deleted
        Alert.alert('Club Deleted', 'This club has been deleted by the admin.');
        setActiveClub(null);
        if (user) {
          setUser({ ...user, clubs: user.clubs.filter(id => id !== activeClub.clubId) });
        }
      }
    });

    return () => unsubscribe();
  }, [activeClub?.clubId]);

  // Initial fetch for member names when active club changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (activeClub && isFirebaseConfigured && memberDetails.length === 0) {
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

      const newClub = await createClub(clubName, user.uid);
      setActiveClub(newClub);
      setUser({ ...user, clubs: [...user.clubs, newClub.clubId] });
      setIsCreating(false);
      setClubName('');
    } catch (error: any) {
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

  const handleKick = (member: User) => {
    if (!activeClub) return;
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.name} from the club?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              if (isFirebaseConfigured) {
                await kickMember(activeClub.clubId, member.uid);
              } else {
                const updatedMembers = activeClub.members.filter(uid => uid !== member.uid);
                setActiveClub({ ...activeClub, members: updatedMembers });
              }
            } catch (error) {
              Alert.alert("Error", "Failed to remove member.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteClub = () => {
    if (!activeClub) return;
    Alert.alert(
      "Delete Club",
      "This action is permanent. All club data will be lost. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              if (isFirebaseConfigured) {
                await deleteClub(activeClub.clubId, activeClub.members);
              }
              setActiveClub(null);
            } catch (error) {
              Alert.alert("Error", "Failed to delete club.");
            }
          }
        }
      ]
    );
  };

  const handleLeaveClub = () => {
    if (!activeClub || !user) return;
    if (isAdmin) {
      Alert.alert("Action Required", "As an admin, you must delete the club or transfer ownership before leaving.");
      return;
    }

    Alert.alert(
      "Leave Club",
      "Are you sure you want to leave this club?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive",
          onPress: async () => {
            try {
              if (isFirebaseConfigured) {
                await kickMember(activeClub.clubId, user.uid);
              }
              setActiveClub(null);
            } catch (error) {
              Alert.alert("Error", "Failed to leave club.");
            }
          }
        }
      ]
    );
  };

  const copyToClipboard = async () => {
    if (activeClub) {
      await Clipboard.setStringAsync(activeClub.inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard.');
    }
  };

  const onShare = async () => {
    if (!activeClub) return;
    try {
      await Share.share({
        message: `Join my MealMates club "${activeClub.name}" using this invite code: ${activeClub.inviteCode}`,
      });
    } catch (error: any) {
      Alert.alert(error.message);
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
            <View style={styles.headerRow}>
              <Text style={styles.clubName}>{activeClub.name}</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            
            <View style={styles.inviteRow}>
              <TouchableOpacity style={styles.inviteContainer} onPress={copyToClipboard}>
                <Text style={styles.inviteLabel}>Invite Code:</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{activeClub.inviteCode}</Text>
                  <Copy color="#6C757D" size={16} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareButton} onPress={onShare}>
                <Share2 color="#FF6B6B" size={20} />
              </TouchableOpacity>
            </View>
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberStatus}>{activeClub.adminUid === item.uid ? 'Admin' : 'Member'}</Text>
                  </View>
                  {isAdmin && item.uid !== user?.uid && (
                    <TouchableOpacity onPress={() => handleKick(item)}>
                      <UserMinus color="#DC3545" size={20} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.switchButton} 
              onPress={() => setActiveClub(null)}
            >
              <LogOut color="#6C757D" size={20} />
              <Text style={styles.switchButtonText}>Switch Club</Text>
            </TouchableOpacity>

            <View style={styles.dangerZone}>
              {isAdmin ? (
                <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteClub}>
                  <Trash2 color="#DC3545" size={20} />
                  <Text style={styles.dangerButtonText}>Delete Club</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveClub}>
                  <UserMinus color="#DC3545" size={20} />
                  <Text style={styles.dangerButtonText}>Leave Club</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  containerFull: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  adminBadge: {
    backgroundColor: '#E7F5FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: '#1971C2',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  clubName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 5,
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
  shareButton: {
    backgroundColor: '#FFE3E3',
    padding: 8,
    borderRadius: 8,
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
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    gap: 10,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  switchButtonText: {
    color: '#6C757D',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 10,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  dangerButtonText: {
    color: '#DC3545',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ClubScreen;
