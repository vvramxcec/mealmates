import { db } from '../services/firebase';
import { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  query, 
  where, 
  getDocs,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { Club, User } from '../types';
import { generateInviteCode } from './cryptoUtils';

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

export const kickMember = async (clubId: string, memberUid: string) => {
  const clubRef = doc(db, 'clubs', clubId);
  const userRef = doc(db, 'users', memberUid);

  // Remove user from club members
  await updateDoc(clubRef, {
    members: arrayRemove(memberUid)
  });

  // Remove club from user's clubs list
  await setDoc(userRef, {
    clubs: arrayRemove(clubId)
  }, { merge: true });
};

export const deleteClub = async (clubId: string, memberUids: string[]) => {
  // 1. Remove clubId from all members' clubs list
  const updatePromises = memberUids.map(uid => {
    const userRef = doc(db, 'users', uid);
    return setDoc(userRef, {
      clubs: arrayRemove(clubId)
    }, { merge: true });
  });

  await Promise.all(updatePromises);

  // 2. Delete the club document
  await deleteDoc(doc(db, 'clubs', clubId));
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
