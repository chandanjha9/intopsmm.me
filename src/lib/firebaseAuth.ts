import { firebaseAuth } from "@/integrations/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sign in using Firebase Email/Password and then obtain a Supabase session
 * using the same credentials. This keeps the rest of the app relying on
 * `useAuth` (Supabase) while allowing users to authenticate via Firebase.
 */
export async function signInWithFirebaseAndSupabase(email: string, password: string) {
  // Step 1 – Firebase auth
  const fbUserCredential = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password,
  );

  // Step 2 – Supabase auth (so the app’s useAuth hook works)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    // If Supabase fails, sign the user out of Firebase to keep states consistent
    await firebaseAuth.signOut();
    throw error;
  }

  // Return the Supabase session for any further handling if needed
  return data.session;
}
