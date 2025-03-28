export type UserData = {
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  profileImage: string;
  userID: string;
  isOwner: boolean;
  comment?: string;
};

export type DogData = {
  dogname: string;
  id: string;
  profileImage: string;
  userID: string;
  breed: string;
  birthdate?: Date;
  gender: "male" | "female";
  isWalking: boolean;
  lastWalkingStatusUpdate?: Date;
};
