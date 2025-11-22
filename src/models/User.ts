import mongoose, { Document, Model, Schema } from "mongoose";

export interface UserInterface extends Document {
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema<UserInterface> = new Schema({
    clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    firstName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    imageUrl: {
        type: String,
    },
}, {
    timestamps: true,
});

const User: Model<UserInterface> = mongoose.models.User || mongoose.model<UserInterface>("User", UserSchema);

export default User;