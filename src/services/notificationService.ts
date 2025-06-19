import { User, IUser } from "../models/User";

/**
 * Notification payload structure
 */
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Send a notification to all active users
 * @param notification - The notification payload
 */
export const sendNotification = async (
  notification: NotificationPayload
): Promise<number> => {
  try {
    // Find all users with notification tokens
    const users = await User.find({
      notificationToken: { $exists: true, $ne: null },
      isActive: true,
    });

    if (!users || users.length === 0) {
      console.log("No users with notification tokens found");
      return 0;
    }

    // In a real implementation, you would use a service like Firebase Cloud Messaging
    // or another push notification service to send the notifications
    // This is a placeholder implementation

    console.log(
      `Sending notification "${notification.title}" to ${users.length} users`
    );

    // For each user with a notification token, send the notification
    const notificationPromises = users.map((user: IUser) => {
      // This would be replaced with actual notification sending code
      console.log(
        `Would send to user ${
          user._id
        } with token ${user.notificationToken?.substring(0, 10)}...`
      );
      return Promise.resolve(true);

      // Example Firebase implementation would be:
      // return admin.messaging().sendToDevice(user.notificationToken, {
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //   },
      //   data: notification.data || {}
      // });
    });

    await Promise.all(notificationPromises);
    return users.length;
  } catch (error) {
    console.error("Error sending notifications:", error);
    return 0;
  }
};

/**
 * Send a notification to a specific user
 * @param userId - The user ID to send the notification to
 * @param notification - The notification payload
 */
export const sendNotificationToUser = async (
  userId: string,
  notification: NotificationPayload
): Promise<boolean> => {
  try {
    const user = await User.findById(userId) as IUser | null;

    if (!user || !user.notificationToken) {
      console.log(`User ${userId} not found or has no notification token`);
      return false;
    }

    // In a real implementation, send the notification using a service
    console.log(
      `Would send notification "${notification.title}" to user ${userId}`
    );

    // Example Firebase implementation:
    // await admin.messaging().sendToDevice(user.notificationToken, {
    //   notification: {
    //     title: notification.title,
    //     body: notification.body,
    //   },
    //   data: notification.data || {}
    // });

    return true;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return false;
  }
};
