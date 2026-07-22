import { DocumentReference, Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'instructor' | 'student';

export interface User {
  id: string; // auth uid
  email: string;
  role: Role;
  displayName: string;
  createdAt: Timestamp;
}

export interface Student {
  id: string;
  userId: DocumentReference; // reference to users
  studentId: string;
  firstName: string;
  lastName: string;
  groupId: DocumentReference | null; // reference to studentGroups
  // other details
}

export interface Teacher {
  id: string;
  userId: DocumentReference; // reference to users
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  academicYear: number;
  semester: number;
  practiceHours: number;
  practicePeriod: string;
  studentGroups: DocumentReference[]; // reference to studentGroups
  practiceSites: DocumentReference[]; // reference to practiceSites
  status: 'active' | 'archived';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PracticeSite {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  contactNumber: string;
}

export interface StudentGroup {
  id: string;
  name: string;
  year: number;
}

export interface PracticeProject {
  id: string;
  courseId: DocumentReference; // reference to courses
  status: 'planning' | 'ongoing' | 'completed';
  progress: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StudentAssignment {
  id: string;
  projectId: DocumentReference; // reference to practiceProjects
  studentId: DocumentReference; // reference to students
  status: string;
  ward?: string;
  unit?: string;
  shift?: string;
  practiceDate?: Timestamp;
  startTime?: string;
  endTime?: string;
  practiceNotes?: string;
  primaryInstructorId?: DocumentReference;
  secondaryInstructorId?: DocumentReference;
}

export interface TeacherAssignment {
  id: string;
  projectId: DocumentReference; // reference to practiceProjects
  teacherId: DocumentReference; // reference to teachers
  role: string; // e.g., supervisor
}

export interface Room {
  id: string;
  siteId: DocumentReference; // reference to practiceSites
  name: string;
  capacity: number;
}

export interface Transportation {
  id: string;
  projectId: DocumentReference; // reference to practiceProjects
  driverName: string;
  vehicleNumber: string;
  departureTime: Timestamp;
}

export interface WelcomeSettings {
  hospitalLogo: string;
  universityLogo: string;
  welcomeBackground: string;
  teacherIllustration: string;
  studentIllustration: string;
  customIcons: string[];
  welcomeTitle: string;
  welcomeSubtitle: string;
  announcementText: string;
  enableCarousel: boolean;
  enableAutoSlide: boolean;
  theme: 'light' | 'dark' | 'blue';
}

export interface Payment {
  id: string;
  projectId: DocumentReference; // reference to practiceProjects
  userId: DocumentReference; // reference to users
  amount: number;
  status: string;
  date: Timestamp;
}

export interface Report {
  id: string;
  projectId: DocumentReference; // reference to practiceProjects
  authorId: DocumentReference; // reference to users
  content: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: DocumentReference; // reference to users
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}
