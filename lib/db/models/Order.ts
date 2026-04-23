import mongoose, { Schema, model, models } from "mongoose";

const orderSchema = new Schema(
  {
    customerName: { type: String, trim: true, default: "" },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true, default: "" },
    cartItems: { type: [Schema.Types.Mixed], required: true },
    totalPrice: { type: Number, required: true },
    orderSummary: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { suppressReservedKeysWarning: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ customerPhone: 1, createdAt: -1 });

if (models.Order) {
  mongoose.deleteModel("Order");
}

export const OrderModel = model("Order", orderSchema);
