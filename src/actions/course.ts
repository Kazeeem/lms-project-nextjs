"use server";

import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Subscription from "@/models/Subscription";
import UserProgress from "@/models/UserProgress";
import { uploadBase64ImageToCloudinary } from '@/utils/cloudinary';

/**
 * Admin: Add a module to a course
 */
export async function addModuleToCourse(
  slug: string,
  data: {
    title: string;
    description?: string;
    order: number;
  }
) {
  try {
    await connectDB();
    const course = await Course.findOne({ slug: slug.toLowerCase() });
    if (!course) {
      return { success: false, error: 'Course not found' };
    }
    course.modules.push({
      title: data.title,
      description: data.description,
      order: data.order,
      lessons: [],
    } as any);
    await course.save();
    return { success: true, course: JSON.parse(JSON.stringify(course)) };
  } catch (error: any) {
    console.error('Error adding module:', error);
    return { success: false, error: error?.message || 'Failed to add module' };
  }
}

/**
 * Admin: Add a lesson to a module within a course
 */
export async function addLessonToModule(
  slug: string,
  moduleId: string,
  data: {
    title: string;
    description?: string;
    videoUrl?: string;
    videoDuration?: number;
    order: number;
    isFree?: boolean;
  }
) {
  try {
    await connectDB();
    const course = await Course.findOne({ slug: slug.toLowerCase() });
    if (!course) {
      return { success: false, error: 'Course not found' };
    }
    const module = course.modules.find((m: any) => m._id.toString() === moduleId);
    if (!module) {
      return { success: false, error: 'Module not found' };
    }
    (module as any).lessons.push({
      title: data.title,
      description: data.description,
      videoUrl: data.videoUrl,
      videoDuration: data.videoDuration,
      order: data.order,
      isFree: data.isFree ?? false,
    });
    // Mark modified subdocument path
    (module as any).markModified?.('lessons');
    await course.save();
    return { success: true, course: JSON.parse(JSON.stringify(course)) };
  } catch (error: any) {
    console.error('Error adding lesson:', error);
    return { success: false, error: error?.message || 'Failed to add lesson' };
  }
}

/**
 * Admin: Create a new course
 */
export async function createCourse(data: {
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  // Thumbnail (Cloudinary)
  thumbnail?: { public_id: string; url: string } | string | null;
  thumbnailPublicId?: string;
  thumbnailUrl?: string;
  category: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  price?: number;
  currency?: string;
  isFree?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}) {
  try {
    await connectDB();
    const payload: Partial<ICourse> = {
      title: data.title,
      slug: data.slug.toLowerCase(),
      description: data.description,
      shortDescription: data.shortDescription,
      thumbnail: data.thumbnail
        ? (data.thumbnail as any)
        : data.thumbnailPublicId && data.thumbnailUrl
          ? { public_id: data.thumbnailPublicId, url: data.thumbnailUrl }
          : undefined,
      category: data.category,
      tags: data.tags,
      difficulty: data.difficulty || 'beginner',
      language: data.language || 'en',
      price: data.price,
      currency: data.currency || 'USD',
      isFree: data.isFree ?? false,
      isPublished: data.isPublished ?? false,
      isFeatured: data.isFeatured ?? false,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      enrolledCount: 0,
      completedCount: 0,
    } as any;
    const created = await Course.create(payload);
    return { success: true, course: JSON.parse(JSON.stringify(created)) };
  } catch (error: any) {
    console.error('Error creating course:', error);
    return { success: false, error: error?.message || 'Failed to create course' };
  }
}

/**
 * Admin: Update course thumbnail
 */
export async function updateCourseThumbnail(
  slug: string,
  thumbnail: { public_id: string; url: string } | null
) {
  try {
    await connectDB();
    const updated = await Course.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      { thumbnail },
      { new: true }
    );
    if (!updated) {
      return { success: false, error: 'Course not found' };
    }
    return { success: true, course: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error('Error updating thumbnail:', error);
    return { success: false, error: error?.message || 'Failed to update thumbnail' };
  }
}

/**
 * Admin: Remove course thumbnail
 */
export async function removeCourseThumbnail(slug: string) {
  try {
    await connectDB();
    const updated = await Course.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      { thumbnail: null },
      { new: true }
    );
    if (!updated) {
      return { success: false, error: 'Course not found' };
    }
    return { success: true, course: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error('Error removing thumbnail:', error);
    return { success: false, error: error?.message || 'Failed to remove thumbnail' };
  }
}

/**
 * Admin: Upload thumbnail from base64 and return { public_id, url }
 */
