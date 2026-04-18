import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  Modal,
  TextInput,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { isFirebaseConfigured, auth, db, storage } from '../services/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Users, 
  LogOut, 
  ChevronRight, 
  Settings,
  Bell,
  HelpCircle,
  Info,
  Camera,
  X,
  Check
} from 'lucide-react-native';

const ProfileScreen = () => {
  const { user, setUser, activeClub, setActiveClub, isLoading, setLoading } = useAppStore();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newAvatar, setNewAvatar] = useState(user?.avatar || '');
  const [updating, setUpdating] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (isFirebaseConfigured) {
                await signOut(auth);
              }
              setUser(null);
              setActiveClub(null);
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setNewAvatar(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    if (!newName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setUpdating(true);
    try {
      let finalAvatarUrl = user.avatar;

      if (isFirebaseConfigured) {
        // 1. Upload new image if changed
        if (newAvatar !== user.avatar && newAvatar.startsWith('file://')) {
          const response = await fetch(newAvatar);
          const blob = await response.blob();
          const storageRef = ref(storage, `avatars/${user.uid}`);
          await uploadBytes(storageRef, blob);
          finalAvatarUrl = await getDownloadURL(storageRef);
        }

        // 2. Update Firebase Auth
        await updateProfile(auth.currentUser!, {
          displayName: newName,
          photoURL: finalAvatarUrl
        });

        // 3. Update Firestore
        await updateDoc(doc(db, 'users', user.uid), {
          name: newName,
          avatar: finalAvatarUrl
        });
      }

      // 4. Update Local Store
      setUser({
        ...user,
        name: newName,
        avatar: finalAvatarUrl
      });

      setIsEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: any) {
      console.error("Profile update error:", error);
      Alert.alert("Error", "Failed to update profile: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const renderItem = (icon: any, title: string, subtitle?: string, onPress?: () => void, color: string = "#495057") => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress}>
      <View style={[styles.iconWrapper, { backgroundColor: color + "10" }]}>
        {React.cloneElement(icon, { size: 20, color: color })}
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {onPress && <ChevronRight color="#ADB5BD" size={20} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!isFirebaseConfigured && (
        <View style={styles.devNotice}>
          <Info color="#856404" size={16} />
          <Text style={styles.devNoticeText}>Running in Mock Mode.</Text>
        </View>
      )}

      {/* Header Profile Section */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{user.name[0]}</Text>
          )}
          <TouchableOpacity 
            style={styles.editBadge} 
            onPress={() => {
              setNewName(user.name);
              setNewAvatar(user.avatar);
              setIsEditModalVisible(true);
            }}
          >
            <Settings color="white" size={14} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{user.clubs.length}</Text>
          <Text style={styles.statLabel}>Clubs</Text>
        </View>
        <View style={[styles.statCard, styles.statCardCenter]}>
          <Text style={styles.statVal}>{activeClub ? 'Active' : 'None'}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>MVP</Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>
      </View>

      {/* Account Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          {renderItem(<UserIcon />, "Full Name", user.name)}
          <View style={styles.divider} />
          {renderItem(<Mail />, "Email Address", user.email)}
          <View style={styles.divider} />
          {renderItem(<Shield />, "User ID", user.uid.slice(0, 10) + "...")}
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.sectionCard}>
          {renderItem(<Users />, "Current Club", activeClub?.name || "None Joined", () => Alert.alert("Switch Club", "Use the Club tab to switch or join!"), "#FF6B6B")}
          <View style={styles.divider} />
          {renderItem(<Bell />, "Notifications", "On", () => {})}
          <View style={styles.divider} />
          {renderItem(<HelpCircle />, "Help & Support", undefined, () => {})}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color="#DC3545" size={20} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>MealMates v1.0.0 (Beta)</Text>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <X color="#212529" size={24} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleUpdateProfile} disabled={updating}>
                {updating ? (
                  <ActivityIndicator size="small" color="#FF6B6B" />
                ) : (
                  <Check color="#FF6B6B" size={24} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.editAvatarWrapper}>
                <View style={styles.largeAvatar}>
                  {newAvatar ? (
                    <Image source={{ uri: newAvatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.largeAvatarText}>{newName[0] || '?'}</Text>
                  )}
                  <TouchableOpacity style={styles.cameraBadge} onPress={pickImage}>
                    <Camera color="white" size={20} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={pickImage}>
                  <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Enter your name"
                  autoFocus
                />
              </View>

              <Text style={styles.inputHint}>
                This name will be visible to all your roommates in your clubs.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    paddingBottom: 40,
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
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE3E3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
  },
  userEmail: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -25,
  },
  statCard: {
    backgroundColor: 'white',
    flex: 1,
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 5,
  },
  statCardCenter: {
    borderWidth: 1,
    borderColor: '#FF6B6B20',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 10,
    marginLeft: 5,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 15,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F5',
    marginHorizontal: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 10,
    padding: 15,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC3545',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#ADB5BD',
    marginTop: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  modalBody: {
    padding: 20,
  },
  editAvatarWrapper: {
    alignItems: 'center',
    marginVertical: 30,
    gap: 15,
  },
  largeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFE3E3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  largeAvatarText: {
    fontSize: 50,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FF6B6B',
    padding: 10,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: 'white',
  },
  changePhotoText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 8,
    marginLeft: 5,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: '#212529',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  inputHint: {
    fontSize: 12,
    color: '#ADB5BD',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  }
});

export default ProfileScreen;
