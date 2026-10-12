import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم العميل مطلوب"],
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search by name
CustomerSchema.index({ name: "text" });

export default mongoose.model("Customer", CustomerSchema);
