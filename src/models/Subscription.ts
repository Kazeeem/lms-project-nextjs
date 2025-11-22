import mongoose, { Document, Model, Schema } from 'mongoose';

export interface SubscriptionInterface extends Document {
    userId: mongoose.Types.ObjectId;
    clerkId: string;
    status: 'pending' | 'completed' | 'failed';
    amount: number,
    currency: string,
    stripePaymentIntentId: string,
    stripeCustomerId?: string,
    purchaseDate: Date;
    activatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;

    activate(): void;
    isActive(): boolean;
};

const SubscriptionSchema: Schema<SubscriptionInterface> = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        default: 99,
    },
    currency: {
        type: String,
        default: 'USD'
    },
    stripePaymentIntentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    stripeCustomerId: {
        type: String,
        index: true,
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    activatedAt: {
        type: Date,
    }
}, {
    timestamps: true,
});

SubscriptionSchema.index({clerkId: 1, status: 1});

// Methods to mark payment as completed.
SubscriptionSchema.methods.activate = function (this: SubscriptionInterface) {
    this.status = 'completed';
    this.activatedAt = new Date();
};

SubscriptionSchema.methods.isActive = function (this: SubscriptionInterface) {
    return this.status === 'completed';
}


const Subscription: Model<SubscriptionInterface> = mongoose.models.Subscription || mongoose.model<SubscriptionInterface>("Subscription", SubscriptionSchema);

export default Subscription;