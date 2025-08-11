import { signInAnonymously, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Test Firebase connection by performing basic operations
 */
export class FirebaseConnectionTester {
  private testDocId = 'connection-test';
  private testCollectionName = 'test-connection';

  /**
   * Test Firestore connection by writing and reading a document
   */
  async testFirestore(): Promise<{ success: boolean; message: string }> {
    try {
      const testData = {
        timestamp: new Date().toISOString(),
        message: 'Firebase connection test',
        appName: 'FieldBook'
      };

      // Write test document
      const testDocRef = doc(collection(db, this.testCollectionName), this.testDocId);
      await setDoc(testDocRef, testData);

      // Read test document
      const docSnap = await getDoc(testDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Clean up - delete test document
        await deleteDoc(testDocRef);
        
        return {
          success: true,
          message: `Firestore connection successful! Test data: ${JSON.stringify(data)}`
        };
      } else {
        return {
          success: false,
          message: 'Failed to read test document from Firestore'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Firestore connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test Firebase Auth connection by signing in anonymously
   */
  async testAuth(): Promise<{ success: boolean; message: string }> {
    try {
      // Sign in anonymously
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      if (user) {
        // Sign out to clean up
        await signOut(auth);
        
        return {
          success: true,
          message: `Auth connection successful! Anonymous user ID: ${user.uid}`
        };
      } else {
        return {
          success: false,
          message: 'Failed to authenticate anonymously'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide specific guidance for common auth setup issues
      if (errorMessage.includes('admin-restricted-operation')) {
        return {
          success: false,
          message: `Auth setup required: Anonymous authentication is not enabled in Firebase Console. 
          
Setup Steps:
1. Go to Firebase Console (console.firebase.google.com)
2. Select your project: fieldbook-sudip
3. Go to Authentication > Sign-in method
4. Enable "Anonymous" provider
5. Save and try again

Error: ${errorMessage}`
        };
      }
      
      if (errorMessage.includes('auth/configuration-not-found')) {
        return {
          success: false,
          message: `Auth not configured: Authentication service not set up in Firebase project.
          
Setup Steps:
1. Go to Firebase Console
2. Select your project: fieldbook-sudip  
3. Go to Authentication > Get started
4. Set up Authentication service
5. Enable Anonymous sign-in method

Error: ${errorMessage}`
        };
      }
      
      return {
        success: false,
        message: `Auth connection failed: ${errorMessage}`
      };
    }
  }

  /**
   * Run comprehensive Firebase connection test
   */
  async runFullConnectionTest(): Promise<{
    firestore: { success: boolean; message: string };
    auth: { success: boolean; message: string };
    overall: boolean;
  }> {
    console.log('🔥 Starting Firebase connection tests...');
    
    const firestoreResult = await this.testFirestore();
    console.log('📄 Firestore test:', firestoreResult.success ? '✅' : '❌', firestoreResult.message);
    
    const authResult = await this.testAuth();
    console.log('🔐 Auth test:', authResult.success ? '✅' : '❌', authResult.message);
    
    const overall = firestoreResult.success && authResult.success;
    console.log('🎯 Overall result:', overall ? '✅ All tests passed!' : '❌ Some tests failed');
    
    return {
      firestore: firestoreResult,
      auth: authResult,
      overall
    };
  }
}

export const firebaseConnectionTester = new FirebaseConnectionTester();
