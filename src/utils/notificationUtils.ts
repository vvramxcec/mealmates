import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

export async function notifyRoommates(memberUids: string[], title: string, body: string) {
  const tokens: string[] = [];

  // Get tokens for all members
  const tokenPromises = memberUids.map(async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.pushToken) {
        return data.pushToken;
      }
    }
    return null;
  });

  const results = await Promise.all(tokenPromises);
  const validTokens = results.filter(t => t !== null) as string[];

  // Send notifications in parallel
  const sendPromises = validTokens.map(token => sendPushNotification(token, title, body));
  await Promise.all(sendPromises);
}
