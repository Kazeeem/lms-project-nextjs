import { currentUser } from "@clerk/nextjs/server"

export const getUserRole = async() => {
    const user = await currentUser();

    if (!user) return null;

    const role = user.publicMetadata?.role as string;

    return role === 'admin' ? 'admin' : 'student';
}

export const getCurrentUserWithRole = async() => {
    const user = await currentUser();

    if (!user) return null;

    const role = await getUserRole();

    return {
        id: user.id,
        email: user.emailAddresses[0].emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        role: role,
    }
}