export async function uploadThumbnailBase64(imageBase64: string) {
  'use server';
  try {
    const result = await uploadBase64ImageToCloudinary(imageBase64);
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Error uploading thumbnail:', error);
    return { success: false, error: error?.message || 'Failed to upload thumbnail' };
  }
}

/**
 * Admin: Replace course thumbnail from base64
 */
export async function replaceCourseThumbnailFromBase64(slug: string, imageBase64: string) {
  'use server';
  try {
    const uploaded = await uploadBase64ImageToCloudinary(imageBase64);
    const updated = await updateCourseThumbnail(slug, uploaded);
    return updated;
  } catch (error: any) {
    console.error('Error replacing course thumbnail:', error);
    return { success: false, error: error?.message || 'Failed to replace thumbnail' };
  }
}

/**
 * Admin: Get a course by id or slug
 */
export async function getCourseAdmin(identifier: { id?: string; slug?: string }) {
  try {
    await connectDB();
    const query = identifier.id ? { _id: identifier.id } : { slug: identifier.slug?.toLowerCase() };
    const course = await Course.findOne(query).lean();
    if (!course) {
      return { success: false, error: 'Course not found' };
    }
    return { success: true, course: JSON.parse(JSON.stringify(course)) };
  } catch (error) {
    console.error('Error fetching course (admin):', error);
    return { success: false, error: 'Failed to fetch course' };
  }
}

/**
 * Admin: Update a course
 */
export async function updateCourse(
  identifier: { id?: string; slug?: string },
  data: Partial<{
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;
    category: string;
    tags?: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    language: string;
    price?: number;
    currency?: string;
    isFree?: boolean;
    isPublished?: boolean;
    isFeatured?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  }>
) {
  try {
    await connectDB();
    const query = identifier.id ? { _id: identifier.id } : { slug: identifier.slug?.toLowerCase() };
    const update: any = { ...data };
    if (update.slug) update.slug = update.slug.toLowerCase();
    const updated = await Course.findOneAndUpdate(query, update, { new: true });
    if (!updated) {
      return { success: false, error: 'Course not found' };
    }
    return { success: true, course: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error('Error updating course:', error);
    return { success: false, error: error?.message || 'Failed to update course' };
  }
}

/**
 * Get featured courses
 */
export async function getFeaturedCourses() {
  try {
    await connectDB();
    const courses = await Course.find({ isPublished: true, isFeatured: true })
      .sort({ rating: -1 })
      .limit(6)
      .lean();
    return { success: true, courses: JSON.parse(JSON.stringify(courses)) };
  } catch (error) {
    console.error('Error fetching featured courses:', error);
    return { success: false, error: 'Failed to fetch featured courses' };
  }
}

/**
 * Get a single course by slug
 */
export async function getCourseBySlug(slug: string) {
  try {
    await connectDB();
    const course = await Course.findOne({ slug, isPublished: true }).lean();
    
    if (!course) {
      return { success: false, error: 'Course not found' };
    }
    
    return { success: true, course: JSON.parse(JSON.stringify(course)) };
  } catch (error) {
    console.error('Error fetching course:', error);
    return { success: false, error: 'Failed to fetch course' };
  }
}

/**
 * Get courses by category
 */
export async function getCoursesByCategory(category: string) {
  try {
    await connectDB();
    const courses = await Course.find({ 
      category, 
      isPublished: true 
    })
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, courses: JSON.parse(JSON.stringify(courses)) };
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    return { success: false, error: 'Failed to fetch courses' };
  }
}

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
            const progressRecords = await UserProgress.find({ clerkId })
                .sort({ lastAccessedAt: -1 })
                .lean();
            
            if (progressRecords.length === 0) {
                return { success: true, courses: [], subscription: false };
            }
            
            const courseIds = progressRecords.map(p => p.courseId);
            const courses = await Course.find({ 
                _id: { $in: courseIds } 
            }).lean();
            
            const coursesWithProgress = courses.map(course => {
                const progress = progressRecords.find(
                    p => p.courseId === course._id.toString()
                );
                
                // Count actual completed lessons
                let completedLessonsCount = 0;
                if (progress?.modules) {
                    progress.modules.forEach((module: any) => {
                        if (module.lessons) {
                        completedLessonsCount += module.lessons.filter((l: any) => l.completed).length;
                        }
                    });
                }
                
                return {
                    ...course,
                    progress: progress?.overallProgress || 0,
                    completedLessonsCount, // Add actual count
                    lastAccessed: progress?.lastAccessedAt,
                    isCompleted: progress?.isCompleted || false,
                };
            });
            
            return { 
                success: true, 
                courses: JSON.parse(JSON.stringify(coursesWithProgress)),
                subscription: false
            };
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

/**
 * Update lesson completion status and recalculate progress
 */
