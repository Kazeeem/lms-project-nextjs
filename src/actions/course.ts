"use server";

import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Subscription from "@/models/Subscription";
import UserProgress from "@/models/UserProgress";

export async function activateSubscriptionAction(clerkId: string, stripePaymentIntentId: string, stripeCustomerId?: string) {
    try {
        await connectDB();

        const existingByPayment = await Subscription.findOne({stripePaymentIntentId});

        if (existingByPayment) {
            return {
                success: true,
                message: 'Subscription already processed',
                subscription: JSON.parse(JSON.stringify(existingByPayment)),
                alreadyProcessed: true,
            }
        }

        let subscription = await Subscription.findOne({clerkId});

        if (subscription) {
            subscription.status = 'completed';
            subscription.activatedAt = new Date();
            subscription.stripePaymentIntentId = stripePaymentIntentId;

            if (stripeCustomerId) {
                subscription.stripeCustomerId = stripeCustomerId;
            }

            await subscription.save()
        }
        else { // Create a new subscription
            subscription = await Subscription.create({
                clerkId,
                userId: clerkId,
                status: 'completed',
                amount: 99,
                currency: 'USD',
                stripePaymentIntentId,
                stripeCustomerId,
                purchaseDate: new Date(),
                activatedAt: new Date(),
            });
        }

        return {
            success: true,
            message: "Subscription activated",
            subscription: JSON.parse(JSON.stringify(subscription)),
            alreadyProcessed: false,
        }
    } catch (error) {
        console.log("Error activating subscription", error);
        
        return {
            success: false,
            message: 'Failed to activate subscription',
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

export async function checkSubscriptionAction(clerkId: string) {
    try {
        await connectDB();

        const subscription = await Subscription.findOne({
            clerkId,
            status: 'completed'
        });

        return {
            success: true,
            isSubscribed: !!subscription,
            subscription: subscription ? JSON.parse(JSON.stringify(subscription)) : null,
        }
    } catch (error) {
        console.log('Error checking subscription:', error);
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            isSubscribed: false,
            subscription: null,
        }
    }
}

export const getUserCourses = async(clerkId: string) => {
    try {
        await connectDB();

        const subscriptionCheck = await checkSubscriptionAction(clerkId);

        if (subscriptionCheck.isSubscribed) {
            const allCourses = await Course.find({isPublished: true}).sort({createdAt: -1}).lean();

            const progressRecords = await UserProgress.find({clerkId}).lean();

            const coursesWithProgress = await Promise.all(
                allCourses.map(async (course) => {
                    let progress = progressRecords.find(p => p.courseId === course._id.toString());

                    if (!progress) {
                        const newProgress = await createProgressForCourse(clerkId, course._id.toString());
                        progress = (newProgress as any) ?? undefined;
                    }

                    let completedLessonsCount = 0;

                    if (progress?.modules) {
                        progress.modules.forEach((module: any) => {
                            if (module.lessons) {
                                completedLessonsCount += module.lessons.filter((lesson: any) => lesson.completed).length;
                            }
                        })
                    }

                    return {
                        ...course,
                        progress: progress?.overallProgress || 0,
                        completedLessonsCount,
                        lastAccessedAt: progress?.lastAccessedAt || new Date(),
                        isCompleted: progress?.isCompleted || false,
                    }
                })
            )

            return {
                success: true,
                courses: JSON.parse(JSON.stringify(coursesWithProgress)),
                subscription: true,
            }
        }
        else { // No subscription, show only manually enrolled courses
            // Do nothing for now.
        }
    } catch (error) {
        console.log("Error getting user courses", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            courses: [],
            subscription: false,
        }
    }
}

const createProgressForCourse = async(clerkId: string, courseId: string) => {
    try {
        const course = await Course.findById(courseId);
        if (!course) return null;

        const modules = course.modules.map((module) => ({
            moduleId: module._id?.toString() || '',
            completed: false,
            progress: 0,
            lessons: module.lessons.map((lesson) => ({
                lessonId: lesson._id?.toString() || '',
                completed: false,
                lastWatchedPosition: 0,
                timeSpent: 0,
            }))
        }))

        const progress = await UserProgress.create({
            userId: clerkId,
            clerkId,
            courseId,
            modules,
            overallProgress: 0,
            isCompleted: false,
            ienrolledAt: new Date(),
            lastAccessedAt: new Date(),
            totalTimeSpent: 0,
        });

        return progress.toObject();
    } catch (error) {
        console.log("Error creating progress for course:", error);
        return null;
    }
}

export const getUserStreak = async (clerkId: string) => {
    try {
        await connectDB();

        const progressRecords = await UserProgress.find({clerkId}).sort({lastAccessedAt: -1}).lean();

        if (progressRecords.length === 0) {
            return {
                success: true,
                streak: 0,
                lastActive: null
            }
        }

        const activityDates = progressRecords.filter(p => p.lastAccessedAt).map(p => {
            const date = new Date(p.lastAccessedAt);
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        })

        const uniqueDates = [...new Set(activityDates)].sort((a, b) => a - b);

        const today = new Date();

        today.setHours(0,0,0,0);

        const todayTime = today.getTime();

        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

        const mostRecentActivity = uniqueDates[0];

        const daysSinceActivity = Math.floor((todayTime - mostRecentActivity) / oneDayInMilliseconds);

        if (daysSinceActivity > 1) {
            return {
                success: true,
                streak: 0,
                lastActive: new Date(mostRecentActivity),
            }
        }

        let streak = 1;

        let currentDate = mostRecentActivity;

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = uniqueDates[i];
            const dayDiff = Math.floor((currentDate - prevDate) / oneDayInMilliseconds);

            if (dayDiff === 1) {
                streak++;
                currentDate = prevDate;
            }
            else {
                break;
            }
        }

        return {
            success: true,
            streak,
            lastActive: new Date(currentDate),
        }
    } catch (error) {
        console.log('Error getting user streak', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            streak: 0,
            lastActive: null,
        }
    }
}