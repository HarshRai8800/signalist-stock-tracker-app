"use server"

import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';
import { revalidatePath } from 'next/cache';
import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface AddAlertParams {
  alertName: string;
  symbol: string;
  company: string;
  type: "price" | "percent";
  condition: "gt" | "lt";
  value: number;
  frequency: "5min" | "hourly" | "daily";
}

type AddAlertResponse =
  | { success: true; alertId: string }
  | { success: false; error: string };

export const addAlert = async (
  data: AddAlertParams
): Promise<AddAlertResponse> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) redirect('/sign-in');

    const existingAlert = await Alert.findOne({
      userId: session.user.id,
      symbol: data.symbol.toUpperCase(),
      type: data.type,
      condition: data.condition,
      value: data.value,
    });

    if (existingAlert) {
      return { success: false, error: 'Alert already exists' };
    }

    const newAlert = await Alert.create({
      userId: session.user.id,
      alertName: data.alertName.trim(),
      symbol: data.symbol.toUpperCase(),
      company: data.company.trim(),
      type: data.type,
      condition: data.condition,
      value: data.value,
      frequency: data.frequency,
    });

    console.log(newAlert)

    revalidatePath('/alerts');

    return {
      success: true,
      alertId: String(newAlert._id), // ✅ FIXED
    };
  } catch (error) {
    console.error('Error adding alert:', error);
    return { success: false, error: 'Failed to create alert' }; // ✅ don't throw
  }
};

export const removeAlert = async (alertId: string) => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) redirect('/sign-in');

    await Alert.deleteOne({
      _id: alertId,
      userId: session.user.id,
    });

    revalidatePath('/alerts');

    return { success: true, message: 'Alert removed successfully' };
  } catch (error) {
    console.error('Error removing alert:', error);
    throw new Error('Failed to remove alert');
  }
};

type AlertMapItem = {
  alertId: string;
  symbol: string;
};

export const getUserAlerts = async (): Promise<AlertMapItem[]> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) redirect('/sign-in');

    const alerts = await Alert.find(
      {
        userId: session.user.id,
        isActive: true,
      },
      { _id: 1, symbol: 1 } 
    ).lean();

    return alerts.map((a) => ({
      alertId: String(a._id), 
      symbol: a.symbol,
    }));
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }
};

export const getAlertsMap = async (): Promise<
  Map<string, AlertMapItem[]>
> => {
  const alerts = await getUserAlerts(); 

  const alertMap = new Map<string, AlertMapItem[]>();

  for (const alert of alerts) {
    const key = alert.symbol;

    if (!alertMap.has(key)) {
      alertMap.set(key, []);
    }

    alertMap.get(key)!.push(alert); 
  }

  return alertMap;
};

export const getFiveMinAlerts = async () => {
  try {
    await connectToDatabase();

    const alerts = await Alert.find({
      frequency: '5min',
      isActive: true,
    }).lean();

    return alerts;
  } catch (error) {
    console.error('Error fetching 5min alerts:', error);
    return [];
  }
};

// 🔥 2. Hourly alerts
export const getHourlyAlerts = async () => {
  try {
    await connectToDatabase();

    const alerts = await Alert.find({
      frequency: 'hourly',
      isActive: true,
    }).lean();

    return alerts;
  } catch (error) {
    console.error('Error fetching hourly alerts:', error);
    return [];
  }
};

// 🔥 3. Daily alerts
export const getDailyAlerts = async () => {
  try {
    await connectToDatabase();

    const alerts = await Alert.find({
      frequency: 'daily',
      isActive: true,
    }).lean();

    return alerts;
  } catch (error) {
    console.error('Error fetching daily alerts:', error);
    return [];
  }
};

// lib/utils/alert.utils.ts

export type StockData = {
  price: number;
  percent: number;
};

export const getStockData = async (
  symbol: string
): Promise<StockData | null> => {
  try {
    const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";

    if (!token) throw new Error("Finnhub API key missing");

    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        symbol
      )}&token=${token}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error("Finnhub API error:", res.status);
      return null;
    }

    const data = await res.json();

    if (!data || data.c === undefined || data.pc === undefined) {
      return null;
    }

    const price = data.c;
    const prevClose = data.pc;

    return {
      price,
      percent:
        prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
    };
  } catch (error) {
    console.error("getStockData error:", error);
    return null;
  }
};