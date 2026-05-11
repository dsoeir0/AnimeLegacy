import { useEffect, useState } from 'react';
import { peekUserProfile, subscribeToUserProfile } from '../lib/firebase/userProfileStore';

export default function useUserProfile(uid) {
  const [profile, setProfile] = useState(() => peekUserProfile(uid));

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return undefined;
    }
    return subscribeToUserProfile(uid, setProfile);
  }, [uid]);

  return profile;
}
