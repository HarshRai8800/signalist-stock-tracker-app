import { Schema, model, models, type Document, type Model } from "mongoose";

export interface AlertItem extends Document {
  userId: string;
  alertName: string;
  symbol: string;
  company: string;
  type: "price" | "percent";
  condition: "gt" | "lt";
  value: number;
  frequency: "5min" | "hourly" | "daily";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<AlertItem>(
  {
    userId: { type: String, required: true, index: true },

    alertName: { type: String, required: true, trim: true },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    company: { type: String, required: true, trim: true },

      type: {
      type: String,
      enum: ["price", "percent"],
      default: "price",
    },

    condition: {
      type: String,
      enum: ["gt", "lt"],
      required: true,
    },

    value: {
      type: Number,
      required: true,
    },

    frequency: {
      type: String,
      enum: ["5min", "hourly", "daily"],
      default: "daily",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

AlertSchema.index(
  { userId: 1, symbol: 1, type: 1, condition: 1, value: 1 },
  { unique: true }
);

export const Alert: Model<AlertItem> =
  (models?.Alert as Model<AlertItem>) ||
  model<AlertItem>("Alert", AlertSchema);