export async function updateLessonCompletion(
  clerkId: string,
  courseId: string,
  lessonId: string,
  completed: boolean
) {
  try {
    await connectDB();
    
    const progress = await UserProgress.findOne({ clerkId, courseId });
    if (!progress) {
      return { success: false, error: 'Progress record not found' };
    }
    
    // Find and update the lesson
    let lessonFound = false;
    for (const module of progress.modules) {
      const lesson = module.lessons.find((l: any) => l.lessonId === lessonId);
      if (lesson) {
        lesson.completed = completed;
        lessonFound = true;
        break;
      }
    }
    
    if (!lessonFound) {
      return { success: false, error: 'Lesson not found' };
    }
    
    // Recalculate progress
    const totalLessons = progress.modules.reduce(
      (sum: number, m: any) => sum + m.lessons.length,
      0
    );
    const completedLessons = progress.modules.reduce(
      (sum: number, m: any) => 
        sum + m.lessons.filter((l: any) => l.completed).length,
      0
    );
    
    progress.overallProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;
    
    // Update module progress
    progress.modules.forEach((module: any) => {
      const moduleTotal = module.lessons.length;
      const moduleCompleted = module.lessons.filter((l: any) => l.completed).length;
      module.progress = moduleTotal > 0 
        ? Math.round((moduleCompleted / moduleTotal) * 100) 
        : 0;
      module.completed = module.progress === 100;
    });
    
    // Check if course is complete
    progress.isCompleted = progress.overallProgress === 100;
    if (progress.isCompleted && !progress.completedAt) {
      progress.completedAt = new Date();
    }
    
    progress.lastAccessedAt = new Date();
    await progress.save();
    
    return {
      success: true,
      progress: progress.overallProgress,
      isCompleted: progress.isCompleted,
    };
  } catch (error) {
    console.error('Error updating lesson completion:', error);
    return { success: false, error: 'Failed to update lesson completion' };
  }
}

/**
 * Get user progress for a specific course
 */
export async function getUserCourseProgress(clerkId: string, courseId: string) {
  try {
    await connectDB();
    
    const progress = await UserProgress.findOne({ clerkId, courseId }).lean();
    if (!progress) {
      return { success: false, error: 'Progress not found' };
    }
    
    return {
      success: true,
      progress: JSON.parse(JSON.stringify(progress)),
    };
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return { success: false, error: 'Failed to fetch progress' };
  }
}

/**
 * Enroll user in a course
 */
export async function enrollInCourse(clerkId: string, courseId: string) {
  try {
    await connectDB();
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, error: 'Course not found' };
    }
    
    // Check if already enrolled
    const existingProgress = await UserProgress.findOne({ clerkId, courseId });
    if (existingProgress) {
      return { success: false, error: 'Already enrolled in this course' };
    }
    
    // Create progress tracking structure from course modules
    const modules = course.modules.map((module) => ({
      moduleId: module._id?.toString() || '',
      completed: false,
      progress: 0,
      lessons: module.lessons.map((lesson) => ({
        lessonId: lesson._id?.toString() || '',
        completed: false,
        lastWatchedPosition: 0,
        timeSpent: 0,
      })),
    }));
    
    // Create user progress
    const progress = await UserProgress.create({
      userId: clerkId, // You might want to use MongoDB user ID instead
      clerkId,
      courseId,
      modules,
      overallProgress: 0,
      enrolledAt: new Date(),
      lastAccessedAt: new Date(),
    });
    
    // Increment enrolled count on course
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrolledCount: 1 },
    });
    
    return { 
      success: true, 
      progress: JSON.parse(JSON.stringify(progress)) 
    };
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return { success: false, error: 'Failed to enroll in course' };
  }
}

/**
 * Mark a lesson as completed
 */
export async function completeLesson(
  clerkId: string, 
  courseId: string, 
  moduleId: string, 
  lessonId: string
) {
  try {
    await connectDB();
    
    const progress = await UserProgress.findOne({ clerkId, courseId });
    
    if (!progress) {
      return { success: false, error: 'Not enrolled in this course' };
    }
    
    // Use the method we defined on the model
    progress.completeLesson(moduleId, lessonId);
    progress.updateLastAccessed();
    await progress.save();
    
    // If course is completed, increment completed count
    if (progress.isCompleted && progress.completedAt) {
      await Course.findByIdAndUpdate(courseId, {
        $inc: { completedCount: 1 },
      });
    }
    
    return { 
      success: true, 
      progress: JSON.parse(JSON.stringify(progress)) 
    };
  } catch (error) {
    console.error('Error completing lesson:', error);
    return { success: false, error: 'Failed to complete lesson' };
  }
}