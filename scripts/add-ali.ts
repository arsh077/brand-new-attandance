import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userEmail = "ali@legalsuccessindia.com";
const userPassword = "Legal@010";

async function addAli() {
  try {
    console.log("Creating user in Authentication...");
    const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
    const uid = userCredential.user.uid;
    console.log("User created in Auth with UID:", uid);

    console.log("Adding user to Firestore...");
    // Let's generate an EMP ID like EMP1234
    const empId = `EMP${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const employee = {
      id: empId,
      name: "ali",
      email: userEmail,
      phone: "+91 0000000000",
      designation: "Employee",
      department: "General",
      salary: 1,
      role: "EMPLOYEE",
      status: "ACTIVE",
      dateJoined: new Date().toISOString().split('T')[0],
      dateOfBirth: "2010-01-01",
      leaveBalance: { CASUAL: 10, SICK: 10, EARNED: 10, LOP: 0 }
    };

    await setDoc(doc(db, "employees", empId), employee);
    console.log("Employee record created in Firestore with ID:", empId);

    console.log("Done! You can now log in as ali.");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Email is already in use in Auth. Let's just create the firestore record.");
      try {
        const empId = `EMP${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const employee = {
          id: empId,
          name: "ali",
          email: userEmail,
          phone: "+91 0000000000",
          designation: "Employee",
          department: "General",
          salary: 1,
          role: "EMPLOYEE",
          status: "ACTIVE",
          dateJoined: new Date().toISOString().split('T')[0],
          dateOfBirth: "2010-01-01",
          leaveBalance: { CASUAL: 10, SICK: 10, EARNED: 10, LOP: 0 }
        };
        await setDoc(doc(db, "employees", empId), employee);
        console.log("Employee record created in Firestore with ID:", empId);
        console.log("Done! You can now log in as ali.");
      } catch(err) {
        console.error("Error writing to firestore:", err);
      }
      process.exit(0);
    } else {
      console.error("Error creating user:", error);
      process.exit(1);
    }
  }
}

addAli();
