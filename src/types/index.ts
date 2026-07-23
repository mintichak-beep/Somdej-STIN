import { DocumentReference, Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'instructor' | 'student';

export interface User {
  id: string; // auth uid
  email: string;
  role: Role;
  displayName: string;
  createdAt: Timestamp;
}

export interface Semester {
  id: string;
  academicYearId: string;
  semesterNumber: number;
  semesterName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt?: Timestamp;
}

export interface AcademicYear {
  id: string;
  year: string; // e.g., '2568'
  status: 'active' | 'inactive' | 'archived';
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
  credits: number;
  description: string;
  academicYear: number;
  semester: number;
  practiceHours: number;
  practicePeriod: string;
  practiceStartDate?: string;
  practiceEndDate?: string;
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
  address?: string;
  phone?: string;
  status?: string;
  capacity?: number;
}

export interface StudentGroup {
  id: string;
  name: string;
  courseId: DocumentReference; // reference to courses
  practiceSiteId: DocumentReference | null; // reference to practiceSites
  studentIds: DocumentReference[]; // array of references to students
  primaryInstructorId: DocumentReference | null; // reference to teachers
  secondaryInstructorId: DocumentReference | null; // reference to teachers
  practicePeriod?: string;
  status: 'active' | 'archived';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
  siteId?: DocumentReference; // reference to practiceSites
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

export interface Vehicle {
  id: string;
  name: string;
  registrationNumber: string;
  driverName: string;
  driverPhone?: string;
  capacity: number;
}

export interface Route {
  id: string;
  name: string;
  pickupPoint: string;
  stops: string[];
  destination: string;
}

export interface Transportation {
  id: string;
  projectId: DocumentReference; // reference to practiceProjects
  courseId: DocumentReference; // reference to courses
  vehicleId: DocumentReference; // reference to vehicles
  routeId: DocumentReference; // reference to routes
  siteId: DocumentReference; // reference to practiceSites
  pickupPoint: string;
  destination: string;
  travelDate: Timestamp;
  departureTime: string;
  returnTime: string;
  passengerIds: DocumentReference[]; // references to students
  instructorIds: DocumentReference[]; // references to teachers
  status: 'scheduled' | 'departed' | 'completed' | 'cancelled' | 'archived';
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

export interface Accommodation {
  id: string;
  projectId: DocumentReference; // reference to practiceProjects
  studentId: DocumentReference; // reference to students
  roomId: DocumentReference; // reference to rooms
  checkInDate: Timestamp;
  checkOutDate: Timestamp;
  waterCharge: number;
  notes?: string;
  status: 'active' | 'archived';
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
