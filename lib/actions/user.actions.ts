'use server';

import {connectToDatabase} from "@/database/mongoose";

export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if(!db) throw new Error('Mongoose connection not connected');

        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null }},
            { projection: { _id: 1, id: 1, email: 1, name: 1, country:1 }}
        ).toArray();

        return users.filter((user) => user.email && user.name).map((user) => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name
        }))
    } catch (e) {
        console.error('Error fetching users for news email:', e)
        return []
    }
}

// lib/actions/user.actions.ts


export const getUserById = async (userId: string) => {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) throw new Error("DB not connected");

    // 🔹 Better Auth stores users in "user" collection
    const user = await db.collection("user").findOne({
      _id: new mongoose.Types.ObjectId(userId), // ✅ CORRECT
    });

    if (!user) return null;

    return {
      id: user.id || user._id?.toString(),
      email: user.email,
      name: user.name || "",
    };
  } catch (error) {
    console.error("getUserById error:", error);
    return null;
  }
};