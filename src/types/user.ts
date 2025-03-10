export type UserData = {
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  profileImage: string;
  userID: string;
  isOwner: boolean;
};

export type DogData = {
  dogname: string;
  profileImage: string;
  userID: string;
  breed: string;
  birthdate?: Date;
  gender: "male" | "female";
  isWalking: boolean;
  lastWalkingStatusUpdate?: Date;
};
