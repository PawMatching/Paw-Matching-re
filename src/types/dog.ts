// src/types/dog.ts
export interface Dog {
  id: string;
  dogname: string;
  sex: "male" | "female";
  profileImage: string;
  age: number;
  likes: string;
  notes: string;
  distance?: string;
  latitude: number;
  longitude: number;
  isWalking: boolean;
  userID: string;
  createdAt: string;
  updatedAt: string;
}
