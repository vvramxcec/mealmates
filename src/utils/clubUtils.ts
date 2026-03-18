import { db } from '../services/firebase';
import { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  arrayUnion, 
  query, 
  where, 
  getDocs,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { Club, User } from '../types';

export const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createClub = async (name: string, adminUid: string) => {
  const inviteCode = generateInviteCode();
  const clubData: Omit<Club, 'clubId'> = {
    name,
    adminUid,
    inviteCode,
    members: [adminUid],
  };

  const docRef = await addDoc(collection(db, 'clubs'), clubData);
  const clubId = docRef.id;
  
  // Update club with its own ID (optional but helpful)
  await updateDoc(docRef, { clubId });

  // Update user's clubs list
  const userRef = doc(db, 'users', adminUid);
  await setDoc(userRef, {
    clubs: arrayUnion(clubId)
  }, { merge: true });

  return { ...clubData, clubId } as Club;
};

export const joinClub = async (inviteCode: string, userUid: string) => {
  const q = query(collection(db, 'clubs'), where('inviteCode', '==', inviteCode.toUpperCase()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Invalid invite code');
  }

  const clubDoc = querySnapshot.docs[0];
  const clubId = clubDoc.id;
  const clubData = clubDoc.data() as Club;

  if (clubData.members.includes(userUid)) {
    throw new Error('Already a member of this club');
  }

  // Add user to club members
  await updateDoc(doc(db, 'clubs', clubId), {
    members: arrayUnion(userUid)
  });

  // Add club to user's clubs list
  await setDoc(doc(db, 'users', userUid), {
    clubs: arrayUnion(clubId)
  }, { merge: true });

  return { ...clubData, clubId } as Club;
};

export const fetchClubDetails = async (clubId: string) => {
  const docRef = doc(db, 'clubs', clubId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...docSnap.data(), clubId: docSnap.id } as Club;
  }
  return null;
};

export const fetchUserDetails = async (uid: string) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as User;
  }
  return null;
};
